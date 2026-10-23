import type { AuthInfo } from "@modelcontextprotocol/server"
import {
	createMcpHandler,
	isJsonContentType,
	isLegacyRequest,
	WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server"
import { createDashboardIconsServer } from "@/mcp/server"

function reportError(error: unknown): void {
	if (process.env.MCP_VERBOSE_LOGS === "true") console.error("[mcp]", error)
}

function jsonRpcError(status: number, code: number, message: string): Response {
	return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status })
}

const modernHandler = createMcpHandler(({ authInfo }) => createDashboardIconsServer(authInfo), {
	legacy: "reject",
	onerror: reportError,
})

const publicModernHandler = createMcpHandler(() => createDashboardIconsServer(undefined, true), {
	legacy: "reject",
	onerror: reportError,
})

// 2025-era clients are served statelessly in JSON mode so the response headers are built after
// the handlers run, which lets @posthog/mcp return its session token in `Mcp-Session-Id`.
async function handleLegacyRequest(req: Request, authInfo: AuthInfo | undefined, publicOnly: boolean): Promise<Response> {
	if (req.method.toUpperCase() !== "POST") return jsonRpcError(405, -32000, "Method not allowed.")
	try {
		const server = createDashboardIconsServer(authInfo, publicOnly)
		const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
		await server.connect(transport)
		const teardown = () => Promise.allSettled([transport.close(), server.close()])
		req.signal.addEventListener("abort", teardown, { once: true })
		try {
			return await transport.handleRequest(req, { authInfo })
		} finally {
			await teardown()
		}
	} catch (error) {
		reportError(error)
		return jsonRpcError(500, -32603, "Internal server error")
	}
}

export async function handleMcpRequest(req: Request, authInfo?: AuthInfo, publicOnly = false): Promise<Response> {
	if (publicOnly) authInfo = undefined
	if (req.method.toUpperCase() === "POST" && !isJsonContentType(req.headers.get("content-type"))) {
		return jsonRpcError(415, -32000, "Unsupported Media Type: Content-Type must be application/json")
	}
	if (await isLegacyRequest(req)) return handleLegacyRequest(req, authInfo, publicOnly)
	if (publicOnly) return publicModernHandler.fetch(req)
	return modernHandler.fetch(req, { authInfo })
}
