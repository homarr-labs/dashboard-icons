import { createHash, randomBytes } from "node:crypto"

export const SECRET_TEXT = "mcp-oauth-test-secret-".repeat(3)
export const SECRET = Buffer.from(SECRET_TEXT)
export const OTHER_SECRET = Buffer.from("another-test-secret-value-".repeat(3))
export const ISSUER = "https://dashboardicons.com"
export const RESOURCE = `${ISSUER}/api/mcp`
export const REDIRECT_URI = "http://127.0.0.1:33418/callback"
export const USER = { id: "user123", username: "tester", admin: false }

export function pkcePair(): { verifier: string; challenge: string } {
	const verifier = randomBytes(32).toString("base64url")
	return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

export function tamper(token: string): string {
	const raw = Buffer.from(token, "base64url")
	raw[raw.length - 1] ^= 0xff
	return raw.toString("base64url")
}
