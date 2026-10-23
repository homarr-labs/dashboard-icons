import { type AuthInfo, OAuthError } from "@modelcontextprotocol/server"
import { after, NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import { flushDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { mcpAuthChallenge, verifyMcpBearer } from "@/mcp/auth"
import { handleMcpRequest } from "@/mcp/http"
import { MAX_ACCOUNT_REQUEST_BODY_BYTES } from "@/mcp/limits"
import { isAccountTool } from "@/mcp/tools"

const RESPONSE_HEADERS = {
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Access-Control-Expose-Headers": "WWW-Authenticate",
}

type ToolCall = { name: unknown }

function tooManyRequests(retryAfter: number): NextResponse {
	return new NextResponse("Too Many Requests", {
		status: 429,
		headers: { ...RESPONSE_HEADERS, "Retry-After": String(retryAfter) },
	})
}

function withResponseHeaders(response: Response): Response {
	for (const [name, value] of Object.entries(RESPONSE_HEADERS)) {
		response.headers.set(name, value)
	}
	return response
}

async function readToolCalls(req: NextRequest): Promise<ToolCall[]> {
	try {
		const body: unknown = await req.clone().json()
		const messages = Array.isArray(body) ? body : [body]
		return messages.flatMap((message): ToolCall[] => {
			if (typeof message !== "object" || message === null || Array.isArray(message)) return []
			const rpc = message as { method?: unknown; params?: unknown }
			if (rpc.method !== "tools/call") return []
			const params =
				typeof rpc.params === "object" && rpc.params !== null && !Array.isArray(rpc.params) ? (rpc.params as { name?: unknown }) : undefined
			return [{ name: params?.name }]
		})
	} catch {
		return []
	}
}

async function readBoundedPostRequest(req: NextRequest, maxBytes: number): Promise<NextRequest | null> {
	const body = await readBoundedBytes(req, maxBytes)
	if (body === null) return null
	if (!req.body) return req

	const headers = new Headers(req.headers)
	headers.set("content-length", String(body.byteLength))
	return new NextRequest(req.url, { method: req.method, headers, body })
}

async function authenticate(req: NextRequest): Promise<AuthInfo | Response | null | undefined> {
	let authInfo: AuthInfo | undefined
	try {
		authInfo = await verifyMcpBearer(req)
	} catch (error) {
		if (!(error instanceof OAuthError)) throw error
		return mcpAuthChallenge(req, { error: "invalid_token", description: error.message })
	}
	return authInfo
}

export async function handleDashboardIconsMcpRoute(req: NextRequest, publicOnly = false) {
	const ip = getClientIp(req.headers)

	const requestLimit = checkRateLimit(ip, "request")
	if (!requestLimit.allowed) {
		return tooManyRequests(requestLimit.retryAfter ?? 60)
	}

	let auth: AuthInfo | null | undefined
	if (publicOnly) {
		if (req.headers.has("authorization")) {
			return withResponseHeaders(new NextResponse("This public icon endpoint does not accept Authorization.", { status: 400 }))
		}
	} else {
		const result = await authenticate(req)
		if (result instanceof Response) return withResponseHeaders(result)
		auth = result
	}
	let maxBytes = MAX_REQUEST_BODY_BYTES
	if (auth?.scopes.includes("account")) maxBytes = MAX_ACCOUNT_REQUEST_BODY_BYTES

	let toolCalls: ToolCall[] = []
	if (req.method === "POST") {
		const boundedRequest = await readBoundedPostRequest(req, maxBytes)
		if (!boundedRequest) {
			if (publicOnly) {
				return withResponseHeaders(
					new NextResponse("Payload Too Large: public calls allow at most 64 KiB of encoded JSON.", { status: 413 }),
				)
			}
			return withResponseHeaders(
				new NextResponse(
					`Payload Too Large: the complete encoded JSON request must be at most ${maxBytes / 1024} KiB. Signed-in account tool calls allow 512 KiB; each SVG allows 48 KiB.`,
					{ status: 413 },
				),
			)
		}
		req = boundedRequest

		toolCalls = await readToolCalls(req)
		const accountCall = toolCalls.some((call) => typeof call.name === "string" && isAccountTool(call.name))
		if (!accountCall && Number(req.headers.get("content-length")) > MAX_REQUEST_BODY_BYTES) {
			return withResponseHeaders(new NextResponse("Payload Too Large: public calls allow at most 64 KiB of encoded JSON.", { status: 413 }))
		}
		for (const _call of toolCalls) {
			const toolLimit = checkRateLimit(ip, "tool")
			if (!toolLimit.allowed) {
				return tooManyRequests(toolLimit.retryAfter ?? 60)
			}
		}
		if (accountCall && !auth && !publicOnly) {
			const challenge = mcpAuthChallenge(req)
			if (challenge) return withResponseHeaders(challenge)
		}
	}

	if (publicOnly) return withResponseHeaders(await handleMcpRequest(req, undefined, true))
	after(flushDashboardIconsMcpAnalytics)
	return withResponseHeaders(await handleMcpRequest(req, auth ?? undefined))
}
