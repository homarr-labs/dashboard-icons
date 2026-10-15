import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"
import { z } from "zod"
import { nowSeconds } from "./config"

export type SealPurpose = "client" | "code" | "access" | "refresh"
export type UnsealResult = { ok: true; data: unknown; expiresAt: number } | { ok: false; reason: "invalid" | "expired" }

const VERSION = 1
const IV_BYTES = 12
const TAG_BYTES = 16
const HEADER_BYTES = 1 + IV_BYTES + TAG_BYTES
const MAX_TOKEN_LENGTH = 8192
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/
const HKDF_SALT = "dashboard-icons-mcp-oauth"
const INVALID: UnsealResult = { ok: false, reason: "invalid" }

const envelopeSchema = z.object({ exp: z.number().int(), data: z.unknown() })

function purposeKey(secret: Buffer, purpose: SealPurpose): Buffer {
	return Buffer.from(hkdfSync("sha256", secret, HKDF_SALT, `seal:${purpose}`, 32))
}

export function seal(secret: Buffer, purpose: SealPurpose, data: unknown, ttlSeconds: number): string {
	const iv = randomBytes(IV_BYTES)
	const cipher = createCipheriv("aes-256-gcm", purposeKey(secret, purpose), iv, { authTagLength: TAG_BYTES })
	cipher.setAAD(Buffer.from(purpose))
	const plaintext = Buffer.from(JSON.stringify({ exp: nowSeconds() + ttlSeconds, data }))
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
	return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]).toString("base64url")
}

function decrypt(secret: Buffer, purpose: SealPurpose, raw: Buffer): unknown {
	try {
		const decipher = createDecipheriv("aes-256-gcm", purposeKey(secret, purpose), raw.subarray(1, 1 + IV_BYTES), {
			authTagLength: TAG_BYTES,
		})
		decipher.setAAD(Buffer.from(purpose))
		decipher.setAuthTag(raw.subarray(1 + IV_BYTES, HEADER_BYTES))
		const plaintext = Buffer.concat([decipher.update(raw.subarray(HEADER_BYTES)), decipher.final()])
		return JSON.parse(plaintext.toString("utf8"))
	} catch {
		return undefined
	}
}

export function unseal(secret: Buffer, purpose: SealPurpose, token: string): UnsealResult {
	if (token.length > MAX_TOKEN_LENGTH || !TOKEN_PATTERN.test(token)) return INVALID
	const raw = Buffer.from(token, "base64url")
	if (raw.length <= HEADER_BYTES || raw[0] !== VERSION) return INVALID
	const envelope = envelopeSchema.safeParse(decrypt(secret, purpose, raw))
	if (!envelope.success) return INVALID
	if (envelope.data.exp <= nowSeconds()) return { ok: false, reason: "expired" }
	return { ok: true, data: envelope.data.data, expiresAt: envelope.data.exp }
}
