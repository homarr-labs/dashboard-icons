import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/mcp/route"
import { resetRateLimitsForTests } from "@/lib/icons/rate-limit"

vi.mock("next/cache", () => ({
	unstable_cache: (fn: () => Promise<unknown>) => fn,
}))

vi.mock("@/lib/icons/service", () => ({
	searchIcons: vi.fn().mockResolvedValue({ results: [{ name: "plex" }], total: 1 }),
	getIconByName: vi.fn(),
	getIconUrl: vi.fn(),
	suggestIcons: vi.fn(),
	warmMetadataCache: vi.fn(),
	getAllIcons: vi.fn(),
}))

describe("MCP route", () => {
	beforeEach(() => {
		resetRateLimitsForTests()
		process.env.MCP_RATE_LIMIT_ENABLED = "true"
	})

	it("returns 429 after exceeding request rate limit", async () => {
		for (let i = 0; i < 60; i++) {
			await GET(new Request("http://localhost/api/mcp", { method: "GET" }) as never)
		}
		const response = await GET(new Request("http://localhost/api/mcp", { method: "GET" }) as never)
		expect(response.status).toBe(429)
	})
})
