import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"
import { flushDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { createDashboardIconsMcpHandler } from "@/mcp/handler"

export const runtime = "nodejs"
export const maxDuration = 30

const mcpHandler = createDashboardIconsMcpHandler()
const SECURITY_HEADERS = {
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
}

function tooManyRequests(retryAfter: number): NextResponse {
	return new NextResponse("Too Many Requests", {
		status: 429,
		headers: { ...SECURITY_HEADERS, "Retry-After": String(retryAfter) },
	})
}

function applySecurityHeaders(response: Response): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(name, value)
	}
}

async function isToolCallRequest(req: NextRequest): Promise<boolean> {
	try {
		const body = (await req.clone().json()) as { method?: string }
		return body.method === "tools/call"
	} catch {
		return false
	}
}

async function readBoundedPostRequest(req: NextRequest): Promise<NextRequest | null> {
	const declaredLength = Number(req.headers.get("content-length") ?? 0)
	if (declaredLength > MAX_REQUEST_BODY_BYTES) return null
	if (!req.body) return req

	const reader = req.body.getReader()
	const chunks: Uint8Array[] = []
	let totalBytes = 0

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		totalBytes += value.byteLength
		if (totalBytes > MAX_REQUEST_BODY_BYTES) {
			await reader.cancel()
			return null
		}
		chunks.push(value)
	}

	const body = new Uint8Array(totalBytes)
	let offset = 0
	for (const chunk of chunks) {
		body.set(chunk, offset)
		offset += chunk.byteLength
	}

	const headers = new Headers(req.headers)
	headers.set("content-length", String(totalBytes))
	return new NextRequest(req.url, { method: req.method, headers, body })
}

async function guardedHandler(req: NextRequest) {
	const ip = getClientIp(req.headers)

	const requestLimit = checkRateLimit(ip, "request")
	if (!requestLimit.allowed) {
		return tooManyRequests(requestLimit.retryAfter ?? 60)
	}

	if (req.method === "POST") {
		const boundedRequest = await readBoundedPostRequest(req)
		if (!boundedRequest) {
			return new NextResponse("Payload Too Large", { status: 413 })
		}
		req = boundedRequest

		if (await isToolCallRequest(req)) {
			const toolLimit = checkRateLimit(ip, "tool")
			if (!toolLimit.allowed) {
				return tooManyRequests(toolLimit.retryAfter ?? 60)
			}
		}
	}

	let response: Response
	try {
		response = await mcpHandler(req)
	} finally {
		await flushDashboardIconsMcpAnalytics()
	}
	applySecurityHeaders(response)
	return response
}

export const GET = guardedHandler
export const POST = guardedHandler
