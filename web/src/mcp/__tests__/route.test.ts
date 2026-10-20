import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as rateLimit from "@/lib/icons/rate-limit"
import { resetRateLimitsForTests } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"
import { SECRET, SECRET_TEXT, tamper } from "@/mcp/auth/__tests__/fixtures"
import { seal } from "@/mcp/auth/seal"
import { MAX_ACCOUNT_REQUEST_BODY_BYTES } from "@/mcp/limits"

const { afterTasks, flushDashboardIconsMcpAnalytics, handleMcpRequest } = vi.hoisted(() => ({
	afterTasks: [] as (() => unknown)[],
	flushDashboardIconsMcpAnalytics: vi.fn(async () => {}),
	handleMcpRequest: vi.fn(async (_req: Request, _authInfo?: unknown) => new Response("ok", { status: 200 })),
}))

vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (task: () => unknown) => afterTasks.push(task),
}))

vi.mock("@/mcp/analytics", () => ({
	flushDashboardIconsMcpAnalytics,
}))

vi.mock("@/mcp/http", () => ({
	handleMcpRequest,
}))

vi.mock("@/mcp/auth", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/mcp/auth")>()
	return { ...actual, verifyMcpBearer: vi.fn(actual.verifyMcpBearer) }
})

function nextRequest(method: string, init: RequestInit = {}) {
	return new Request("http://localhost/api/mcp", { method, ...init }) as never
}

function toolCall(name: unknown, authorization?: string) {
	const headers: Record<string, string> = { "content-type": "application/json" }
	if (authorization) headers.authorization = authorization
	return nextRequest("POST", {
		headers,
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: {} } }),
	})
}

function accessToken(aud = "http://localhost/api/mcp") {
	const claims = { sub: "user123", username: "tester", admin: false, scope: "account", aud, cid: "client", pb_token: "pb-token" }
	return seal(SECRET, "access", claims, 3600)
}

describe("MCP route sign-in gate", () => {
	beforeEach(() => {
		resetRateLimitsForTests()
		process.env.MCP_RATE_LIMIT_ENABLED = "true"
		handleMcpRequest.mockClear()
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		vi.stubEnv("MCP_OAUTH_ISSUER", "")
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it.each([
		"submit_icon",
		"propose_icon_update",
		"list_my_submissions",
	])("challenges anonymous %s calls so clients offer sign-in", async (name) => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(toolCall(name))
		expect(response.status).toBe(401)
		expect(response.headers.get("WWW-Authenticate")).toBe(
			'Bearer resource_metadata="http://localhost/.well-known/oauth-protected-resource/api/mcp", scope="account"',
		)
		expect(response.headers.get("Access-Control-Expose-Headers")).toBe("WWW-Authenticate")
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("lets anonymous callers use public tools and other methods", async () => {
		const { GET, POST } = await import("@/app/api/mcp/route")
		expect((await POST(toolCall("search_icons"))).status).toBe(200)
		expect((await POST(toolCall({ name: "submit_icon" }))).status).toBe(200)
		expect((await GET(nextRequest("GET"))).status).toBe(200)
		expect(handleMcpRequest.mock.calls.map((call) => call[1])).toEqual([undefined, undefined, undefined])
	})

	it("rejects bad tokens on every request", async () => {
		const { GET, POST } = await import("@/app/api/mcp/route")
		const tampered = await POST(toolCall("search_icons", `Bearer ${tamper(accessToken())}`))
		expect(tampered.status).toBe(401)
		expect(tampered.headers.get("WWW-Authenticate")).toContain('error="invalid_token"')
		expect(tampered.headers.get("Access-Control-Expose-Headers")).toBe("WWW-Authenticate")

		const foreign = await GET(nextRequest("GET", { headers: { authorization: `Bearer ${accessToken("https://other.example/api/mcp")}` } }))
		expect(foreign.status).toBe(401)
		expect(foreign.headers.get("WWW-Authenticate")).toContain("different resource")
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it.each(["submit_icon", "propose_icon_update"])("hands verified auth info to the %s handler", async (name) => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(toolCall(name, `Bearer ${accessToken()}`))
		expect(response.status).toBe(200)
		expect(handleMcpRequest.mock.calls[0]?.[1]).toMatchObject({
			clientId: "client",
			scopes: ["account"],
			extra: { userId: "user123", username: "tester", admin: false, pbToken: "pb-token" },
		})
	})

	it("grants propose_icon_update the existing verified 512 KiB account cap", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify({
			method: "tools/call",
			params: { name: "propose_icon_update", arguments: { name: "my-app", aliases: [] } },
		})
		for (const size of [MAX_ACCOUNT_REQUEST_BODY_BYTES, MAX_ACCOUNT_REQUEST_BODY_BYTES + 1]) {
			handleMcpRequest.mockClear()
			const response = await POST(
				nextRequest("POST", {
					headers: { authorization: `Bearer ${accessToken()}` },
					body: json.padEnd(size),
				}),
			)
			if (size === MAX_ACCOUNT_REQUEST_BODY_BYTES) {
				expect(response.status).toBe(200)
				expect(handleMcpRequest).toHaveBeenCalledOnce()
			} else {
				expect(response.status).toBe(413)
				expect(handleMcpRequest).not.toHaveBeenCalled()
			}
		}
	})

	it.each([
		MAX_REQUEST_BODY_BYTES,
		MAX_REQUEST_BODY_BYTES + 1,
		MAX_ACCOUNT_REQUEST_BODY_BYTES,
	])("accepts verified account calls of exactly %i encoded bytes", async (size) => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify({ method: "tools/call", params: { name: "submit_icon", arguments: { description: 'é\\"' } } })
		const body = json + " ".repeat(size - Buffer.byteLength(json))
		const response = await POST(nextRequest("POST", { headers: { authorization: `Bearer ${accessToken()}` }, body }))
		expect(response.status).toBe(200)
		const forwarded = handleMcpRequest.mock.calls[0]?.[0]
		expect(Buffer.byteLength((await forwarded?.text()) ?? "")).toBe(size)
	})

	it.each([
		undefined,
		"2",
		String(MAX_ACCOUNT_REQUEST_BODY_BYTES + 1),
	])("rejects verified account calls over 512 KiB with content-length %s", async (length) => {
		const { POST } = await import("@/app/api/mcp/route")
		const headers: Record<string, string> = { authorization: `Bearer ${accessToken()}` }
		if (length) headers["content-length"] = length
		const response = await POST(nextRequest("POST", { headers, body: "x".repeat(MAX_ACCOUNT_REQUEST_BODY_BYTES + 1) }))
		expect(response.status).toBe(413)
		expect(await response.text()).toContain("complete encoded JSON request must be at most 512 KiB")
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("keeps verified public calls at 64 KiB", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify({ method: "tools/call", params: { name: "search_icons" } })
		const response = await POST(
			nextRequest("POST", {
				headers: { authorization: `Bearer ${accessToken()}`, "content-length": "2" },
				body: json.padEnd(MAX_REQUEST_BODY_BYTES + 1),
			}),
		)
		expect(response.status).toBe(413)
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it.each([
		"Bearer spoofed",
		`Bearer ${tamper(accessToken())}`,
		`Bearer ${accessToken("https://other.example/api/mcp")}`,
		"Basic anything",
	])("verifies Authorization before reading a larger body (%s)", async (authorization) => {
		const { POST } = await import("@/app/api/mcp/route")
		const request = new Request("http://localhost/api/mcp", {
			method: "POST",
			headers: { authorization },
			body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1),
		})
		expect((await POST(request as never)).status).toBe(401)
		expect(request.bodyUsed).toBe(false)
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("does not grant the account cap to an expired OAuth token", async () => {
		const token = seal(
			SECRET,
			"access",
			{
				sub: "user123",
				username: "tester",
				admin: false,
				scope: "account",
				aud: "http://localhost/api/mcp",
				cid: "client",
				pb_token: "pb-token",
			},
			-1,
		)
		const { POST } = await import("@/app/api/mcp/route")
		expect(
			(await POST(nextRequest("POST", { headers: { authorization: `Bearer ${token}` }, body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1) })))
				.status,
		).toBe(401)
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("keeps anonymous callers at the exact 64 KiB boundary", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify({ method: "tools/call", params: { name: "search_icons" } })
		expect((await POST(nextRequest("POST", { body: json.padEnd(MAX_REQUEST_BODY_BYTES) }))).status).toBe(200)
		expect((await POST(nextRequest("POST", { body: json.padEnd(MAX_REQUEST_BODY_BYTES + 1) }))).status).toBe(413)
	})

	it("does not grant extra bytes to arbitrary Authorization when OAuth is disabled", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		const { POST } = await import("@/app/api/mcp/route")
		expect(
			(await POST(nextRequest("POST", { headers: { authorization: "Bearer anything" }, body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1) })))
				.status,
		).toBe(413)
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("preserves the tool rate limit for signed-in account calls", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const authorization = `Bearer ${accessToken()}`
		for (let i = 0; i < 30; i++) expect((await POST(toolCall("submit_icon", authorization))).status).toBe(200)
		const response = await POST(toolCall("submit_icon", authorization))
		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBeTruthy()
	})

	it("leaves account tools to the registry refusal when sign-in is disabled", async () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(toolCall("submit_icon", "Bearer anything"))
		expect(response.status).toBe(200)
		expect(handleMcpRequest).toHaveBeenCalledWith(expect.anything(), undefined)
	})

	it.each([
		"submit_icon",
		"propose_icon_update",
		"list_my_submissions",
	])("challenges a batch containing %s in either position before dispatch", async (name) => {
		const { POST } = await import("@/app/api/mcp/route")
		for (const names of [
			[name, "search_icons"],
			["search_icons", name],
		]) {
			const body = names.map((name, id) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } }))
			const response = await POST(nextRequest("POST", { body: JSON.stringify(body) }))
			expect(response.status).toBe(401)
			expect(response.headers.get("WWW-Authenticate")).toContain('scope="account"')
			expect(response.headers.get("Access-Control-Expose-Headers")).toBe("WWW-Authenticate")
		}
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it.each([
		MAX_REQUEST_BODY_BYTES + 1,
		MAX_ACCOUNT_REQUEST_BODY_BYTES,
	])("accepts signed-in account batches of %i bytes with an understated length", async (size) => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify([
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
		])
		const response = await POST(
			nextRequest("POST", {
				headers: { authorization: "Bearer " + accessToken(), "content-length": "2" },
				body: json.padEnd(size),
			}),
		)
		expect(response.status).toBe(200)
		const forwarded = handleMcpRequest.mock.calls[0]?.[0]
		expect(Buffer.byteLength((await forwarded?.text()) ?? "")).toBe(size)
	})

	it("uses the account cap for a signed-in mixed batch", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify([
			{ jsonrpc: "2.0", id: 1, method: "tools/list" },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_my_submissions", arguments: {} } },
		])
		const response = await POST(
			nextRequest("POST", {
				headers: { authorization: "Bearer " + accessToken() },
				body: json.padEnd(MAX_REQUEST_BODY_BYTES + 1),
			}),
		)
		expect(response.status).toBe(200)
		expect(handleMcpRequest).toHaveBeenCalledOnce()
	})

	it.each([undefined, "signed-in"])("keeps public-only batches at 64 KiB (%s)", async (mode) => {
		const { POST } = await import("@/app/api/mcp/route")
		const json = JSON.stringify([
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_icons", arguments: {} } },
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		])
		const headers = mode ? { authorization: "Bearer " + accessToken() } : undefined
		expect((await POST(nextRequest("POST", { headers, body: json.padEnd(MAX_REQUEST_BODY_BYTES) }))).status).toBe(200)
		expect((await POST(nextRequest("POST", { headers, body: json.padEnd(MAX_REQUEST_BODY_BYTES + 1) }))).status).toBe(413)
		expect(handleMcpRequest).toHaveBeenCalledOnce()
	})

	it("charges the tool quota for every call in a public batch", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const body = Array.from({ length: 30 }, (_, id) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "search_icons" } }))
		expect((await POST(nextRequest("POST", { body: JSON.stringify(body) }))).status).toBe(200)
		const response = await POST(toolCall("search_icons"))
		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBeTruthy()
		expect(handleMcpRequest).toHaveBeenCalledOnce()
	})

	it("rejects a whole signed-in batch before dispatch when its last call exceeds the quota", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		for (let index = 0; index < 29; index++) expect((await POST(toolCall("search_icons"))).status).toBe(200)
		handleMcpRequest.mockClear()
		const body = [
			{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_my_submissions" } },
			{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_icons" } },
		]
		const response = await POST(
			nextRequest("POST", {
				headers: { authorization: "Bearer " + accessToken() },
				body: JSON.stringify(body),
			}),
		)
		expect(response.status).toBe(429)
		expect(handleMcpRequest).not.toHaveBeenCalled()
	})

	it("does not swallow unexpected verifier failures", async () => {
		const auth = await import("@/mcp/auth")
		vi.mocked(auth.verifyMcpBearer).mockRejectedValueOnce(new Error("boom"))
		const { POST } = await import("@/app/api/mcp/route")
		await expect(POST(toolCall("search_icons", "Bearer x"))).rejects.toThrow("boom")
	})
})

describe("MCP route", () => {
	beforeEach(async () => {
		resetRateLimitsForTests()
		process.env.MCP_RATE_LIMIT_ENABLED = "true"
		handleMcpRequest.mockClear()
		flushDashboardIconsMcpAnalytics.mockClear()
		afterTasks.length = 0
	})

	it("returns 429 after exceeding request rate limit", async () => {
		const { GET } = await import("@/app/api/mcp/route")
		for (let i = 0; i < 60; i++) {
			await GET(nextRequest("GET"))
		}
		const response = await GET(nextRequest("GET"))
		expect(response.status).toBe(429)
	})

	it("returns 413 for oversized POST bodies", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) },
				body: "{}",
			}),
		)
		expect(response.status).toBe(413)
	})

	it("returns 413 for an oversized body without a declared length", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json" },
				body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1),
			}),
		)
		expect(response.status).toBe(413)
	})

	it("returns 413 when content-length understates the actual body", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json", "content-length": "2" },
				body: "x".repeat(MAX_REQUEST_BODY_BYTES + 1),
			}),
		)
		expect(response.status).toBe(413)
	})

	it("accepts an empty POST body", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(nextRequest("POST"))
		expect(response.status).toBe(200)
	})

	it("returns 429 for tool call rate limit", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		for (let i = 0; i < 30; i++) {
			await POST(
				nextRequest("POST", {
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ method: "tools/call" }),
				}),
			)
		}
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ method: "tools/call" }),
			}),
		)
		expect(response.status).toBe(429)
	})

	it("treats invalid JSON POST as non-tool request", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json" },
				body: "not-json",
			}),
		)
		expect(response.status).toBe(200)
		expect(handleMcpRequest).toHaveBeenCalled()
	})

	it("flushes analytics after the response instead of before it", async () => {
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
			}),
		)
		expect(response.status).toBe(200)
		expect(flushDashboardIconsMcpAnalytics).not.toHaveBeenCalled()
		expect(afterTasks).toEqual([flushDashboardIconsMcpAnalytics])
		await afterTasks[0]?.()
		expect(flushDashboardIconsMcpAnalytics).toHaveBeenCalledTimes(1)
		const forwarded = handleMcpRequest.mock.calls[0]?.[0]
		expect(await forwarded?.json()).toEqual({ jsonrpc: "2.0", id: 1, method: "tools/list" })
	})

	it("sets security headers on success", async () => {
		const { GET } = await import("@/app/api/mcp/route")
		const response = await GET(nextRequest("GET"))
		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
		expect(response.headers.get("X-Frame-Options")).toBe("DENY")
	})

	it("uses default retry-after when request limit omits it", async () => {
		const checkSpy = vi.spyOn(rateLimit, "checkRateLimit").mockReturnValueOnce({ allowed: false })
		const { GET } = await import("@/app/api/mcp/route")
		const response = await GET(nextRequest("GET"))
		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("60")
		checkSpy.mockRestore()
	})

	it("uses default retry-after when tool limit omits it", async () => {
		const checkSpy = vi.spyOn(rateLimit, "checkRateLimit").mockReturnValueOnce({ allowed: true }).mockReturnValueOnce({ allowed: false })
		const { POST } = await import("@/app/api/mcp/route")
		const response = await POST(
			nextRequest("POST", {
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ method: "tools/call" }),
			}),
		)
		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("60")
		checkSpy.mockRestore()
	})
})
