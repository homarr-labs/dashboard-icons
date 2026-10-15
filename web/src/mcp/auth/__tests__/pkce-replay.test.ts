import { describe, expect, it } from "vitest"
import { isValidCodeChallenge, verifyPkce } from "@/mcp/auth/pkce"
import { createReplayGuard } from "@/mcp/auth/replay"
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

describe("replay guard", () => {
	it("accepts an id once", () => {
		const guard = createReplayGuard(10)
		expect(guard.consume("a", Date.now() + 60_000)).toBe(true)
		expect(guard.consume("a", Date.now() + 60_000)).toBe(false)
	})

	it("forgets expired ids and keeps live ones", () => {
		const guard = createReplayGuard(10)
		guard.consume("old", Date.now() - 1)
		guard.consume("live", Date.now() + 60_000)
		guard.consume("new", Date.now() + 60_000)
		expect(guard.size()).toBe(2)
	})

	it("refuses new ids when full", () => {
		const guard = createReplayGuard(1)
		expect(guard.consume("a", Date.now() + 60_000)).toBe(true)
		expect(guard.consume("b", Date.now() + 60_000)).toBe(false)
	})

	it("can evict the oldest live id instead of refusing when full", () => {
		const guard = createReplayGuard(2, { evictOldest: true })
		for (const id of ["a", "b", "c"]) expect(guard.consume(id, Date.now() + 60_000)).toBe(true)
		expect(guard.size()).toBe(2)
		expect(guard.consume("c", Date.now() + 60_000)).toBe(false)
		expect(guard.consume("a", Date.now() + 60_000)).toBe(true)
	})
})
