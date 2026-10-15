import { createHash } from "node:crypto"
import { z } from "zod"
import { CLIENT_ID_TTL_SECONDS, MCP_SCOPES, nowSeconds } from "./config"
import { isAllowedRedirectUri } from "./redirect-uri"
import { seal, unseal } from "./seal"

const MAX_REDIRECT_URIS = 5
const MAX_CLIENT_NAME_LENGTH = 80
const DEFAULT_CLIENT_NAME = "MCP client"

const registrationSchema = z.object({
	redirect_uris: z.array(z.string()).min(1).max(MAX_REDIRECT_URIS),
	client_name: z.string().optional(),
})

const clientDataSchema = z.object({
	name: z.string(),
	redirect_uris: z.array(z.string()).min(1),
})

export type RegisteredClient = { id: string; name: string; redirectUris: string[] }

export type ClientRegistrationResponse = {
	client_id: string
	client_id_issued_at: number
	client_name: string
	redirect_uris: string[]
	grant_types: string[]
	response_types: string[]
	token_endpoint_auth_method: "none"
	scope: string
}

export type RegistrationResult =
	| { ok: true; client: ClientRegistrationResponse }
	| { ok: false; error: "invalid_client_metadata" | "invalid_redirect_uri"; description: string }

function sanitizeClientName(name: string | undefined): string {
	const cleaned = (name ?? "")
		.replace(/\p{Cc}/gu, "")
		.trim()
		.slice(0, MAX_CLIENT_NAME_LENGTH)
	return cleaned || DEFAULT_CLIENT_NAME
}

export function registerClient(secret: Buffer, input: unknown): RegistrationResult {
	const parsed = registrationSchema.safeParse(input)
	if (!parsed.success) {
		return {
			ok: false,
			error: "invalid_client_metadata",
			description: `redirect_uris must list 1 to ${MAX_REDIRECT_URIS} URIs and client_name must be a string.`,
		}
	}
	const redirectUris = parsed.data.redirect_uris
	if (!redirectUris.every(isAllowedRedirectUri)) {
		return {
			ok: false,
			error: "invalid_redirect_uri",
			description: "Redirect URIs must use https, an http loopback address, or a private-use URI scheme, without a fragment.",
		}
	}
	const name = sanitizeClientName(parsed.data.client_name)
	return {
		ok: true,
		client: {
			client_id: seal(secret, "client", { name, redirect_uris: redirectUris }, CLIENT_ID_TTL_SECONDS),
			client_id_issued_at: nowSeconds(),
			client_name: name,
			redirect_uris: redirectUris,
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
			scope: MCP_SCOPES.join(" "),
		},
	}
}

export function clientFingerprint(clientId: string): string {
	return createHash("sha256").update(clientId).digest("base64url")
}

export function readClient(secret: Buffer, clientId: string): RegisteredClient | null {
	const result = unseal(secret, "client", clientId)
	if (!result.ok) return null
	const data = clientDataSchema.safeParse(result.data)
	if (!data.success) return null
	return { id: clientId, name: data.data.name, redirectUris: data.data.redirect_uris }
}
