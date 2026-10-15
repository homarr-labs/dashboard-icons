import { describe, expect, it } from "vitest"
import { isValidCodeChallenge, verifyPkce } from "@/mcp/auth/pkce"
import { pkcePair } from "./fixtures"

describe("pkce", () => {
	it("verifies an S256 challenge", () => {
		const { verifier, challenge } = pkcePair()
		expect(isValidCodeChallenge(challenge)).toBe(true)
		expect(verifyPkce(verifier, challenge)).toBe(true)
	})

	it("rejects a mismatched verifier", () => {
		const { challenge } = pkcePair()
		expect(verifyPkce(pkcePair().verifier, challenge)).toBe(false)
	})

	it("rejects malformed verifiers and challenges", () => {
		const { verifier } = pkcePair()
		expect(verifyPkce("short", pkcePair().challenge)).toBe(false)
		expect(verifyPkce(verifier, "short")).toBe(false)
		expect(isValidCodeChallenge("plain-challenge")).toBe(false)
	})
})
