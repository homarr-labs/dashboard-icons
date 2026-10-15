import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PocketBaseRefresh } from "@/mcp/auth/pocketbase"

const { refreshPocketBaseSession } = vi.hoisted(() => ({
	refreshPocketBaseSession: vi.fn<(token: string) => Promise<PocketBaseRefresh>>(),
}))

vi.mock("@/mcp/auth/pocketbase", () => ({ refreshPocketBaseSession }))

import {
	type AuthorizeValidation,
	approveAuthorization,
	buildRedirect,
	resolveAuthorizePage,
	validateAuthorizeRequest,
} from "@/mcp/auth/authorize"
import { clientFingerprint, registerClient } from "@/mcp/auth/clients"
import { unseal } from "@/mcp/auth/seal"
import { ISSUER, pkcePair, REDIRECT_URI, RESOURCE, SECRET, SECRET_TEXT, USER } from "./fixtures"

const ctx = { secret: SECRET, issuer: ISSUER }

function clientId(): string {
	const result = registerClient(SECRET, { client_name: "Claude Code", redirect_uris: [REDIRECT_URI] })
	if (!result.ok) throw new Error("registration failed")
	return result.client.client_id
}

function authorizeParams(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		response_type: "code",
		client_id: clientId(),
		redirect_uri: REDIRECT_URI,
		state: "xyz",
		code_challenge: pkcePair().challenge,
		code_challenge_method: "S256",
		resource: RESOURCE,
		scope: "account",
		...overrides,
	}
}

function returnParams(result: AuthorizeValidation): URLSearchParams {
	if (result.kind !== "client_error") throw new Error(`expected client_error, got ${result.kind}`)
	expect(result.returnHost).toBe(new URL(REDIRECT_URI).host)
	return new URL(result.returnTo).searchParams
}

describe("validateAuthorizeRequest", () => {
	it("accepts a well-formed request", () => {
		const params = authorizeParams({ redirect_uri: "http://127.0.0.1:49152/callback" })
		const result = validateAuthorizeRequest(params, ctx)
		if (result.kind !== "valid") throw new Error("expected valid")
		expect(result.request).toMatchObject({
			clientName: "Claude Code",
			redirectUri: "http://127.0.0.1:49152/callback",
			redirectHost: "127.0.0.1:49152",
			state: "xyz",
			scope: "account",
			resource: RESOURCE,
		})
		expect(result.request.params).toEqual(params)
	})

	it("defaults scope and resource when omitted", () => {
		const result = validateAuthorizeRequest(authorizeParams({ scope: undefined, resource: undefined, state: undefined }), ctx)
		if (result.kind !== "valid") throw new Error("expected valid")
		expect(result.request.scope).toBe("account")
		expect(result.request.resource).toBe(RESOURCE)
		expect(result.request.params).not.toHaveProperty("state")
	})

	it("renders an error for repeated or missing client parameters", () => {
		expect(validateAuthorizeRequest(authorizeParams({ state: ["a", "b"] }), ctx)).toMatchObject({
			kind: "invalid",
			error: "invalid_request",
		})
		expect(validateAuthorizeRequest(authorizeParams({ client_id: undefined }), ctx)).toMatchObject({
			kind: "invalid",
			error: "invalid_request",
		})
		expect(validateAuthorizeRequest(authorizeParams({ client_id: "forged" }), ctx)).toMatchObject({
			kind: "invalid",
			error: "invalid_client",
		})
	})

	it("never redirects to an unregistered redirect_uri", () => {
		for (const redirect_uri of [undefined, "https://evil.test/callback", "http://localhost:33418/callback"]) {
			expect(validateAuthorizeRequest(authorizeParams({ redirect_uri }), ctx)).toMatchObject({ kind: "invalid" })
		}
	})

	it("offers a link back to the client for protocol errors, with state and iss", () => {
		const cases: [Record<string, unknown>, string][] = [
			[{ response_type: "token" }, "unsupported_response_type"],
			[{ code_challenge: undefined }, "invalid_request"],
			[{ code_challenge: "too-short" }, "invalid_request"],
			[{ code_challenge_method: "plain" }, "invalid_request"],
			[{ resource: "https://evil.test/api/mcp" }, "invalid_target"],
			[{ scope: "account admin" }, "invalid_scope"],
		]
		for (const [overrides, error] of cases) {
			const result = validateAuthorizeRequest(authorizeParams(overrides), ctx)
			expect(result).toMatchObject({ kind: "client_error", error })
			const params = returnParams(result)
			expect(params.get("error")).toBe(error)
			expect(params.get("error_description")).toBeTruthy()
			expect(params.get("state")).toBe("xyz")
			expect(params.get("iss")).toBe(ISSUER)
		}
	})
})

describe("buildRedirect", () => {
	it("keeps existing query parameters and skips undefined values", () => {
		expect(buildRedirect("https://app.test/cb?x=1", { code: "c", state: undefined })).toBe("https://app.test/cb?x=1&code=c")
	})
})

describe("resolveAuthorizePage", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("is disabled without a secret", () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		expect(resolveAuthorizePage(authorizeParams(), new Headers())).toEqual({ kind: "disabled" })
	})

	it("validates against the request host", () => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		const result = resolveAuthorizePage(authorizeParams(), new Headers({ host: "dashboardicons.com", "x-forwarded-proto": "https" }))
		expect(result.kind).toBe("valid")
	})
})

describe("approveAuthorization", () => {
	beforeEach(() => {
		refreshPocketBaseSession.mockReset()
	})

	it("mints a single-purpose code bound to the client, PKCE, resource and user", async () => {
		refreshPocketBaseSession.mockResolvedValue({ ok: true, token: "fresh-pb", user: USER })
		const params = authorizeParams()
		const result = await approveAuthorization({ params, pbToken: "pb-token" }, ctx)
		if (result.status !== 200) throw new Error("expected success")
		const redirect = new URL(result.body.redirectTo)
		expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URI)
		expect(redirect.searchParams.get("state")).toBe("xyz")
		expect(redirect.searchParams.get("iss")).toBe(ISSUER)
		const code = unseal(SECRET, "code", redirect.searchParams.get("code") ?? "")
		if (!code.ok) throw new Error("expected a valid code")
		expect(code.data).toMatchObject({
			cid: clientFingerprint(String(params.client_id)),
			redirect_uri: REDIRECT_URI,
			code_challenge: params.code_challenge,
			resource: RESOURCE,
			scope: "account",
			user: USER,
			pb_token: "fresh-pb",
		})
		expect(code.expiresAt - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60)
		expect(refreshPocketBaseSession).toHaveBeenCalledWith("pb-token")
		expect(unseal(SECRET, "access", redirect.searchParams.get("code") ?? "").ok).toBe(false)
	})

	it("redirects with access_denied when the user denies", async () => {
		const result = await approveAuthorization({ params: authorizeParams(), deny: true }, ctx)
		if (result.status !== 200) throw new Error("expected redirect")
		const redirect = new URL(result.body.redirectTo).searchParams
		expect(redirect.get("error")).toBe("access_denied")
		expect(redirect.get("code")).toBeNull()
		expect(refreshPocketBaseSession).not.toHaveBeenCalled()
	})

	it("rejects malformed bodies and invalid clients", async () => {
		await expect(approveAuthorization("nope", ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_request" } })
		await expect(approveAuthorization({ params: authorizeParams({ client_id: "forged" }) }, ctx)).resolves.toMatchObject({
			status: 400,
			body: { error: "invalid_client" },
		})
	})

	it("returns protocol error redirects without asking PocketBase", async () => {
		const result = await approveAuthorization({ params: authorizeParams({ response_type: "token" }), pbToken: "pb" }, ctx)
		if (result.status !== 200) throw new Error("expected redirect")
		expect(new URL(result.body.redirectTo).searchParams.get("error")).toBe("unsupported_response_type")
		expect(refreshPocketBaseSession).not.toHaveBeenCalled()
	})

	it("requires a valid PocketBase session", async () => {
		await expect(approveAuthorization({ params: authorizeParams() }, ctx)).resolves.toMatchObject({
			status: 401,
			body: { error: "login_required" },
		})
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: false, reason: "invalid" })
		await expect(approveAuthorization({ params: authorizeParams(), pbToken: "expired" }, ctx)).resolves.toMatchObject({
			status: 401,
			body: { error: "login_required" },
		})
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: false, reason: "unavailable" })
		await expect(approveAuthorization({ params: authorizeParams(), pbToken: "pb" }, ctx)).resolves.toMatchObject({
			status: 503,
			body: { error: "temporarily_unavailable" },
		})
	})
})
