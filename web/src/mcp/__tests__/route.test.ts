import { beforeEach, describe, expect, it, vi } from "vitest"
import * as rateLimit from "@/lib/icons/rate-limit"
import { resetRateLimitsForTests } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"

const { mcpHandlerMock } = vi.hoisted(() => ({
	mcpHandlerMock: vi.fn(async () => new Response("ok", { status: 200 })),
}))

vi.mock("@/mcp/handler", () => ({
	createDashboardIconsMcpHandler: () => mcpHandlerMock,
}))

function nextRequest(method: string, init: RequestInit = {}) {
	return new Request("http://localhost/api/mcp", { method, ...init }) as never
}

describe("MCP route", () => {
	beforeEach(async () => {
		resetRateLimitsForTests()
		process.env.MCP_RATE_LIMIT_ENABLED = "true"
		mcpHandlerMock.mockClear()
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
		expect(mcpHandlerMock).toHaveBeenCalled()
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
