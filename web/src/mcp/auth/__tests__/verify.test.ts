import { OAuthError } from "@modelcontextprotocol/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isMcpAuthEnabled, mcpAuthChallenge, verifyMcpBearer } from "@/mcp/auth"
import { seal } from "@/mcp/auth/seal"
import { OTHER_SECRET, RESOURCE, SECRET, SECRET_TEXT, tamper } from "./fixtures"

const MCP_URL = "https://dashboardicons.com/api/mcp"
const PRM_URL = "https://dashboardicons.com/.well-known/oauth-protected-resource/api/mcp"

const claims = {
	sub: "user123",
	username: "tester",
	admin: true,
	scope: "account",
	aud: RESOURCE,
	cid: "client-fingerprint",
	pb_token: "pb-token",
}

function request(authorization?: string, url = MCP_URL): Request {
	const headers = new Headers()
	if (authorization !== undefined) headers.set("authorization", authorization)
	return new Request(url, { method: "POST", headers })
}

async function rejection(promise: Promise<unknown>): Promise<OAuthError> {
	const error = await promise.then(
		() => undefined,
		(reason: unknown) => reason,
	)
	if (!(error instanceof OAuthError)) throw new Error("expected an OAuthError")
	return error
}

describe("verifyMcpBearer", () => {
	beforeEach(() => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it("treats requests without Authorization as anonymous", async () => {
		await expect(verifyMcpBearer(request())).resolves.toBeUndefined()
	})

	it("treats every request as anonymous when auth is disabled", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		expect(isMcpAuthEnabled()).toBe(false)
		await expect(verifyMcpBearer(request("Bearer whatever"))).resolves.toBeUndefined()
	})

	it("returns AuthInfo for a valid token", async () => {
		const token = seal(SECRET, "access", claims, 3600)
		const auth = await verifyMcpBearer(request(`bearer ${token}`))
		expect(auth).toEqual({
			token,
			clientId: "client-fingerprint",
			scopes: ["account"],
			expiresAt: Math.floor(Date.now() / 1000) + 3600,
			resource: new URL(RESOURCE),
			resourceMetadataUrl: PRM_URL,
			extra: { userId: "user123", username: "tester", admin: true, pbToken: "pb-token" },
		})
	})

	it.each([
		["a malformed header", "Basic abc"],
		["an empty bearer", "Bearer "],
		["a tampered token", `Bearer ${tamper(seal(SECRET, "access", claims, 3600))}`],
		["a refresh token", `Bearer ${seal(SECRET, "refresh", claims, 3600)}`],
		["a token from another secret", `Bearer ${seal(OTHER_SECRET, "access", claims, 3600)}`],
		["a token with unexpected claims", `Bearer ${seal(SECRET, "access", { sub: "x" }, 3600)}`],
		["a token for another resource", `Bearer ${seal(SECRET, "access", { ...claims, aud: "https://evil.test/api/mcp" }, 3600)}`],
	])("throws invalid_token for %s", async (_label, header) => {
		const error = await rejection(verifyMcpBearer(request(header)))
		expect(error.code).toBe("invalid_token")
	})

	it("throws invalid_token for an expired token", async () => {
		const token = seal(SECRET, "access", claims, 3600)
		const now = Date.now()
		vi.spyOn(Date, "now").mockReturnValue(now + 3_601_000)
		const error = await rejection(verifyMcpBearer(request(`Bearer ${token}`)))
		expect(error.message).toMatch(/expired/)
	})

	it("checks the audience against the request host", async () => {
		const token = seal(SECRET, "access", claims, 3600)
		const error = await rejection(verifyMcpBearer(request(`Bearer ${token}`, "https://mirror.test/api/mcp")))
		expect(error.message).toMatch(/different resource/)
	})
})

describe("mcpAuthChallenge", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("returns null when auth is disabled", () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		expect(mcpAuthChallenge(request())).toBeNull()
	})

	it("challenges anonymous callers without an error code", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		const response = mcpAuthChallenge(request())
		expect(response?.status).toBe(401)
		expect(response?.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${PRM_URL}", scope="account"`)
		await expect(response?.json()).resolves.toMatchObject({ error: "unauthorized" })
		const custom = mcpAuthChallenge(request(), { description: "Sign in to submit icons." })
		await expect(custom?.json()).resolves.toMatchObject({ error_description: "Sign in to submit icons." })
	})

	it("reports invalid tokens with error=invalid_token", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		const response = mcpAuthChallenge(request(), { error: "invalid_token", description: "The access token expired." })
		expect(response?.status).toBe(401)
		const header = response?.headers.get("www-authenticate") ?? ""
		expect(header).toContain('error="invalid_token"')
		expect(header).toContain('error_description="The access token expired."')
		expect(header).toContain(`resource_metadata="${PRM_URL}"`)
		expect(header).toContain('scope="account"')
		const fallback = mcpAuthChallenge(request(), { error: "invalid_token" })
		await expect(fallback?.json()).resolves.toMatchObject({ error: "invalid_token", error_description: "The access token is invalid." })
	})
})
