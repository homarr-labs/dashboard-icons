import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createDashboardIconsServer, respond, transports } = vi.hoisted(() => ({
	createDashboardIconsServer: vi.fn(),
	respond: vi.fn(async (_req: Request) => new Response(null, { status: 202 })),
	transports: [] as { handleRequest: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }[],
}))

vi.mock("@/mcp/server", () => ({ createDashboardIconsServer }))

vi.mock("@modelcontextprotocol/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("@modelcontextprotocol/server")>()),
	WebStandardStreamableHTTPServerTransport: vi.fn(function FakeTransport() {
		const transport = {
			handleRequest: vi.fn((req: Request) => respond(req)),
			close: vi.fn(async () => {}),
		}
		transports.push(transport)
		return transport
	}),
}))

function fakeServer() {
	return { connect: vi.fn(async () => {}), close: vi.fn(async () => {}) }
}

function legacyPost(signal?: AbortSignal) {
	return new Request("http://localhost/api/mcp", {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		signal,
	})
}

describe("handleMcpRequest legacy leg", () => {
	beforeEach(() => {
		vi.resetModules()
		transports.length = 0
		createDashboardIconsServer.mockReset()
		respond.mockClear()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it("serves one request per server in JSON mode, passes auth info and tears down", async () => {
		const server = fakeServer()
		createDashboardIconsServer.mockReturnValue(server)
		const { WebStandardStreamableHTTPServerTransport } = await import("@modelcontextprotocol/server")
		const { handleMcpRequest } = await import("@/mcp/http")
		const authInfo = { token: "t", clientId: "c", scopes: [] }
		const request = legacyPost()

		const response = await handleMcpRequest(request, authInfo)

		expect(response.status).toBe(202)
		expect(createDashboardIconsServer).toHaveBeenCalledWith(authInfo)
		expect(WebStandardStreamableHTTPServerTransport).toHaveBeenCalledWith({ sessionIdGenerator: undefined, enableJsonResponse: true })
		expect(server.connect).toHaveBeenCalledWith(transports[0])
		expect(transports[0]?.handleRequest).toHaveBeenCalledWith(request, { authInfo })
		expect(transports[0]?.close).toHaveBeenCalled()
		expect(server.close).toHaveBeenCalled()
	})

	it("tears down when the client aborts mid-request", async () => {
		const server = fakeServer()
		createDashboardIconsServer.mockReturnValue(server)
		const { handleMcpRequest } = await import("@/mcp/http")
		const controller = new AbortController()
		let release: () => void = () => {}
		const pending = new Promise<void>((resolve) => {
			release = resolve
		})
		respond.mockImplementationOnce(async () => {
			await pending
			return new Response(null, { status: 202 })
		})
		const responding = handleMcpRequest(legacyPost(controller.signal))
		await vi.waitFor(() => expect(respond).toHaveBeenCalled())

		controller.abort()

		expect(server.close).toHaveBeenCalledTimes(1)
		release()
		await responding
	})

	it("answers 500 when the server cannot be built and logs only when verbose", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		createDashboardIconsServer.mockImplementation(() => {
			throw new Error("boom")
		})
		const { handleMcpRequest } = await import("@/mcp/http")

		const quiet = await handleMcpRequest(legacyPost())
		expect(quiet.status).toBe(500)
		expect(await quiet.json()).toEqual({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null })
		expect(error).not.toHaveBeenCalled()

		vi.stubEnv("MCP_VERBOSE_LOGS", "true")
		await handleMcpRequest(legacyPost())
		expect(error).toHaveBeenCalledWith("[mcp]", expect.any(Error))
	})
})
