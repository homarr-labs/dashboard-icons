import type { AuthInfo } from "@modelcontextprotocol/server"
import { decodeSessionId } from "@posthog/mcp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type CapturedEvent = { distinctId: string; event: string; properties: Record<string, unknown> }

const { captured } = vi.hoisted(() => ({ captured: [] as CapturedEvent[] }))

vi.mock("@posthog/mcp", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@posthog/mcp")>()
	return {
		...actual,
		PostHog: vi.fn(function FakePostHog() {
			return {
				capture: (message: CapturedEvent) => captured.push(message),
				flush: vi.fn(async () => {}),
			}
		}),
	}
})

vi.mock("@/lib/icons/service", () => ({
	searchIcons: vi.fn(async () => ({ results: [{ name: "plex", aliases: [], categories: [], score: 1 }], total: 1 })),
	getIconByName: vi.fn(async (name: string) => ({ name, urls: { svg: `https://cdn/${name}.svg` } })),
	getIconUrl: vi.fn(async () => null),
	suggestIcons: vi.fn(async () => ({ suggestions: [] })),
}))

vi.mock("@/constants", () => ({ WEB_URL: "https://dashboardicons.com" }))

const CLIENT_IP = "203.0.113.7"
const LEGACY_VERSION = "2025-11-25"
const MODERN_VERSION = "2026-07-28"
const INTENT = "Finding an icon so the user can add a media server tile to their homelab dashboard."

type RpcResponse = {
	result?: { content?: { type: string; text: string }[]; isError?: boolean; tools?: { name: string }[]; serverInfo?: { name: string } }
	error?: unknown
}

function post(body: unknown, headers: Record<string, string> = {}, signal?: AbortSignal) {
	return new Request("http://localhost/api/mcp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			"x-forwarded-for": CLIENT_IP,
			...headers,
		},
		body: JSON.stringify(body),
		signal,
	})
}

function modernRequest(id: number, method: string, params: Record<string, unknown>, name?: string) {
	const headers: Record<string, string> = { "mcp-protocol-version": MODERN_VERSION, "mcp-method": method }
	if (name) headers["mcp-name"] = name
	return post(
		{
			jsonrpc: "2.0",
			id,
			method,
			params: {
				...params,
				_meta: {
					"io.modelcontextprotocol/protocolVersion": MODERN_VERSION,
					"io.modelcontextprotocol/clientInfo": { name: "modern-client", version: "2.0.0" },
					"io.modelcontextprotocol/clientCapabilities": {},
				},
			},
		},
		headers,
	)
}

async function rpc(response: Response): Promise<RpcResponse> {
	expect(response.status).toBe(200)
	expect(response.headers.get("content-type")).toContain("application/json")
	return (await response.json()) as RpcResponse
}

function conversationIdFrom(result: RpcResponse): string {
	const block = result.result?.content?.find((item) => item.text.includes("conversation_id"))
	expect(block).toBeDefined()
	return (JSON.parse(block?.text ?? "{}") as { conversation_id: string }).conversation_id
}

async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 10))
}

function toolCalls(): CapturedEvent[] {
	return captured.filter((event) => event.event === "$mcp_tool_call")
}

async function importHttp() {
	return import("@/mcp/http")
}

describe("MCP over HTTP (real wiring)", () => {
	beforeEach(() => {
		vi.resetModules()
		captured.length = 0
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		vi.stubEnv("NEXT_PUBLIC_DISABLE_POSTHOG", "false")
		vi.stubEnv("MCP_SERVER_BUILD", "abc123")
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("keeps a 2025-era connection in one session through the Mcp-Session-Id token", async () => {
		const { handleMcpRequest } = await importHttp()

		const initResponse = await handleMcpRequest(
			post({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: { protocolVersion: LEGACY_VERSION, capabilities: {}, clientInfo: { name: "legacy-client", version: "1.2.3" } },
			}),
		)
		const sessionHeader = initResponse.headers.get("mcp-session-id")
		const init = await rpc(initResponse)
		expect(init.result?.serverInfo?.name).toBe("dashboard-icons")
		expect(sessionHeader).toBeTruthy()
		const token = decodeSessionId(sessionHeader)
		expect(token).toMatchObject({ clientName: "legacy-client", clientVersion: "1.2.3" })

		const session = { "mcp-session-id": sessionHeader as string, "mcp-protocol-version": LEGACY_VERSION }
		const initialized = await handleMcpRequest(post({ jsonrpc: "2.0", method: "notifications/initialized" }, session))
		expect(initialized.status).toBe(202)

		const list = await rpc(await handleMcpRequest(post({ jsonrpc: "2.0", id: 2, method: "tools/list" }, session)))
		expect(list.result?.tools?.map((tool) => tool.name)).toEqual(
			expect.arrayContaining(["search_icons", "get_icon", "get_icon_url", "suggest_icon", "get_more_tools"]),
		)

		const call = await rpc(
			await handleMcpRequest(
				post(
					{
						jsonrpc: "2.0",
						id: 3,
						method: "tools/call",
						params: { name: "search_icons", arguments: { query: "plex", context: INTENT, llm_model: "claude-test-1" } },
					},
					session,
				),
			),
		)
		expect(call.result?.isError).toBeUndefined()
		expect(JSON.parse(call.result?.content?.[0]?.text ?? "{}")).toMatchObject({ total: 1 })
		await settle()

		expect(captured.some((event) => event.event === "$mcp_tools_list")).toBe(false)
		const [toolCall] = toolCalls()
		expect(toolCall?.properties).toMatchObject({
			$session_id: token?.sessionId,
			$mcp_client_name: "legacy-client",
			$mcp_client_version: "1.2.3",
			$mcp_tool_name: "search_icons",
			$mcp_intent: INTENT,
			$mcp_intent_source: "context_parameter",
			$mcp_llm_model: "claude-test-1",
			$mcp_server_build: "abc123",
			$ip: CLIENT_IP,
		})
		expect(toolCall?.distinctId).toBe(token?.sessionId)
	})

	it("correlates 2026-07-28 calls through the conversation_id handle", async () => {
		const { handleMcpRequest } = await importHttp()

		const list = await rpc(await handleMcpRequest(modernRequest(1, "tools/list", {})))
		expect(list.result?.tools?.map((tool) => tool.name)).toContain("search_icons")

		const first = await rpc(
			await handleMcpRequest(
				modernRequest(2, "tools/call", { name: "search_icons", arguments: { query: "plex", context: INTENT } }, "search_icons"),
			),
		)
		const conversationId = conversationIdFrom(first)

		const second = await rpc(
			await handleMcpRequest(
				modernRequest(
					3,
					"tools/call",
					{ name: "get_icon", arguments: { name: "plex", context: INTENT, conversation_id: conversationId } },
					"get_icon",
				),
			),
		)
		expect(JSON.parse(second.result?.content?.[0]?.text ?? "{}")).toMatchObject({ name: "plex" })
		await settle()

		const [searchCall, getCall] = toolCalls()
		expect(searchCall?.properties.$mcp_tool_name).toBe("search_icons")
		expect(getCall?.properties.$mcp_tool_name).toBe("get_icon")
		expect(getCall?.properties.$session_id).toBe(searchCall?.properties.$session_id)
		expect(getCall?.properties).toMatchObject({
			$mcp_conversation_id: conversationId,
			$mcp_client_name: "modern-client",
			$mcp_intent: INTENT,
			$ip: CLIENT_IP,
		})
	})

	it("identifies authenticated callers by their user id", async () => {
		const { handleMcpRequest } = await importHttp()
		const authInfo: AuthInfo = {
			token: "opaque",
			clientId: "client",
			scopes: [],
			extra: { userId: "user_123", username: "iconfan", admin: false },
		}

		await rpc(
			await handleMcpRequest(
				post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_icons", arguments: { query: "plex" } } }),
				authInfo,
			),
		)
		await settle()

		const [toolCall] = toolCalls()
		expect(toolCall?.distinctId).toBe("user_123")
		expect(toolCall?.properties.$set).toMatchObject({ username: "iconfan", admin: false })
		expect(captured.some((event) => event.event === "$identify" && event.distinctId === "user_123")).toBe(true)
	})

	it("reports missing capabilities through get_more_tools", async () => {
		const { handleMcpRequest } = await importHttp()

		await rpc(
			await handleMcpRequest(
				post({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: { name: "get_more_tools", arguments: { context: "Needs a tool that recolors an SVG icon." } },
				}),
			),
		)
		await settle()

		expect(captured.find((event) => event.event === "$mcp_missing_capability")?.properties.$mcp_intent).toBe(
			"Needs a tool that recolors an SVG icon.",
		)
	})

	it("rejects 2025-era session operations and non-JSON bodies like the SDK entry", async () => {
		const { handleMcpRequest } = await importHttp()

		const get = await handleMcpRequest(new Request("http://localhost/api/mcp", { method: "GET" }))
		expect(get.status).toBe(405)
		expect(await get.json()).toMatchObject({ error: { code: -32000, message: "Method not allowed." } })

		const text = await handleMcpRequest(new Request("http://localhost/api/mcp", { method: "POST", body: "{}" }))
		expect(text.status).toBe(415)

		const invalid = await handleMcpRequest(
			new Request("http://localhost/api/mcp", {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
				body: "not-json",
			}),
		)
		expect(invalid.status).toBe(400)
	})
})
