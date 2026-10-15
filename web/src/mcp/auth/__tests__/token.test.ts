import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PocketBaseRefresh } from "@/mcp/auth/pocketbase"

const { refreshPocketBaseSession } = vi.hoisted(() => ({
	refreshPocketBaseSession: vi.fn<(token: string) => Promise<PocketBaseRefresh>>(),
}))

vi.mock("@/mcp/auth/pocketbase", () => ({ refreshPocketBaseSession }))

import { approveAuthorization } from "@/mcp/auth/authorize"
import { clientFingerprint, registerClient } from "@/mcp/auth/clients"
import { createReplayGuard } from "@/mcp/auth/replay"
import { seal, unseal } from "@/mcp/auth/seal"
import { exchangeToken, type TokenResponse, type TokenResult } from "@/mcp/auth/token"
import { ISSUER, pkcePair, pocketBaseToken, REDIRECT_URI, RESOURCE, SECRET, USER } from "./fixtures"

const ctx = { secret: SECRET, issuer: ISSUER }
const PB_TOKEN = pocketBaseToken()
const REFRESHED_PB_TOKEN = pocketBaseToken(Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60)

function newClient(): string {
	const result = registerClient(SECRET, { client_name: "Cursor", redirect_uris: [REDIRECT_URI] })
	if (!result.ok) throw new Error("registration failed")
	return result.client.client_id
}

async function authorize(clientId = newClient(), pbToken = PB_TOKEN) {
	const { verifier, challenge } = pkcePair()
	refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: pbToken, user: USER })
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
			pb_token: PB_TOKEN,
		})
		expect(unseal(SECRET, "refresh", body.refresh_token).ok).toBe(true)
		expect(unseal(SECRET, "refresh", body.access_token).ok).toBe(false)
		expect(body.access_token).not.toContain(PB_TOKEN)
	})

	it("accepts a request without redirect_uri or resource", async () => {
		const { clientId, code, verifier } = await authorize()
		success(await exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx))
	})

	it.each([60, 2 * 60 * 60, 40 * 24 * 60 * 60])("bounds issued token lifetimes to PocketBase expiry (%i seconds)", async (ttl) => {
		const now = Math.floor(Date.now() / 1000)
		vi.spyOn(Date, "now").mockReturnValue(now * 1000)
		const { clientId, code, verifier } = await authorize(newClient(), pocketBaseToken(now + ttl))
		const body = success(await exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx))
		const access = unseal(SECRET, "access", body.access_token)
		const refresh = unseal(SECRET, "refresh", body.refresh_token)
		expect(access.ok && access.expiresAt).toBe(now + Math.min(ttl, 3600))
		expect(refresh.ok && refresh.expiresAt).toBe(now + Math.min(ttl, 30 * 24 * 60 * 60))
		expect(body.expires_in).toBe(Math.min(ttl, 3600))
	})

	it.each([
		"malformed",
		"header.%%%.signature",
		`header.${Buffer.from(JSON.stringify({ exp: "tomorrow" })).toString("base64url")}.signature`,
		pocketBaseToken(1),
	])("rejects unusable PocketBase expiry %#", async (pbToken) => {
		const { clientId, code, verifier } = await authorize(newClient(), pbToken)
		await expect(
			exchangeToken({ grant_type: "authorization_code", code, client_id: clientId, code_verifier: verifier }, ctx),
		).resolves.toMatchObject({
			status: 400,
			body: { error: "invalid_grant" },
		})
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
	afterEach(() => {
		vi.restoreAllMocks()
		vi.doUnmock("@/mcp/auth/replay")
	})

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
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: REFRESHED_PB_TOKEN, user: { ...USER, admin: true } })
		const body = success(
			await exchangeToken({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, scope: "account" }, ctx),
		)
		expect(refreshPocketBaseSession).toHaveBeenLastCalledWith(PB_TOKEN)
		expect(body.refresh_token).not.toBe(refreshToken)
		const access = unseal(SECRET, "access", body.access_token)
		expect(access.ok && access.data).toMatchObject({ admin: true, pb_token: REFRESHED_PB_TOKEN, aud: RESOURCE })
		const refreshed = unseal(SECRET, "refresh", body.refresh_token)
		expect(refreshed.ok && refreshed.data).toMatchObject({ pb_token: REFRESHED_PB_TOKEN })
	})

	it("rejects a refresh token that was already used, even concurrently", async () => {
		const { clientId, refreshToken } = await tokens()
		const params = { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }
		refreshPocketBaseSession.mockResolvedValue({ ok: true, token: REFRESHED_PB_TOKEN, user: USER })
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
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: REFRESHED_PB_TOKEN, user: USER })
		await expect(exchangeToken(params, ctx)).resolves.toMatchObject({ status: 503 })
		success(await exchangeToken(params, ctx))
	})

	it("rejects concurrent refreshes that expire while PocketBase is responding", async () => {
		const { clientId, refreshToken } = await tokens()
		const refresh = unseal(SECRET, "refresh", refreshToken)
		if (!refresh.ok) throw new Error("expected valid refresh token")
		const clock = vi.spyOn(Date, "now")
		refreshPocketBaseSession.mockImplementation(async () => {
			await Promise.resolve()
			clock.mockReturnValue(refresh.expiresAt * 1000)
			return { ok: true, token: REFRESHED_PB_TOKEN, user: USER }
		})
		const params = { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }
		const results = await Promise.all([exchangeToken(params, ctx), exchangeToken(params, ctx)])
		for (const result of results) expect(result).toMatchObject({ status: 400, body: { error: "invalid_grant" } })
	})

	it("fails closed at replay capacity and reclaims only expired grants", async () => {
		vi.resetModules()
		vi.doMock("@/mcp/auth/replay", () => ({ createReplayGuard: () => createReplayGuard(2) }))
		const { exchangeToken: exchangeWithSmallGuard } = await import("@/mcp/auth/token")
		const now = Math.floor(Date.now() / 1000)
		const clock = vi.spyOn(Date, "now").mockReturnValue(now * 1000)
		const clientId = newClient()
		const request = (jti: string, ttl: number) => ({
			grant_type: "refresh_token",
			client_id: clientId,
			refresh_token: seal(
				SECRET,
				"refresh",
				{
					jti,
					sub: USER.id,
					cid: clientFingerprint(clientId),
					scope: "account",
					resource: RESOURCE,
					pb_token: PB_TOKEN,
				},
				ttl,
			),
		})
		const long = request("capacity-long", 3600)
		const short = request("capacity-short", 60)
		const third = request("capacity-third", 3600)
		refreshPocketBaseSession.mockResolvedValue({ ok: true, token: REFRESHED_PB_TOKEN, user: USER })
		success(await exchangeWithSmallGuard(long, ctx))
		success(await exchangeWithSmallGuard(short, ctx))
		await expect(exchangeWithSmallGuard(third, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
		await expect(exchangeWithSmallGuard(long, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
		clock.mockReturnValue((now + 60) * 1000)
		success(await exchangeWithSmallGuard(third, ctx))
		await expect(exchangeWithSmallGuard(long, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
		await expect(exchangeWithSmallGuard(short, ctx)).resolves.toMatchObject({ status: 400, body: { error: "invalid_grant" } })
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
