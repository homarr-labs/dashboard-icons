import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit, getClientIp, resetRateLimitsForTests } from "@/lib/icons/rate-limit"

describe("getClientIp", () => {
	it("reads first x-forwarded-for hop", () => {
		const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })
		expect(getClientIp(headers)).toBe("1.2.3.4")
	})

	it("falls back to unknown", () => {
		expect(getClientIp(new Headers())).toBe("unknown")
	})
})

describe("checkRateLimit", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		resetRateLimitsForTests()
		process.env.MCP_RATE_LIMIT_ENABLED = "true"
	})

	it("allows requests under limit", () => {
		for (let i = 0; i < 60; i++) {
			expect(checkRateLimit("10.0.0.1", "request").allowed).toBe(true)
		}
	})

	it("blocks after exceeding request limit", () => {
		for (let i = 0; i < 60; i++) checkRateLimit("10.0.0.2", "request")
		const result = checkRateLimit("10.0.0.2", "request")
		expect(result.allowed).toBe(false)
		expect(result.retryAfter).toBeGreaterThan(0)
	})
})
