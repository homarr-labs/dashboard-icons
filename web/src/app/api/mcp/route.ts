import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/icons/rate-limit"
import { MAX_REQUEST_BODY_BYTES } from "@/lib/icons/validate"
import { flushDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { createDashboardIconsMcpHandler } from "@/mcp/handler"

export const runtime = "nodejs"
export const maxDuration = 30

const mcpHandler = createDashboardIconsMcpHandler()

async function isToolCallRequest(req: NextRequest): Promise<boolean> {
	try {
		const body = (await req.clone().json()) as { method?: string }
		return body.method === "tools/call"
	} catch {
		return false
	}
}

async function guardedHandler(req: NextRequest) {
	const ip = getClientIp(req.headers)

	const requestLimit = checkRateLimit(ip, "request")
	if (!requestLimit.allowed) {
		return new NextResponse("Too Many Requests", {
			status: 429,
			headers: {
				"Retry-After": String(requestLimit.retryAfter ?? 60),
				"Cache-Control": "no-store",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "DENY",
			},
		})
	}

	if (req.method === "POST") {
		const contentLength = Number(req.headers.get("content-length") ?? 0)
		if (contentLength > MAX_REQUEST_BODY_BYTES) {
			return new NextResponse("Payload Too Large", { status: 413 })
		}

		if (await isToolCallRequest(req)) {
			const toolLimit = checkRateLimit(ip, "tool")
			if (!toolLimit.allowed) {
				return new NextResponse("Too Many Requests", {
					status: 429,
					headers: {
						"Retry-After": String(toolLimit.retryAfter ?? 60),
						"Cache-Control": "no-store",
					},
				})
			}
		}
	}

	let response: Response
	try {
		response = await mcpHandler(req)
	} finally {
		await flushDashboardIconsMcpAnalytics()
	}
	response.headers.set("Cache-Control", "no-store")
	response.headers.set("X-Content-Type-Options", "nosniff")
	response.headers.set("X-Frame-Options", "DENY")
	return response
}

export const GET = guardedHandler
export const POST = guardedHandler
