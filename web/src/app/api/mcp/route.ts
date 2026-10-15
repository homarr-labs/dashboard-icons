import { type AuthInfo, OAuthError } from "@modelcontextprotocol/server"
import { after, NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import { flushDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { mcpAuthChallenge, verifyMcpBearer } from "@/mcp/auth"
import { handleMcpRequest } from "@/mcp/http"
import { isAccountTool } from "@/mcp/tools"

export const runtime = "nodejs"
export const maxDuration = 30

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

async function readToolCall(req: NextRequest): Promise<ToolCall | null> {
	try {
		const body = (await req.clone().json()) as { method?: unknown; params?: { name?: unknown } }
		if (body.method !== "tools/call") return null
		return { name: body.params?.name }
	} catch {
		return null
	}
}

async function readBoundedPostRequest(req: NextRequest): Promise<NextRequest | null> {
	const body = await readBoundedBytes(req, MAX_REQUEST_BODY_BYTES)
	if (body === null) return null
	if (!req.body) return req

	const headers = new Headers(req.headers)
	headers.set("content-length", String(body.byteLength))
	return new NextRequest(req.url, { method: req.method, headers, body })
}

async function authenticate(req: NextRequest, toolCall: ToolCall | null): Promise<AuthInfo | Response | null | undefined> {
	let authInfo: AuthInfo | undefined
	try {
		authInfo = await verifyMcpBearer(req)
	} catch (error) {
		if (!(error instanceof OAuthError)) throw error
		return mcpAuthChallenge(req, { error: "invalid_token", description: error.message })
	}
	if (authInfo || typeof toolCall?.name !== "string" || !isAccountTool(toolCall.name)) return authInfo
	return mcpAuthChallenge(req)
}

async function guardedHandler(req: NextRequest) {
	const ip = getClientIp(req.headers)

	const requestLimit = checkRateLimit(ip, "request")
	if (!requestLimit.allowed) {
		return tooManyRequests(requestLimit.retryAfter ?? 60)
	}

	let toolCall: ToolCall | null = null
	if (req.method === "POST") {
		const boundedRequest = await readBoundedPostRequest(req)
		if (!boundedRequest) {
			return new NextResponse("Payload Too Large", { status: 413 })
		}
		req = boundedRequest

		toolCall = await readToolCall(req)
		if (toolCall) {
			const toolLimit = checkRateLimit(ip, "tool")
			if (!toolLimit.allowed) {
				return tooManyRequests(toolLimit.retryAfter ?? 60)
			}
		}
	}

	const auth = await authenticate(req, toolCall)
	if (auth instanceof Response) return withResponseHeaders(auth)

	after(flushDashboardIconsMcpAnalytics)
	return withResponseHeaders(await handleMcpRequest(req, auth ?? undefined))
}

export const GET = guardedHandler
export const POST = guardedHandler
