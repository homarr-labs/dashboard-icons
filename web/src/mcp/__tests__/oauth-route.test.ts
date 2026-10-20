import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { seal } from "@/mcp/auth/seal"

const SECRET = Buffer.from("oauth-route-synthetic-secret-for-fixture-only")
const USER = { id: "fixture-user-17", username: "synthetic-user", admin: false }
const ISSUER = "http://localhost:3058"
const RESOURCE = ISSUER + "/api/mcp"
const PB_TOKEN = "synthetic-pocketbase-session-never-valid-outside-fixture"
const MODERN = "2026-07-28"
const LEGACY = "2025-11-25"
type FixtureRequest = { method: string; path: string; filter: string | null; bearer: string | null; body: unknown }
const fixture: { requests: FixtureRequest[]; toolRateCalls: number } = { requests: [], toolRateCalls: 0 }
let pbServer: Server | undefined

vi.mock("next/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("next/server")>()
	return { ...actual, after: vi.fn() }
})
vi.mock("@/mcp/analytics", () => ({
	flushDashboardIconsMcpAnalytics: vi.fn(),
	instrumentDashboardIconsMcpAnalytics: vi.fn(),
}))
vi.mock("@/lib/icons/rate-limit", () => ({
	checkRateLimit: vi.fn((_ip, category: string) => {
		if (category === "tool") fixture.toolRateCalls++
		return { allowed: true }
	}),
	getClientIp: vi.fn(() => "127.0.0.1"),
}))

function signedAccess(aud = RESOURCE, sub = USER.id): string {
	return seal(
		SECRET,
		"access",
		{
			sub,
			username: USER.username,
			admin: false,
			scope: "account",
			aud,
			cid: "synthetic-client-fingerprint",
			pb_token: PB_TOKEN,
		},
		300,
	)
}
function request(
	body: unknown,
	options: { token?: string; version?: string; method: string; modern?: boolean; sessionId?: string; name?: string },
): NextRequest {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		accept: "application/json, text/event-stream",
	}
	if (options.version) headers["mcp-protocol-version"] = options.version
	if (options.modern) headers["mcp-method"] = options.method
	if (options.name) headers["mcp-name"] = options.name
	if (options.sessionId) headers["mcp-session-id"] = options.sessionId
	if (options.token) headers.authorization = "Bearer " + options.token
	return new NextRequest(ISSUER + "/api/mcp", { method: "POST", headers, body: JSON.stringify(body) })
}
function modern(id: number, method: string, params: Record<string, unknown>, token?: string, sessionId?: string): NextRequest {
	return request(
		{
			jsonrpc: "2.0",
			id,
			method,
			params: {
				...params,
				_meta: {
					"io.modelcontextprotocol/protocolVersion": MODERN,
					"io.modelcontextprotocol/clientInfo": { name: "route-fixture", version: "1" },
					"io.modelcontextprotocol/clientCapabilities": {},
				},
			},
		},
		{ token, version: MODERN, method, modern: true, sessionId, name: typeof params.name === "string" ? params.name : undefined },
	)
}
function legacy(body: unknown, token?: string, sessionId?: string): NextRequest {
	return request(body, { token, version: sessionId ? LEGACY : undefined, method: "", sessionId })
}
async function post(message: NextRequest): Promise<Response> {
	const { POST } = await import("@/app/api/mcp/route")
	return POST(message)
}
async function legacyAccountCall(token?: string): Promise<Response> {
	const initialize = await post(
		legacy(
			{
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: { protocolVersion: LEGACY, capabilities: {}, clientInfo: { name: "route-fixture", version: "1" } },
			},
			token,
		),
	)
	if (!initialize.ok) return initialize
	const sessionId = initialize.headers.get("mcp-session-id") ?? undefined
	await post(legacy({ jsonrpc: "2.0", method: "notifications/initialized" }, token, sessionId))
	return post(
		legacy(
			{
				jsonrpc: "2.0",
				id: 2,
				method: "tools/call",
				params: { name: "list_my_submissions", arguments: {} },
			},
			token,
			sessionId,
		),
	)
}
async function closeFixture(): Promise<void> {
	if (!pbServer?.listening) return
	await new Promise<void>((resolve, reject) => pbServer?.close((error) => (error ? reject(error) : resolve())))
	pbServer = undefined
}
async function reply(res: ServerResponse, status: number, body: unknown): Promise<void> {
	res.statusCode = status
	res.setHeader("content-type", "application/json")
	res.end(JSON.stringify(body))
}
async function handlePocketBase(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const chunks: Buffer[] = []
	for await (const chunk of req) chunks.push(Buffer.from(chunk))
	const bodyText = Buffer.concat(chunks).toString("utf8")
	let body: unknown = null
	try {
		if (bodyText) body = JSON.parse(bodyText)
	} catch {
		body = { malformed: true }
	}
	const parsed = new URL(req.url ?? "/", "http://127.0.0.1")
	const target = req.url ?? "/"
	fixture.requests.push({
		method: req.method ?? "",
		path: parsed.pathname,
		filter: parsed.searchParams.get("filter"),
		bearer: typeof req.headers.authorization === "string" ? req.headers.authorization : null,
		body,
	})
	if (req.method === "POST" && parsed.pathname === "/api/collections/users/auth-refresh") {
		return reply(res, 200, { token: "synthetic-pocketbase-refreshed-session", record: USER })
	}
	if (req.method === "GET" && parsed.pathname === "/api/collections/submissions/records") {
		return reply(res, 200, {
			page: 1,
			perPage: 20,
			totalPages: 1,
			totalItems: 1,
			items: [
				{
					id: "submission-fixture-1",
					name: "local-fixture",
					status: "pending",
					admin_comment: "",
					created: "2026-10-16",
					updated: "2026-10-16",
				},
			],
		})
	}
	return reply(res, 404, { status: 404, message: "Unexpected local fixture route: " + target, data: {} })
}

beforeEach(async () => {
	fixture.requests.length = 0
	fixture.toolRateCalls = 0
	pbServer = createServer((req, res) => {
		void handlePocketBase(req, res)
	})
	await new Promise<void>((resolve, reject) => {
		pbServer?.once("error", reject)
		pbServer?.listen(0, "127.0.0.1", () => resolve())
	})
	const address = pbServer.address()
	if (!address || typeof address === "string") throw new Error("Local PB fixture did not bind TCP port")
	const localPbUrl = "http://127.0.0.1:" + address.port
	vi.stubEnv("MCP_OAUTH_SECRET", SECRET.toString())
	vi.stubEnv("MCP_OAUTH_ISSUER", ISSUER)
	vi.stubEnv("PB_URL", localPbUrl)
	vi.stubEnv("NEXT_PUBLIC_POCKETBASE_URL", localPbUrl)
	vi.stubEnv("NEXT_PUBLIC_DISABLE_POSTHOG", "true")
	vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "")
})

afterEach(async () => {
	await closeFixture()
	vi.unstubAllEnvs()
	vi.resetModules()
})

describe("MCP route OAuth challenge with a loopback PocketBase fixture", () => {
	it("challenges a legacy batch of two account calls before dispatch", async () => {
		const batch = [
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
		]
		const response = await post(legacy(batch))
		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain('scope="account"')
		expect(fixture.requests).toHaveLength(0)
	})

	it.each([64 * 1024 + 1, 512 * 1024])("accepts a signed-in account batch of %i encoded bytes", async (size) => {
		const batch = [
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
		]
		const json = JSON.stringify(batch)
		const request = new NextRequest(RESOURCE, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				authorization: "Bearer " + signedAccess(),
			},
			body: json.padEnd(size),
		})
		const response = await post(request)
		expect(response.status).toBe(200)
		expect(await response.json()).toHaveLength(2)
		expect(fixture.toolRateCalls).toBe(2)
		expect(fixture.requests.filter((entry) => entry.path === "/api/collections/submissions/records")).toHaveLength(2)
	})

	it("rejects a signed-in account batch over 512 KiB before PocketBase", async () => {
		const batch = [{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } }]
		const response = await post(
			new NextRequest(RESOURCE, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					authorization: "Bearer " + signedAccess(),
				},
				body: JSON.stringify(batch).padEnd(512 * 1024 + 1),
			}),
		)
		expect(response.status).toBe(413)
		expect(fixture.requests).toHaveLength(0)
	})

	it("rejects an anonymous modern account call before PocketBase", async () => {
		const response = await post(modern(1, "tools/call", { name: "list_my_submissions", arguments: {} }))
		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain('scope="account"')
		expect(fixture.requests).toHaveLength(0)
	})

	it("routes a correctly audience-bound modern access token to its PocketBase owner", async () => {
		const response = await post(modern(1, "tools/call", { name: "list_my_submissions", arguments: {} }, signedAccess()))
		expect(response.status).toBe(200)
		const body = (await response.json()) as { result: { isError?: boolean; structuredContent?: Record<string, unknown> } }
		expect(body.result.isError).toBeFalsy()
		expect(body.result.structuredContent).toMatchObject({
			total: 1,
			submissions: [{ id: "submission-fixture-1", name: "local-fixture" }],
		})
		expect(fixture.requests.map((entry) => [entry.method, entry.path])).toEqual([
			["POST", "/api/collections/users/auth-refresh"],
			["GET", "/api/collections/submissions/records"],
		])
		expect(fixture.requests[0]?.bearer).toBe(PB_TOKEN)
		expect(fixture.requests[1]?.bearer).toBe("synthetic-pocketbase-refreshed-session")
		expect(fixture.requests[1]?.filter).toContain(USER.id)
		expect(fixture.requests.some((entry) => entry.method === "POST" && entry.path.includes("/submissions/records"))).toBe(false)
	})

	it("rejects an access token for another resource before the PocketBase fixture", async () => {
		const response = await post(
			modern(1, "tools/call", { name: "list_my_submissions", arguments: {} }, signedAccess("http://other.local/api/mcp")),
		)
		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"')
		expect(fixture.requests).toHaveLength(0)
	})

	it("rejects an anonymous legacy account call before PocketBase", async () => {
		const response = await legacyAccountCall()
		expect(response.status).toBe(401)
		expect(fixture.requests).toHaveLength(0)
	})

	it("routes a correctly audience-bound legacy access token to its PocketBase owner", async () => {
		const response = await legacyAccountCall(signedAccess())
		expect(response.status).toBe(200)
		const body = (await response.json()) as { result: { isError?: boolean; structuredContent?: Record<string, unknown> } }
		expect(body.result.isError).toBeFalsy()
		expect(body.result.structuredContent).toMatchObject({
			total: 1,
			submissions: [{ id: "submission-fixture-1", name: "local-fixture" }],
		})
		expect(fixture.requests.map((entry) => [entry.method, entry.path])).toEqual([
			["POST", "/api/collections/users/auth-refresh"],
			["GET", "/api/collections/submissions/records"],
		])
		expect(fixture.requests[0]?.bearer).toBe(PB_TOKEN)
		expect(fixture.requests[1]?.bearer).toBe("synthetic-pocketbase-refreshed-session")
		expect(fixture.requests[1]?.filter).toContain(USER.id)
		expect(fixture.requests.some((entry) => entry.method === "POST" && entry.path.includes("/submissions/records"))).toBe(false)
	})

	it("rejects a wrong-resource token on legacy before PocketBase", async () => {
		const response = await legacyAccountCall(signedAccess("http://other.local/api/mcp"))
		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"')
		expect(fixture.requests).toHaveLength(0)
	})

	it("challenges a mixed legacy batch containing an account call before dispatch", async () => {
		const batch = [
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		]
		const response = await post(legacy(batch))
		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain('scope="account"')
		expect(fixture.requests).toHaveLength(0)
		expect(fixture.toolRateCalls).toBe(1)
	})
	it("keeps anonymous legacy public-tool batches callable", async () => {
		const batch = [
			{ jsonrpc: "2.0", id: 1, method: "tools/list" },
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		]
		const response = await post(legacy(batch))
		expect(response.status).toBe(200)
		const body = (await response.json()) as { result?: { tools?: { name: string }[] } }[]
		expect(body).toHaveLength(2)
		for (const item of body) expect(item.result?.tools?.some((tool) => tool.name === "match_icons")).toBe(true)
		expect(fixture.requests).toHaveLength(0)
		expect(fixture.toolRateCalls).toBe(0)
	})

	it("authenticates every account call in a valid legacy JSON-RPC batch", async () => {
		const batch = [
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
		]
		const response = await post(legacy(batch, signedAccess()))
		expect(response.status).toBe(200)
		const value = (await response.json()) as unknown
		const replies = Array.isArray(value) ? (value as { result?: { isError?: boolean } }[]) : [value as { result?: { isError?: boolean } }]
		expect(replies).toHaveLength(2)
		for (const item of replies) expect(item.result?.isError).toBeFalsy()
		expect(fixture.requests.filter((entry) => entry.path === "/api/collections/users/auth-refresh")).toHaveLength(2)
		expect(fixture.requests.filter((entry) => entry.path === "/api/collections/submissions/records")).toHaveLength(2)
		expect(fixture.toolRateCalls).toBe(2)
	})
	it("rejects malformed or nested JSON-RPC payloads without contacting PocketBase", async () => {
		const malformed = new NextRequest(ISSUER + "/api/mcp", {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
			body: "{",
		})
		const malformedResponse = await post(malformed)
		expect(malformedResponse.status).toBeGreaterThanOrEqual(400)
		expect(malformedResponse.status).toBeLessThan(500)

		const nested = await post(
			legacy([[{ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } }]]),
		)
		expect(nested.status).not.toBe(200)
		expect(fixture.requests).toHaveLength(0)
	})
})
