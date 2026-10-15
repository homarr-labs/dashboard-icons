import { checkRateLimit, getClientIp } from "@/lib/icons/rate-limit"
import { approveAuthorization } from "./authorize"
import { registerClient } from "./clients"
import { getMcpAuthConfig, type McpAuthConfig, resolveIssuer } from "./config"
import { authorizationServerMetadata, protectedResourceMetadata } from "./metadata"
import { exchangeToken } from "./token"

const MAX_BODY_BYTES = 16 * 1024
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" }
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" }

type Endpoint = (req: Request, config: McpAuthConfig, issuer: string) => Response | Promise<Response>

function oauthError(status: number, error: string, description: string, headers: HeadersInit = {}): Response {
	return Response.json({ error, error_description: description }, { status, headers: { ...NO_STORE_HEADERS, ...headers } })
}

function enabledOnly(endpoint: Endpoint, rateLimited: boolean) {
	return async (req: Request): Promise<Response> => {
		const config = getMcpAuthConfig()
		if (!config) return new Response("Not Found", { status: 404 })
		if (rateLimited) {
			const limit = checkRateLimit(getClientIp(req.headers), "request")
			if (!limit.allowed) {
				return oauthError(429, "too_many_requests", "Too many requests. Try again later.", {
					...CORS_HEADERS,
					"Retry-After": String(limit.retryAfter),
				})
			}
		}
		return endpoint(req, config, resolveIssuer(req.headers, new URL(req.url).origin))
	}
}

async function readBody(req: Request): Promise<string | null> {
	if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return null
	if (!req.body) return ""
	const reader = req.body.getReader()
	const chunks: Uint8Array[] = []
	let size = 0
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		size += value.byteLength
		if (size > MAX_BODY_BYTES) {
			await reader.cancel()
			return null
		}
		chunks.push(value)
	}
	return Buffer.concat(chunks).toString("utf8")
}

async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
	const text = await readBody(req)
	if (text === null) return { ok: false }
	try {
		return { ok: true, value: JSON.parse(text) }
	} catch {
		return { ok: false }
	}
}

async function readForm(req: Request): Promise<Record<string, string> | null> {
	if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return null
	const text = await readBody(req)
	if (text === null) return null
	const form = new URLSearchParams(text)
	const params: Record<string, string> = {}
	for (const [key, value] of form) {
		if (key in params) return null
		params[key] = value
	}
	return params
}

export function handleOAuthPreflight(): Response {
	if (!getMcpAuthConfig()) return new Response("Not Found", { status: 404 })
	return new Response(null, {
		status: 204,
		headers: {
			...CORS_HEADERS,
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
			"Access-Control-Max-Age": "86400",
		},
	})
}

export const handleProtectedResourceMetadata = enabledOnly(
	(_req, _config, issuer) => Response.json(protectedResourceMetadata(issuer), { headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS } }),
	false,
)

export const handleAuthorizationServerMetadata = enabledOnly(
	(_req, _config, issuer) => Response.json(authorizationServerMetadata(issuer), { headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS } }),
	false,
)

export const handleClientRegistration = enabledOnly(async (req, config) => {
	const body = await readJson(req)
	if (!body.ok) return oauthError(400, "invalid_client_metadata", "The request body must be a JSON object.", CORS_HEADERS)
	const result = registerClient(config.secret, body.value)
	if (!result.ok) return oauthError(400, result.error, result.description, CORS_HEADERS)
	return Response.json(result.client, { status: 201, headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS } })
}, true)

export const handleTokenRequest = enabledOnly(async (req, config, issuer) => {
	const params = await readForm(req)
	if (!params) {
		return oauthError(400, "invalid_request", "Send a form-encoded body without duplicate parameters.", CORS_HEADERS)
	}
	const result = await exchangeToken(params, { secret: config.secret, issuer })
	return Response.json(result.body, { status: result.status, headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS } })
}, true)

export const handleAuthorizationDecision = enabledOnly(async (req, config, issuer) => {
	const body = await readJson(req)
	if (!body.ok) return oauthError(400, "invalid_request", "The request body must be JSON.")
	const result = await approveAuthorization(body.value, { secret: config.secret, issuer })
	return Response.json(result.body, { status: result.status, headers: NO_STORE_HEADERS })
}, true)
