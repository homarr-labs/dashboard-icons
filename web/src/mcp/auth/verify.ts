import { type AuthInfo, bearerAuthChallengeResponse, OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server"
import { getMcpAuthConfig, MCP_SCOPES, mcpResourceUrl, protectedResourceMetadataUrl, resolveIssuer } from "./config"
import { unseal } from "./seal"
import { accessClaimsSchema } from "./token"

export type McpAuthExtra = { userId: string; username: string; admin: boolean; pbToken: string }

const BEARER_PATTERN = /^Bearer +([A-Za-z0-9_-]+) *$/i

function invalidToken(description: string): OAuthError {
	return new OAuthError(OAuthErrorCode.InvalidToken, description)
}

function requestIssuer(req: Request): string {
	return resolveIssuer(req.headers, new URL(req.url).origin)
}

export async function verifyMcpBearer(req: Request): Promise<AuthInfo | undefined> {
	const config = getMcpAuthConfig()
	const header = req.headers.get("authorization")
	if (!config || header === null) return undefined
	const match = BEARER_PATTERN.exec(header)
	if (!match) throw invalidToken("The Authorization header must be 'Bearer <token>'.")
	const token = match[1]
	const unsealed = unseal(config.secret, "access", token)
	if (!unsealed.ok && unsealed.reason === "expired") throw invalidToken("The access token expired.")
	if (!unsealed.ok) throw invalidToken("The access token is invalid.")
	const claims = accessClaimsSchema.safeParse(unsealed.data)
	if (!claims.success) throw invalidToken("The access token is invalid.")
	const issuer = requestIssuer(req)
	if (claims.data.aud !== mcpResourceUrl(issuer)) throw invalidToken("The access token was issued for a different resource.")
	const extra: McpAuthExtra = {
		userId: claims.data.sub,
		username: claims.data.username,
		admin: claims.data.admin,
		pbToken: claims.data.pb_token,
	}
	return {
		token,
		clientId: claims.data.cid,
		scopes: claims.data.scope.split(" "),
		expiresAt: unsealed.expiresAt,
		resource: new URL(claims.data.aud),
		resourceMetadataUrl: protectedResourceMetadataUrl(issuer),
		extra,
	}
}

/** Returns a 401 Bearer challenge pointing at the protected resource metadata, or null when MCP sign-in is disabled. */
export function mcpAuthChallenge(req: Request, opts: { error?: "invalid_token"; description?: string } = {}): Response | null {
	if (!getMcpAuthConfig()) return null
	const resourceMetadataUrl = protectedResourceMetadataUrl(requestIssuer(req))
	if (opts.error) {
		const error = invalidToken(opts.description ?? "The access token is invalid.")
		return bearerAuthChallengeResponse(error, { requiredScopes: [...MCP_SCOPES], resourceMetadataUrl })
	}
	return Response.json(
		{ error: "unauthorized", error_description: opts.description ?? "Sign in to Dashboard Icons to use this tool." },
		{
			status: 401,
			headers: { "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}", scope="${MCP_SCOPES.join(" ")}"` },
		},
	)
}
