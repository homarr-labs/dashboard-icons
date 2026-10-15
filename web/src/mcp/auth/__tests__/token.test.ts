import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PocketBaseRefresh } from "@/mcp/auth/pocketbase"

const { refreshPocketBaseSession } = vi.hoisted(() => ({
	refreshPocketBaseSession: vi.fn<(token: string) => Promise<PocketBaseRefresh>>(),
}))

vi.mock("@/mcp/auth/pocketbase", () => ({ refreshPocketBaseSession }))

import { approveAuthorization } from "@/mcp/auth/authorize"
import { clientFingerprint, registerClient } from "@/mcp/auth/clients"
import { seal, unseal } from "@/mcp/auth/seal"
import { exchangeToken, type TokenResponse, type TokenResult } from "@/mcp/auth/token"
import { ISSUER, pkcePair, REDIRECT_URI, RESOURCE, SECRET, USER } from "./fixtures"

const ctx = { secret: SECRET, issuer: ISSUER }

function newClient(): string {
	const result = registerClient(SECRET, { client_name: "Cursor", redirect_uris: [REDIRECT_URI] })
	if (!result.ok) throw new Error("registration failed")
	return result.client.client_id
}

async function authorize(clientId = newClient()) {
	const { verifier, challenge } = pkcePair()
	refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: "pb-1", user: USER })
	const params = {
		response_type: "code",
		client_id: clientId,
		redirect_uri: REDIRECT_URI,
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: RESOURCE,
	}
	const result = await approveAuthorization({ params, pbToken: "pb-0" }, ctx)
	if (result.status !== 200) throw new Error("authorization failed")
	const code = new URL(result.body.redirectTo).searchParams.get("code") ?? ""
	return { clientId, code, verifier }
}

function success(result: TokenResult): TokenResponse {
	if (result.status !== 200) throw new Error(`expected success, got ${JSON.stringify(result.body)}`)
	return result.body
}

describe("authorization_code grant", () => {
	beforeEach(() => {
		refreshPocketBaseSession.mockReset()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("exchanges a code for sealed access and refresh tokens", async () => {
		const { clientId, code, verifier } = await authorize()
		const body = success(
			await exchangeToken(
				{
					grant_type: "authorization_code",
					code,
					client_id: clientId,
					code_verifier: verifier,
					redirect_uri: REDIRECT_URI,
					resource: RESOURCE,
				},
				ctx,
			),
		)
		expect(body).toMatchObject({ token_type: "Bearer", expires_in: 3600, scope: "account" })
		const access = unseal(SECRET, "access", body.access_token)
		expect(access.ok && access.data).toEqual({
			sub: USER.id,
			username: USER.username,
			admin: false,
			scope: "account",
			aud: RESOURCE,
			cid: clientFingerprint(clientId),
			pb_token: "pb-1",
		})
		expect(unseal(SECRET, "refresh", body.refresh_token).ok).toBe(true)
		expect(unseal(SECRET, "refresh", body.access_token).ok).toBe(false)
		expect(body.access_token).not.toContain("pb-1")
	})

	it("accepts a request without redirect_uri or resource", async () => {
		const { clientId, code, verifier } = await authorize()
		success(await exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx))
	})

	it("rejects a replayed code", async () => {
		const { clientId, code, verifier } = await authorize()
		const params = { grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }
		success(await exchangeToken(params, ctx))
		await expect(exchangeToken(params, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
	})

	it("burns the code when the first exchange fails", async () => {
		const { clientId, code, verifier } = await authorize()
		await exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: pkcePair().verifier }, ctx)
		await expect(
			exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx),
		).resolves.toMatchObject({
			status: 400,
			body: { error: "invalid_grant" },
		})
	})

	it.each([
		["a PKCE mismatch", (v: Record<string, string>) => ({ ...v, code_verifier: pkcePair().verifier }), "invalid_grant"],
		["another client", (v: Record<string, string>) => ({ ...v, client_id: newClient() }), "invalid_grant"],
		["a redirect_uri mismatch", (v: Record<string, string>) => ({ ...v, redirect_uri: "http://127.0.0.1:1/other" }), "invalid_grant"],
		["a resource mismatch", (v: Record<string, string>) => ({ ...v, resource: "https://evil.test/api/mcp" }), "invalid_target"],
		["a tampered code", (v: Record<string, string>) => ({ ...v, code: `${v.code.slice(0, -2)}AA` }), "invalid_grant"],
	])("rejects %s", async (_label, mutate, error) => {
		const { clientId, code, verifier } = await authorize()
		const params = mutate({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier })
		await expect(exchangeToken(params, ctx)).resolves.toMatchObject({ status: 400, body: { error } })
	})

	it("rejects an expired code", async () => {
		const { clientId, code, verifier } = await authorize()
		const now = Date.now()
		vi.spyOn(Date, "now").mockReturnValue(now + 61_000)
		await expect(
			exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx),
		).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
	})

	it("rejects a code redeemed at another issuer", async () => {
		const { clientId, code, verifier } = await authorize()
		await expect(
			exchangeToken(
				{ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier },
				{ ...ctx, issuer: "https://other.test" },
			),
		).resolves.toMatchObject({ status: 400, body: { error: "invalid_target" } })
	})

	it("rejects codes with an unexpected shape and missing parameters", async () => {
		const forged = seal(SECRET, "code", { jti: "x" }, 60)
		await expect(
			exchangeToken({ grant_type: "authorization_code", code: forged, client_id: "c", code_verifier: "v" }, ctx),
		).resolves.toMatchObject({
			body: { error: "invalid_grant" },
		})
		await expect(exchangeToken({ grant_type: "authorization_code", code: "x" }, ctx)).resolves.toMatchObject({
			body: { error: "invalid_request" },
		})
	})
})

describe("refresh_token grant", () => {
	beforeEach(() => {
		refreshPocketBaseSession.mockReset()
	})

	async function tokens() {
		const { clientId, code, verifier } = await authorize()
		const body = success(await exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx))
		return { clientId, refreshToken: body.refresh_token }
	}

	it("rotates tokens with a refreshed PocketBase session and admin flag", async () => {
		const { clientId, refreshToken } = await tokens()
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: "pb-2", user: { ...USER, admin: true } })
		const body = success(
			await exchangeToken({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, scope: "account" }, ctx),
		)
		expect(refreshPocketBaseSession).toHaveBeenLastCalledWith("pb-1")
		expect(body.refresh_token).not.toBe(refreshToken)
		const access = unseal(SECRET, "access", body.access_token)
		expect(access.ok && access.data).toMatchObject({ admin: true, pb_token: "pb-2", aud: RESOURCE })
		const refreshed = unseal(SECRET, "refresh", body.refresh_token)
		expect(refreshed.ok && refreshed.data).toMatchObject({ pb_token: "pb-2" })
	})

	it("rejects a refresh token that was already used, even concurrently", async () => {
		const { clientId, refreshToken } = await tokens()
		const params = { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }
		refreshPocketBaseSession.mockResolvedValue({ ok: true, token: "pb-2", user: USER })
		const [first, second] = await Promise.all([exchangeToken(params, ctx), exchangeToken(params, ctx)])
		const rotated = success(first).refresh_token
		expect(second).toEqual({ status: 400, body: { error: "invalid_grant", error_description: "The refresh token was already used." } })
		await expect(exchangeToken(params, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
		success(await exchangeToken({ ...params, refresh_token: rotated }, ctx))
	})

	it("keeps the refresh token usable when PocketBase is briefly unavailable", async () => {
		const { clientId, refreshToken } = await tokens()
		const params = { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: false, reason: "unavailable" })
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: "pb-2", user: USER })
		await expect(exchangeToken(params, ctx)).resolves.toMatchObject({ status: 503 })
		success(await exchangeToken(params, ctx))
	})

	it("fails with invalid_grant when PocketBase rejects the session", async () => {
		const { clientId, refreshToken } = await tokens()
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: false, reason: "invalid" })
		await expect(
			exchangeToken({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }, ctx),
		).resolves.toMatchObject({
			status: 400,
			body: { error: "invalid_grant" },
		})
	})

	it("fails with 503 when PocketBase is unreachable", async () => {
		const { clientId, refreshToken } = await tokens()
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: false, reason: "unavailable" })
		await expect(
			exchangeToken({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }, ctx),
		).resolves.toMatchObject({
			status: 503,
			body: { error: "temporarily_unavailable" },
		})
	})

	it("rejects invalid refresh requests before calling PocketBase", async () => {
		const { clientId, refreshToken } = await tokens()
		const cases: [Record<string, string>, string][] = [
			[{ refresh_token: refreshToken }, "invalid_request"],
			[{ refresh_token: refreshToken, client_id: newClient() }, "invalid_grant"],
			[{ refresh_token: seal(SECRET, "access", {}, 60), client_id: clientId }, "invalid_grant"],
			[{ refresh_token: refreshToken, client_id: clientId, scope: "admin" }, "invalid_scope"],
			[{ refresh_token: refreshToken, client_id: clientId, resource: "https://evil.test/api/mcp" }, "invalid_target"],
		]
		for (const [params, error] of cases) {
			await expect(exchangeToken({ grant_type: "refresh_token", ...params }, ctx)).resolves.toMatchObject({ status: 400, body: { error } })
		}
		expect(refreshPocketBaseSession).toHaveBeenCalledTimes(1)
	})

	it("never widens the granted scope", async () => {
		const clientId = newClient()
		const narrow = seal(
			SECRET,
			"refresh",
			{ jti: "j", sub: "u", cid: clientFingerprint(clientId), scope: "other", resource: RESOURCE, pb_token: "pb" },
			60,
		)
		await expect(exchangeToken({ grant_type: "refresh_token", refresh_token: narrow, client_id: clientId }, ctx)).resolves.toMatchObject({
			body: { error: "invalid_scope" },
		})
	})
})

describe("grant types", () => {
	it("requires a supported grant_type", async () => {
		await expect(exchangeToken({}, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_request" } })
		await expect(exchangeToken({ grant_type: "client_credentials" }, ctx)).resolves.toMatchObject({
			status: 400,
			body: { error: "unsupported_grant_type" },
		})
	})
})
