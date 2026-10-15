import { randomUUID } from "node:crypto"
import { z } from "zod"
import { clientFingerprint, readClient } from "./clients"
import { CODE_TTL_SECONDS, canonicalResource, getMcpAuthConfig, mcpResourceUrl, parseScope, resolveIssuer } from "./config"
import { isValidCodeChallenge } from "./pkce"
import { refreshPocketBaseSession } from "./pocketbase"
import { redirectUriLabel, redirectUriMatches } from "./redirect-uri"
import { seal } from "./seal"

const PARAM_NAMES = [
	"response_type",
	"client_id",
	"redirect_uri",
	"state",
	"scope",
	"code_challenge",
	"code_challenge_method",
	"resource",
] as const

type AuthorizeParams = Partial<Record<(typeof PARAM_NAMES)[number], string>>

export type AuthorizeContext = { secret: Buffer; issuer: string }

export type ValidAuthorizeRequest = {
	clientId: string
	clientName: string
	redirectUri: string
	redirectHost: string
	state?: string
	codeChallenge: string
	scope: string
	resource: string
	params: Record<string, string>
}

export type AuthorizeValidation =
	| { kind: "invalid"; error: string; description: string }
	| { kind: "redirect"; redirectTo: string }
	| { kind: "valid"; request: ValidAuthorizeRequest }

export type ApprovalResult =
	| { status: 200; body: { redirectTo: string } }
	| { status: 400 | 401 | 503; body: { error: string; error_description: string } }

const approvalSchema = z.object({
	params: z.record(z.string(), z.unknown()),
	pbToken: z.string().min(1).max(4096).optional(),
	deny: z.boolean().optional(),
})

function pickParams(input: Record<string, unknown>): AuthorizeParams | null {
	const params: AuthorizeParams = {}
	for (const name of PARAM_NAMES) {
		const value = input[name]
		if (value === undefined) continue
		if (typeof value !== "string") return null
		params[name] = value
	}
	return params
}

export function buildRedirect(redirectUri: string, values: Record<string, string | undefined>): string {
	const url = new URL(redirectUri)
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined) url.searchParams.set(key, value)
	}
	return url.toString()
}

function invalid(error: string, description: string): AuthorizeValidation {
	return { kind: "invalid", error, description }
}

export function validateAuthorizeRequest(input: Record<string, unknown>, ctx: AuthorizeContext): AuthorizeValidation {
	const params = pickParams(input)
	if (!params) return invalid("invalid_request", "Each authorization parameter must be sent exactly once.")
	if (!params.client_id) return invalid("invalid_request", "The client_id parameter is missing.")
	const client = readClient(ctx.secret, params.client_id)
	if (!client) return invalid("invalid_client", "This app registration is unknown or no longer valid. Reconnect from your MCP client.")
	const redirectUri = params.redirect_uri
	if (!redirectUri || !redirectUriMatches(client.redirectUris, redirectUri)) {
		return invalid("invalid_request", "The redirect_uri is missing or is not registered for this app.")
	}

	const fail = (error: string, description: string): AuthorizeValidation => ({
		kind: "redirect",
		redirectTo: buildRedirect(redirectUri, { error, error_description: description, state: params.state, iss: ctx.issuer }),
	})

	if (params.response_type !== "code") return fail("unsupported_response_type", "Only response_type=code is supported.")
	if (!params.code_challenge || !isValidCodeChallenge(params.code_challenge) || params.code_challenge_method !== "S256") {
		return fail("invalid_request", "PKCE with code_challenge_method=S256 is required.")
	}
	const resource = mcpResourceUrl(ctx.issuer)
	if (params.resource !== undefined && canonicalResource(params.resource) !== resource) {
		return fail("invalid_target", `The resource parameter must be ${resource}.`)
	}
	const scope = parseScope(params.scope)
	if (!scope) return fail("invalid_scope", "Only the account scope is supported.")

	return {
		kind: "valid",
		request: {
			clientId: client.id,
			clientName: client.name,
			redirectUri,
			redirectHost: redirectUriLabel(redirectUri),
			state: params.state,
			codeChallenge: params.code_challenge,
			scope,
			resource,
			params: Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)),
		},
	}
}

export function resolveAuthorizePage(
	input: Record<string, unknown>,
	headers: Pick<Headers, "get">,
): AuthorizeValidation | { kind: "disabled" } {
	const config = getMcpAuthConfig()
	if (!config) return { kind: "disabled" }
	return validateAuthorizeRequest(input, { secret: config.secret, issuer: resolveIssuer(headers, "http://localhost") })
}

function approvalError(status: 400 | 401 | 503, error: string, description: string): ApprovalResult {
	return { status, body: { error, error_description: description } }
}

export async function approveAuthorization(input: unknown, ctx: AuthorizeContext): Promise<ApprovalResult> {
	const parsed = approvalSchema.safeParse(input)
	if (!parsed.success) return approvalError(400, "invalid_request", "The approval request is malformed.")
	const validation = validateAuthorizeRequest(parsed.data.params, ctx)
	if (validation.kind === "invalid") return approvalError(400, validation.error, validation.description)
	if (validation.kind === "redirect") return { status: 200, body: { redirectTo: validation.redirectTo } }

	const request = validation.request
	if (parsed.data.deny) {
		const redirectTo = buildRedirect(request.redirectUri, {
			error: "access_denied",
			error_description: "The user denied access.",
			state: request.state,
			iss: ctx.issuer,
		})
		return { status: 200, body: { redirectTo } }
	}
	if (!parsed.data.pbToken) return approvalError(401, "login_required", "Sign in to approve this app.")

	const session = await refreshPocketBaseSession(parsed.data.pbToken)
	if (!session.ok && session.reason === "invalid") return approvalError(401, "login_required", "Your session expired. Sign in again.")
	if (!session.ok) return approvalError(503, "temporarily_unavailable", "Sign-in is temporarily unavailable. Try again shortly.")

	const code = seal(
		ctx.secret,
		"code",
		{
			jti: randomUUID(),
			cid: clientFingerprint(request.clientId),
			redirect_uri: request.redirectUri,
			code_challenge: request.codeChallenge,
			resource: request.resource,
			scope: request.scope,
			user: session.user,
			pb_token: session.token,
		},
		CODE_TTL_SECONDS,
	)
	return { status: 200, body: { redirectTo: buildRedirect(request.redirectUri, { code, state: request.state, iss: ctx.issuer }) } }
}
