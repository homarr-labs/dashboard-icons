import { beforeEach, describe, expect, it, vi } from "vitest"
import * as rateLimit from "@/lib/icons/rate-limit"
import { resetRateLimitsForTests } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"

const { afterTasks, flushDashboardIconsMcpAnalytics, handleMcpRequest } = vi.hoisted(() => ({
	afterTasks: [] as (() => unknown)[],
	flushDashboardIconsMcpAnalytics: vi.fn(async () => {}),
	handleMcpRequest: vi.fn(async (_req: Request) => new Response("ok", { status: 200 })),
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

function nextRequest(method: string, init: RequestInit = {}) {
	return new Request("http://localhost/api/mcp", { method, ...init }) as never
}

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
