import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetRateLimitsForTests } from "@/lib/icons/rate-limit"
import type { PocketBaseRefresh } from "@/mcp/auth/pocketbase"

const { refreshPocketBaseSession } = vi.hoisted(() => ({
	refreshPocketBaseSession: vi.fn<(token: string) => Promise<PocketBaseRefresh>>(),
}))

vi.mock("@/mcp/auth/pocketbase", () => ({ refreshPocketBaseSession }))

const { isReplayStoreReady, consumeGrant } = vi.hoisted(() => ({
	isReplayStoreReady: vi.fn<() => Promise<boolean>>(),
	consumeGrant: vi.fn<() => Promise<string>>(),
}))
vi.mock("@/mcp/auth/durable-replay", () => ({ isReplayStoreReady, consumeGrant }))

import { verifyMcpBearer } from "@/mcp/auth"
import {
	handleAuthorizationDecision,
	handleAuthorizationServerMetadata,
	handleClientRegistration,
	handleOAuthPreflight,
	handleProtectedResourceMetadata,
	handleTokenRequest,
} from "@/mcp/auth/http"
import { pkcePair, pocketBaseToken, REDIRECT_URI, SECRET_TEXT, USER } from "./fixtures"

const ORIGIN = "https://dashboardicons.com"
let ipCounter = 0

function headers(extra: Record<string, string> = {}): Headers {
	ipCounter += 1
	return new Headers({ "x-forwarded-for": `10.0.0.${ipCounter}`, ...extra })
}

function post(path: string, body: BodyInit | null, extra: Record<string, string> = {}): Request {
	return new Request(`${ORIGIN}${path}`, { method: "POST", headers: headers(extra), body })
}

function json(path: string, value: unknown): Request {
	return post(path, JSON.stringify(value), { "content-type": "application/json" })
}

function form(values: Record<string, string>): Request {
	return post("/api/oauth/token", new URLSearchParams(values).toString(), { "content-type": "application/x-www-form-urlencoded" })
}

describe("OAuth HTTP endpoints", () => {
	beforeEach(() => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		vi.stubEnv("MCP_RATE_LIMIT_ENABLED", "true")
		resetRateLimitsForTests()
		refreshPocketBaseSession.mockReset()
		isReplayStoreReady.mockReset().mockResolvedValue(true)
		consumeGrant.mockReset().mockResolvedValue("consumed")
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("returns 404 everywhere when auth is disabled", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		const get = new Request(`${ORIGIN}/.well-known/oauth-authorization-server`)
		expect((await handleAuthorizationServerMetadata(get)).status).toBe(404)
		expect((await handleProtectedResourceMetadata(get)).status).toBe(404)
		expect((await handleClientRegistration(json("/api/oauth/register", {}))).status).toBe(404)
		expect((await handleTokenRequest(form({}))).status).toBe(404)
		expect((await handleAuthorizationDecision(json("/api/oauth/authorize", {}))).status).toBe(404)
		expect(handleOAuthPreflight().status).toBe(404)
	})

	it("serves CORS-enabled metadata for the request origin", async () => {
		const prm = await handleProtectedResourceMetadata(new Request(`${ORIGIN}/.well-known/oauth-protected-resource/api/mcp`))
		expect(prm.headers.get("access-control-allow-origin")).toBe("*")
		await expect(prm.json()).resolves.toMatchObject({ resource: `${ORIGIN}/api/mcp`, authorization_servers: [ORIGIN] })
		const as = await handleAuthorizationServerMetadata(new Request(`${ORIGIN}/.well-known/oauth-authorization-server`))
		await expect(as.json()).resolves.toMatchObject({ issuer: ORIGIN, token_endpoint: `${ORIGIN}/api/oauth/token` })
		const preflight = handleOAuthPreflight()
		expect(preflight.status).toBe(204)
		expect(preflight.headers.get("access-control-allow-methods")).toContain("POST")
	})

	it("does not advertise OAuth metadata or register clients without durable storage", async () => {
		isReplayStoreReady.mockResolvedValue(false)
		expect((await handleAuthorizationServerMetadata(new Request(`${ORIGIN}/.well-known/oauth-authorization-server`))).status).toBe(503)
		expect((await handleClientRegistration(json("/api/oauth/register", {}))).status).toBe(503)
		expect((await handleTokenRequest(form({}))).status).toBe(503)
	})

	it("runs the full authorization code flow", async () => {
		const registration = await handleClientRegistration(
			json("/api/oauth/register", { client_name: "Claude Code", redirect_uris: [REDIRECT_URI] }),
		)
		expect(registration.status).toBe(201)
		expect(registration.headers.get("cache-control")).toBe("no-store")
		const client = (await registration.json()) as { client_id: string }

		const { verifier, challenge } = pkcePair()
		const pbToken = pocketBaseToken()
		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: pbToken, user: USER })
		const params = {
			response_type: "code",
			client_id: client.client_id,
			redirect_uri: REDIRECT_URI,
			code_challenge: challenge,
			code_challenge_method: "S256",
			state: "s1",
			resource: `${ORIGIN}/api/mcp`,
		}
		const decision = await handleAuthorizationDecision(json("/api/oauth/authorize", { params, pbToken: "pb-0" }))
		expect(decision.status).toBe(200)
		const { redirectTo } = (await decision.json()) as { redirectTo: string }
		const code = new URL(redirectTo).searchParams.get("code") ?? ""

		const tokenResponse = await handleTokenRequest(
			form({ grant_type: "authorization_code", code, client_id: client.client_id, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
		)
		expect(tokenResponse.status).toBe(200)
		expect(tokenResponse.headers.get("cache-control")).toBe("no-store")
		expect(tokenResponse.headers.get("access-control-allow-origin")).toBe("*")
		const tokens = (await tokenResponse.json()) as { access_token: string; refresh_token: string }

		const auth = await verifyMcpBearer(new Request(`${ORIGIN}/api/mcp`, { headers: { authorization: `Bearer ${tokens.access_token}` } }))
		expect(auth?.extra).toEqual({ userId: USER.id, username: USER.username, admin: false, pbToken })

		refreshPocketBaseSession.mockResolvedValueOnce({ ok: true, token: pocketBaseToken(), user: USER })
		const refreshed = await handleTokenRequest(
			form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: client.client_id }),
		)
		expect(refreshed.status).toBe(200)
	})

	it("rejects bad registration bodies", async () => {
		expect((await handleClientRegistration(post("/api/oauth/register", "{nope"))).status).toBe(400)
		const unsafe = await handleClientRegistration(json("/api/oauth/register", { redirect_uris: ["javascript:alert(1)"] }))
		expect(unsafe.status).toBe(400)
		await expect(unsafe.json()).resolves.toMatchObject({ error: "invalid_redirect_uri" })
	})

	it("bounds request bodies", async () => {
		const declared = post("/api/oauth/register", "{}", { "content-type": "application/json", "content-length": String(17 * 1024) })
		expect((await handleClientRegistration(declared)).status).toBe(400)
		const streamed = post("/api/oauth/register", JSON.stringify({ client_name: "x".repeat(20 * 1024), redirect_uris: [REDIRECT_URI] }))
		streamed.headers.delete("content-length")
		expect((await handleClientRegistration(streamed)).status).toBe(400)
		expect((await handleClientRegistration(post("/api/oauth/register", null))).status).toBe(400)
	})

	it("requires a form-encoded token request without duplicate parameters", async () => {
		const asJson = await handleTokenRequest(post("/api/oauth/token", "{}", { "content-type": "application/json" }))
		expect(asJson.status).toBe(400)
		expect((await handleTokenRequest(post("/api/oauth/token", "grant_type=x"))).status).toBe(400)
		const duplicate = await handleTokenRequest(
			post("/api/oauth/token", "grant_type=refresh_token&grant_type=authorization_code", {
				"content-type": "application/x-www-form-urlencoded",
			}),
		)
		await expect(duplicate.json()).resolves.toMatchObject({ error: "invalid_request" })
		const tooLarge = post("/api/oauth/token", `code=${"x".repeat(17 * 1024)}`, { "content-type": "application/x-www-form-urlencoded" })
		expect((await handleTokenRequest(tooLarge)).status).toBe(400)
		const empty = await handleTokenRequest(
			post("/api/oauth/token", null, { "content-type": "application/x-www-form-urlencoded; charset=utf-8" }),
		)
		await expect(empty.json()).resolves.toMatchObject({ error: "invalid_request", error_description: "grant_type is required." })
	})

	it("rejects malformed authorization decisions", async () => {
		expect((await handleAuthorizationDecision(post("/api/oauth/authorize", "nope"))).status).toBe(400)
		expect((await handleAuthorizationDecision(json("/api/oauth/authorize", { params: {} }))).status).toBe(400)
	})

	it("rate limits per client IP", async () => {
		const fixed = { "x-forwarded-for": "192.0.2.1", "content-type": "application/x-www-form-urlencoded" }
		let last = new Response()
		for (let i = 0; i < 61; i++) {
			last = await handleTokenRequest(new Request(`${ORIGIN}/api/oauth/token`, { method: "POST", headers: fixed, body: "grant_type=x" }))
		}
		expect(last.status).toBe(429)
		expect(last.headers.get("retry-after")).toMatch(/^\d+$/)
	})
})

describe("route modules", () => {
	it("export the expected handlers", async () => {
		const routes = await Promise.all([
			import("@/app/.well-known/oauth-protected-resource/route"),
			import("@/app/.well-known/oauth-protected-resource/api/mcp/route"),
			import("@/app/.well-known/oauth-authorization-server/route"),
		])
		for (const route of routes) {
			expect(route.GET).toBeTypeOf("function")
			expect(route.OPTIONS).toBe(handleOAuthPreflight)
		}
		const register = await import("@/app/api/oauth/register/route")
		const token = await import("@/app/api/oauth/token/route")
		const authorize = await import("@/app/api/oauth/authorize/route")
		expect(register.POST).toBe(handleClientRegistration)
		expect(token.POST).toBe(handleTokenRequest)
		expect(authorize.POST).toBe(handleAuthorizationDecision)
	})
})
