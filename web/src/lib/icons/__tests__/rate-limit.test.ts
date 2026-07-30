import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit, getClientIp, resetRateLimitsForTests } from "@/lib/icons/rate-limit"

describe("getClientIp", () => {
	it("reads first x-forwarded-for hop", () => {
		const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })
		expect(getClientIp(headers)).toBe("1.2.3.4")
	})

	it("reads x-real-ip when forwarded header missing", () => {
		const headers = new Headers({ "x-real-ip": "9.9.9.9" })
		expect(getClientIp(headers)).toBe("9.9.9.9")
	})

	it("falls back to unknown when forwarded hop is empty", () => {
		const headers = new Headers({ "x-forwarded-for": " , 1.2.3.4" })
		expect(getClientIp(headers)).toBe("unknown")
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

	it("blocks tool scope independently", () => {
		for (let i = 0; i < 30; i++) checkRateLimit("10.0.0.3", "tool")
		expect(checkRateLimit("10.0.0.3", "tool").allowed).toBe(false)
	})

	it("resets window after expiry", () => {
		for (let i = 0; i < 60; i++) checkRateLimit("10.0.0.4", "request")
		expect(checkRateLimit("10.0.0.4", "request").allowed).toBe(false)
		vi.advanceTimersByTime(60_001)
		expect(checkRateLimit("10.0.0.4", "request").allowed).toBe(true)
	})

	it("can be disabled via env", () => {
		process.env.MCP_RATE_LIMIT_ENABLED = "false"
		for (let i = 0; i < 100; i++) {
			expect(checkRateLimit("10.0.0.5", "request").allowed).toBe(true)
		}
	})
})
