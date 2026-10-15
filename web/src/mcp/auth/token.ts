import { randomUUID } from "node:crypto"
import { z } from "zod"
import { clientFingerprint } from "./clients"
import { ACCESS_TOKEN_TTL_SECONDS, canonicalResource, mcpResourceUrl, nowSeconds, parseScope, REFRESH_TOKEN_TTL_SECONDS } from "./config"
import { consumeGrant } from "./durable-replay"
import { verifyPkce } from "./pkce"
import { type McpUser, refreshPocketBaseSession } from "./pocketbase"
import { type SealPurpose, seal, unseal } from "./seal"

export type TokenContext = { secret: Buffer; issuer: string }

export type TokenResponse = {
	access_token: string
	token_type: "Bearer"
	expires_in: number
	refresh_token: string
	scope: string
}

export type TokenErrorCode =
	| "invalid_request"
	| "invalid_grant"
	| "invalid_scope"
	| "invalid_target"
	| "unsupported_grant_type"
	| "temporarily_unavailable"

export type TokenResult =
	| { status: 200; body: TokenResponse }
	| { status: 400 | 503; body: { error: TokenErrorCode; error_description: string } }

const userSchema = z.object({ id: z.string(), username: z.string(), admin: z.boolean() })

const codeSchema = z.object({
	jti: z.string(),
	cid: z.string(),
	redirect_uri: z.string(),
	code_challenge: z.string(),
	resource: z.string(),
	scope: z.string(),
	user: userSchema,
	pb_token: z.string(),
})

const refreshSchema = z.object({
	jti: z.string(),
	sub: z.string(),
	cid: z.string(),
	scope: z.string(),
	resource: z.string(),
	pb_token: z.string(),
})

export const accessClaimsSchema = z.object({
	sub: z.string(),
	username: z.string(),
	admin: z.boolean(),
	scope: z.string(),
	aud: z.string(),
	cid: z.string(),
	pb_token: z.string(),
})

type Grant = { user: McpUser; pbToken: string; cid: string; scope: string; resource: string }

function readGrant<T>(ctx: TokenContext, purpose: SealPurpose, token: string, schema: z.ZodType<T>): (T & { expiresAt: number }) | null {
	const unsealed = unseal(ctx.secret, purpose, token)
	if (!unsealed.ok) return null
	const parsed = schema.safeParse(unsealed.data)
	if (!parsed.success) return null
	return { ...parsed.data, expiresAt: unsealed.expiresAt }
}

function tokenError(error: TokenErrorCode, description: string, status: 400 | 503 = 400): TokenResult {
	return { status, body: { error, error_description: description } }
}

function pocketBaseExpiry(token: string): number | null {
	const parts = token.split(".")
	if (parts.length !== 3) return null
	try {
		const parsed = z
			.object({ exp: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
			.safeParse(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")))
		if (!parsed.success) return null
		return parsed.data.exp
	} catch {
		return null
	}
}

function issueTokens(ctx: TokenContext, grant: Grant): TokenResult {
	const expiresAt = pocketBaseExpiry(grant.pbToken)
	if (expiresAt === null || expiresAt <= nowSeconds()) {
		return tokenError("invalid_grant", "The Dashboard Icons session ended. Sign in again.")
	}
	const remainingSeconds = expiresAt - nowSeconds()
	const accessTtl = Math.min(ACCESS_TOKEN_TTL_SECONDS, remainingSeconds)
	const refreshTtl = Math.min(REFRESH_TOKEN_TTL_SECONDS, remainingSeconds)
	const accessToken = seal(
		ctx.secret,
		"access",
		{
			sub: grant.user.id,
			username: grant.user.username,
			admin: grant.user.admin,
			scope: grant.scope,
			aud: grant.resource,
			cid: grant.cid,
			pb_token: grant.pbToken,
		},
		accessTtl,
	)
	const refreshToken = seal(
		ctx.secret,
		"refresh",
		{ jti: randomUUID(), sub: grant.user.id, cid: grant.cid, scope: grant.scope, resource: grant.resource, pb_token: grant.pbToken },
		refreshTtl,
	)
	return {
		status: 200,
		body: {
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: accessTtl,
			refresh_token: refreshToken,
			scope: grant.scope,
		},
	}
}

function resourceError(requested: string | undefined, granted: string, ctx: TokenContext): TokenResult | null {
	if (requested !== undefined && canonicalResource(requested) !== granted) {
		return tokenError("invalid_target", "The resource does not match the authorization grant.")
	}
	if (granted !== mcpResourceUrl(ctx.issuer)) return tokenError("invalid_target", "The grant was issued for a different resource.")
	return null
}

async function exchangeAuthorizationCode(params: Record<string, string>, ctx: TokenContext): Promise<TokenResult> {
	const { code, client_id: clientId, code_verifier: verifier } = params
	if (!code || !clientId || !verifier) return tokenError("invalid_request", "code, client_id and code_verifier are required.")
	const grant = readGrant(ctx, "code", code, codeSchema)
	if (!grant) return tokenError("invalid_grant", "The authorization code is invalid or expired.")
	const consumption = await consumeGrant("code", grant.jti, grant.expiresAt)
	if (consumption === "unavailable")
		return tokenError("temporarily_unavailable", "Sign-in is temporarily unavailable. Try again shortly.", 503)
	if (consumption === "replayed") {
		return tokenError("invalid_grant", "The authorization code was already used.")
	}
	if (grant.cid !== clientFingerprint(clientId)) return tokenError("invalid_grant", "The authorization code was issued to another client.")
	if (params.redirect_uri !== undefined && params.redirect_uri !== grant.redirect_uri) {
		return tokenError("invalid_grant", "The redirect_uri does not match the authorization request.")
	}
	if (!verifyPkce(verifier, grant.code_challenge))
		return tokenError("invalid_grant", "The code_verifier does not match the code_challenge.")
	const mismatch = resourceError(params.resource, grant.resource, ctx)
	if (mismatch) return mismatch
	if (grant.expiresAt <= nowSeconds()) return tokenError("invalid_grant", "The authorization code is invalid or expired.")
	return issueTokens(ctx, {
		user: grant.user,
		pbToken: grant.pb_token,
		cid: grant.cid,
		scope: grant.scope,
		resource: grant.resource,
	})
}

async function exchangeRefreshToken(params: Record<string, string>, ctx: TokenContext): Promise<TokenResult> {
	const { refresh_token: refreshToken, client_id: clientId } = params
	if (!refreshToken || !clientId) return tokenError("invalid_request", "refresh_token and client_id are required.")
	const grant = readGrant(ctx, "refresh", refreshToken, refreshSchema)
	if (!grant) return tokenError("invalid_grant", "The refresh token is invalid or expired.")
	if (grant.cid !== clientFingerprint(clientId)) return tokenError("invalid_grant", "The refresh token was issued to another client.")
	const granted = grant.scope.split(" ")
	const scope = parseScope(params.scope ?? grant.scope)
	if (!scope || !scope.split(" ").every((value) => granted.includes(value))) {
		return tokenError("invalid_scope", "The requested scope exceeds the original grant.")
	}
	const mismatch = resourceError(params.resource, grant.resource, ctx)
	if (mismatch) return mismatch

	const session = await refreshPocketBaseSession(grant.pb_token)
	if (!session.ok && session.reason === "invalid") return tokenError("invalid_grant", "The Dashboard Icons session ended. Sign in again.")
	if (!session.ok) return tokenError("temporarily_unavailable", "Sign-in is temporarily unavailable. Try again shortly.", 503)
	if (grant.expiresAt <= nowSeconds()) return tokenError("invalid_grant", "The refresh token is invalid or expired.")
	const consumption = await consumeGrant("refresh", grant.jti, grant.expiresAt)
	if (consumption === "unavailable")
		return tokenError("temporarily_unavailable", "Sign-in is temporarily unavailable. Try again shortly.", 503)
	if (consumption === "replayed") {
		return tokenError("invalid_grant", "The refresh token was already used.")
	}
	if (grant.expiresAt <= nowSeconds()) return tokenError("invalid_grant", "The refresh token is invalid or expired.")
	return issueTokens(ctx, { user: session.user, pbToken: session.token, cid: grant.cid, scope, resource: grant.resource })
}

export async function exchangeToken(params: Record<string, string>, ctx: TokenContext): Promise<TokenResult> {
	if (params.grant_type === "authorization_code") return exchangeAuthorizationCode(params, ctx)
	if (params.grant_type === "refresh_token") return exchangeRefreshToken(params, ctx)
	if (!params.grant_type) return tokenError("invalid_request", "grant_type is required.")
	return tokenError("unsupported_grant_type", "Only authorization_code and refresh_token grants are supported.")
}
