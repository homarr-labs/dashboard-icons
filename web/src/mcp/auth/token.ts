import { z } from "zod"
import { clientFingerprint } from "./clients"
import {
	ACCESS_TOKEN_TTL_SECONDS,
	CODE_TTL_SECONDS,
	canonicalResource,
	mcpResourceUrl,
	parseScope,
	REFRESH_TOKEN_TTL_SECONDS,
} from "./config"
import { verifyPkce } from "./pkce"
import { type McpUser, refreshPocketBaseSession } from "./pocketbase"
import { createReplayGuard } from "./replay"
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

const MAX_TRACKED_CODES = 10_000
const usedCodes = createReplayGuard(MAX_TRACKED_CODES)

type Grant = { user: McpUser; pbToken: string; cid: string; scope: string; resource: string }

function readGrant<T>(ctx: TokenContext, purpose: SealPurpose, token: string, schema: z.ZodType<T>): T | null {
	const unsealed = unseal(ctx.secret, purpose, token)
	if (!unsealed.ok) return null
	const parsed = schema.safeParse(unsealed.data)
	if (!parsed.success) return null
	return parsed.data
}

function tokenError(error: TokenErrorCode, description: string, status: 400 | 503 = 400): TokenResult {
	return { status, body: { error, error_description: description } }
}

function issueTokens(ctx: TokenContext, grant: Grant): TokenResult {
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
		ACCESS_TOKEN_TTL_SECONDS,
	)
	const refreshToken = seal(
		ctx.secret,
		"refresh",
		{ sub: grant.user.id, cid: grant.cid, scope: grant.scope, resource: grant.resource, pb_token: grant.pbToken },
		REFRESH_TOKEN_TTL_SECONDS,
	)
	return {
		status: 200,
		body: {
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: ACCESS_TOKEN_TTL_SECONDS,
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

function exchangeAuthorizationCode(params: Record<string, string>, ctx: TokenContext): TokenResult {
	const { code, client_id: clientId, code_verifier: verifier } = params
	if (!code || !clientId || !verifier) return tokenError("invalid_request", "code, client_id and code_verifier are required.")
	const grant = readGrant(ctx, "code", code, codeSchema)
	if (!grant) return tokenError("invalid_grant", "The authorization code is invalid or expired.")
	if (!usedCodes.consume(grant.jti, Date.now() + CODE_TTL_SECONDS * 1000)) {
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
	return issueTokens(ctx, { user: session.user, pbToken: session.token, cid: grant.cid, scope, resource: grant.resource })
}

export async function exchangeToken(params: Record<string, string>, ctx: TokenContext): Promise<TokenResult> {
	if (params.grant_type === "authorization_code") return exchangeAuthorizationCode(params, ctx)
	if (params.grant_type === "refresh_token") return exchangeRefreshToken(params, ctx)
	if (!params.grant_type) return tokenError("invalid_request", "grant_type is required.")
	return tokenError("unsupported_grant_type", "Only authorization_code and refresh_token grants are supported.")
}
