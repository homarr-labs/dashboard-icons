import { afterEach, describe, expect, it, vi } from "vitest"
import { seal, unseal } from "@/mcp/auth/seal"
import { OTHER_SECRET, SECRET, tamper } from "./fixtures"

describe("seal", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("round-trips data and reports the expiry", () => {
		const token = seal(SECRET, "access", { sub: "u1" }, 60)
		const result = unseal(SECRET, "access", token)
		expect(result).toEqual({ ok: true, data: { sub: "u1" }, expiresAt: Math.floor(Date.now() / 1000) + 60 })
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
	})

	it("never produces the same token twice", () => {
		expect(seal(SECRET, "code", { a: 1 }, 60)).not.toBe(seal(SECRET, "code", { a: 1 }, 60))
	})

	it("rejects a token sealed for another purpose", () => {
		const token = seal(SECRET, "refresh", { sub: "u1" }, 60)
		expect(unseal(SECRET, "access", token)).toEqual({ ok: false, reason: "invalid" })
		expect(unseal(SECRET, "client", token)).toEqual({ ok: false, reason: "invalid" })
	})

	it("rejects a token sealed with another secret", () => {
		const token = seal(OTHER_SECRET, "access", { sub: "u1" }, 60)
		expect(unseal(SECRET, "access", token)).toEqual({ ok: false, reason: "invalid" })
	})

	it("rejects tampered tokens", () => {
		const token = seal(SECRET, "access", { sub: "u1" }, 60)
		expect(unseal(SECRET, "access", tamper(token))).toEqual({ ok: false, reason: "invalid" })
	})

	it("rejects malformed tokens", () => {
		const token = seal(SECRET, "access", { sub: "u1" }, 60)
		const wrongVersion = Buffer.from(token, "base64url")
		wrongVersion[0] = 2
		for (const candidate of ["", "not.base64", "a".repeat(9000), "AQID", wrongVersion.toString("base64url")]) {
			expect(unseal(SECRET, "access", candidate)).toEqual({ ok: false, reason: "invalid" })
		}
	})

	it("reports expired tokens", () => {
		const token = seal(SECRET, "code", { jti: "x" }, 60)
		const now = Date.now()
		vi.spyOn(Date, "now").mockReturnValue(now + 60_000)
		expect(unseal(SECRET, "code", token)).toEqual({ ok: false, reason: "expired" })
	})
})
