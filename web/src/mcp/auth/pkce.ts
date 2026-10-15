import { createHash, timingSafeEqual } from "node:crypto"

const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isValidCodeChallenge(challenge: string): boolean {
	return CHALLENGE_PATTERN.test(challenge)
}

export function verifyPkce(verifier: string, challenge: string): boolean {
	if (!VERIFIER_PATTERN.test(verifier)) return false
	const computed = Buffer.from(createHash("sha256").update(verifier).digest("base64url"))
	const expected = Buffer.from(challenge)
	return computed.length === expected.length && timingSafeEqual(computed, expected)
}
