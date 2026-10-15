import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/server"

export const MCP_SCOPES = ["account"] as const
export const DEFAULT_SCOPE = "account"
export const MCP_RESOURCE_PATH = "/api/mcp"
export const CLIENT_ID_TTL_SECONDS = 10 * 365 * 24 * 60 * 60
export const CODE_TTL_SECONDS = 60
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

const MIN_SECRET_BYTES = 32
const HOST_PATTERN = /^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::\d{1,5})?$/
const SUPPORTED_SCOPES: ReadonlySet<string> = new Set(MCP_SCOPES)

let warnedShortSecret = false

export type McpAuthConfig = { secret: Buffer }

export function getMcpAuthConfig(): McpAuthConfig | null {
	const secret = process.env.MCP_OAUTH_SECRET
	if (!secret) return null
	if (Buffer.byteLength(secret) < MIN_SECRET_BYTES) {
		if (!warnedShortSecret) console.warn("MCP_OAUTH_SECRET must be at least 32 bytes long; MCP sign-in is disabled.")
		warnedShortSecret = true
		return null
	}
	return { secret: Buffer.from(secret) }
}

export function isMcpAuthEnabled(): boolean {
	return getMcpAuthConfig() !== null
}

export function nowSeconds(): number {
	return Math.floor(Date.now() / 1000)
}

function firstForwarded(value: string | null): string | null {
	if (!value) return null
	return value.split(",")[0].trim()
}

export function resolveIssuer(headers: Pick<Headers, "get">, fallbackOrigin: string): string {
	const configured = process.env.MCP_OAUTH_ISSUER
	if (configured && URL.canParse(configured)) return new URL(configured).origin
	const fallback = new URL(fallbackOrigin)
	const host = firstForwarded(headers.get("x-forwarded-host")) ?? headers.get("host")
	const proto = firstForwarded(headers.get("x-forwarded-proto")) ?? fallback.protocol.slice(0, -1)
	if (!host || !HOST_PATTERN.test(host) || (proto !== "http" && proto !== "https")) return fallback.origin
	return `${proto}://${host.toLowerCase()}`
}

export function mcpResourceUrl(issuer: string): string {
	return `${issuer}${MCP_RESOURCE_PATH}`
}

export function protectedResourceMetadataUrl(issuer: string): string {
	return getOAuthProtectedResourceMetadataUrl(new URL(mcpResourceUrl(issuer)))
}

export function canonicalResource(value: string): string | null {
	if (value.includes("#") || !URL.canParse(value)) return null
	const url = new URL(value)
	return `${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`
}

export function parseScope(value: string | undefined): string | null {
	const requested = (value ?? "").split(" ").filter(Boolean)
	if (requested.length === 0) return DEFAULT_SCOPE
	if (!requested.every((scope) => SUPPORTED_SCOPES.has(scope))) return null
	return [...new Set(requested)].join(" ")
}
