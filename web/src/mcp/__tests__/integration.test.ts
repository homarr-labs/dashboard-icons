import type { AuthInfo } from "@modelcontextprotocol/server"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv"
import { decodeSessionId } from "@posthog/mcp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ExternalIconRecord, Icon, IconFile } from "@/types/icons"

type CapturedEvent = { distinctId: string; event: string; properties: Record<string, unknown> }

const { captured, submissionWrites } = vi.hoisted(() => ({
	captured: [] as CapturedEvent[],
	submissionWrites: [] as Record<string, unknown>[],
}))

function nativeIcon(overrides: Partial<Icon> = {}): Icon {
	return {
		base: "svg",
		aliases: [],
		categories: [],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "alice" } },
		...overrides,
	}
}

const NATIVE_ICONS: IconFile = {
	plex: nativeIcon({ aliases: ["Plex Media Server"], categories: ["Media"], colors: { dark: "plex-dark" } }),
	lmstudio: nativeIcon({ aliases: ["LM Studio"], categories: ["AI"] }),
	ntopng: nativeIcon({ base: "png", categories: ["Network"] }),
}

const EXTERNAL_ICONS: ExternalIconRecord[] = [
	{
		source: "selfhst",
		slug: "qbitrr",
		name: "qBitrr",
		external: {
			id: "selfhst-qbitrr",
			source: "selfhst",
			slug: "qbitrr",
			name: "qBitrr",
			aliases: [],
			categories: ["Downloads"],
			formats: ["svg", "png"],
			variants: {},
			url_templates: {
				svg: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/{slug}.svg",
				png: "https://cdn.jsdelivr.net/gh/selfhst/icons/png/{slug}.png",
			},
			license: "CC BY 4.0",
			attribution: "selfh.st",
			source_url: "https://selfh.st/icons/",
		},
		data: { base: "svg", aliases: [], categories: ["Downloads"], update: { timestamp: "2023-01-01T00:00:00Z", author: { id: "selfhst" } } },
	},
]

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

vi.mock("@/lib/pb", () => ({
	createServerPB: () => ({
		authStore: { save: () => {} },
		filter: (expression: string) => expression,
		send: async (_path: string, options: { query: { name: string } }) => ({
			kind: "published",
			name: options.query.name,
			id: "",
			revision: "rev-1",
			updated: "",
			status: "published",
			metadata: { base: "svg", aliases: ["Plex Media"], categories: ["Media"] },
			files: { base: `${options.query.name}.svg`, light: `${options.query.name}-light.svg` },
			source: { commit: "a".repeat(40), blobs: {} },
		}),
		collection: () => ({
			authRefresh: async () => ({ token: "pb-fresh-secret", record: { id: "user_123", username: "iconfan", admin: false } }),
			create: async (body: Record<string, unknown>) => {
				submissionWrites.push(body)
				return { id: "rec1", name: body.name, status: "pending" }
			},
			getFullList: async () => [],
			getList: async () => ({
				items: [{ id: "rec1", name: "my-app", status: "pending", admin_comment: "", created: "2026-10-15", updated: "2026-10-15" }],
				totalItems: 1,
			}),
		}),
	}),
}))
vi.mock("@/lib/icons/service", () => ({ getAllIcons: async () => NATIVE_ICONS }))
vi.mock("@/lib/external-icons", () => ({ getExternalIcons: async () => EXTERNAL_ICONS, getExternalIconBySourceAndSlug: async () => null }))
vi.mock("@/lib/icons/svg-fetch", () => ({ fetchTrustedSvg: async (url: string) => `<svg data-url="${url}"/>` }))
vi.mock("@/lib/icons/native-icon-files.json", () => ({
	default: { "svg,png,webp": ["plex", "plex-dark", "lmstudio"], "png,webp": ["ntopng"] },
}))
vi.mock("@/constants", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/constants")>()),
	WEB_URL: "https://dashboardicons.com",
}))

const CLIENT_IP = "203.0.113.7"
const LEGACY_VERSION = "2025-11-25"
const MODERN_VERSION = "2026-07-28"
const INTENT = "Finding an icon so the user can add a media server tile to their homelab dashboard."

type RpcResponse = {
	result?: {
		content?: { type: string; text: string }[]
		structuredContent?: Record<string, unknown>
		isError?: boolean
		tools?: { name: string; inputSchema?: Record<string, unknown>; outputSchema?: Record<string, unknown> }[]
		serverInfo?: { name: string }
		contents?: { uri: string; mimeType: string; text: string }[]
		messages?: { content: { text: string } }[]
		completion?: { values: string[] }
	}
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
		submissionWrites.length = 0
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
			expect.arrayContaining([
				"match_icons",
				"search_icons",
				"get_icon",
				"get_icon_svg",
				"browse_icons",
				"list_categories",
				"get_more_tools",
			]),
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
			$mcp_tool_category: "discovery",
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
		expect(JSON.parse(second.result?.content?.[0]?.text ?? "{}")).toMatchObject({ found: true, icon: { name: "plex" } })
		await settle()

		const [searchCall, getCall] = toolCalls()
		expect(searchCall?.properties.$mcp_tool_name).toBe("search_icons")
		expect(getCall?.properties).toMatchObject({ $mcp_tool_name: "get_icon", $mcp_tool_category: "details" })
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

	it("runs account tools as the signed-in user without leaking the PocketBase token to analytics", async () => {
		const { handleMcpRequest } = await importHttp()
		const authInfo: AuthInfo = {
			token: "mcp-access-secret",
			clientId: "client",
			scopes: ["account"],
			extra: { userId: "user_123", username: "iconfan", admin: false, pbToken: "pb-old-secret" },
		}
		const list = await rpc(await handleMcpRequest(modernRequest(1, "tools/list", {})))
		const schemas = new Map((list.result?.tools ?? []).map((tool) => [tool.name, tool.outputSchema]))
		const ajv = new AjvJsonSchemaValidator()
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>'

		const calls: [string, Record<string, unknown>, Record<string, unknown>][] = [
			[
				"submit_icon",
				{ name: "my-app", svg, categories: ["tools"], variants: { light: svg, wordmark: svg, wordmark_dark: svg, custom: { "4k": svg } } },
				{ id: "rec1", status: "pending" },
			],
			["list_my_submissions", {}, { total: 1, submissions: [expect.objectContaining({ id: "rec1" })] }],
		]
		let id = 2
		for (const [name, args, expected] of calls) {
			const reply = await rpc(
				await handleMcpRequest(modernRequest(id++, "tools/call", { name, arguments: { ...args, context: INTENT } }, name), authInfo),
			)
			expect(reply.result?.isError, name).toBeUndefined()
			expect(reply.result?.structuredContent, name).toMatchObject(expected)
			expect(ajv.getValidator(schemas.get(name) as Record<string, unknown>)(reply.result?.structuredContent), name).toMatchObject({
				valid: true,
			})
		}
		expect(submissionWrites).toHaveLength(1)
		expect(submissionWrites[0]?.extras).toMatchObject({
			colors: { light: "my-app-light.svg" },
			wordmark: { default: "my-app-wordmark.svg", dark: "my-app-wordmark-dark.svg" },
			variants: { "4k": "my-app-4k.svg" },
		})

		const anonymous = await rpc(
			await handleMcpRequest(modernRequest(9, "tools/call", { name: "list_my_submissions", arguments: {} }, "list_my_submissions")),
		)
		expect(anonymous.result?.isError).toBe(true)
		await settle()

		expect(toolCalls().map((event) => [event.properties.$mcp_tool_name, event.properties.$mcp_tool_category, event.distinctId])).toEqual([
			["submit_icon", "account", "user_123"],
			["list_my_submissions", "account", "user_123"],
			["list_my_submissions", "account", expect.not.stringMatching("user_123")],
		])
		const logged = JSON.stringify(captured)
		for (const secret of ["pb-old-secret", "pb-fresh-secret", "mcp-access-secret"]) expect(logged).not.toContain(secret)
	})

	it("rejects malformed or malicious inline Variants through real MCP validation without writes", async () => {
		const { handleMcpRequest } = await importHttp()
		const authInfo: AuthInfo = {
			token: "opaque",
			clientId: "client",
			scopes: ["account"],
			extra: { userId: "user_123", username: "iconfan", admin: false, pbToken: "pb-token" },
		}
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>'
		for (const variants of [
			{ white: svg },
			{ custom: { dark: svg } },
			{ custom: { animated: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' } },
		]) {
			const result = await rpc(
				await handleMcpRequest(
					modernRequest(1, "tools/call", { name: "submit_icon", arguments: { name: "my-app", svg, variants } }, "submit_icon"),
					authInfo,
				),
			)
			expect(result.result?.isError).toBe(true)
		}
		expect(submissionWrites).toHaveLength(0)
	})

	it("advertises the update proposal schema and files a revision-pinned update through real authenticated MCP wiring", async () => {
		const { handleMcpRequest } = await importHttp()
		const authInfo: AuthInfo = {
			token: "mcp-access-secret",
			clientId: "client",
			scopes: ["account"],
			extra: { userId: "user_123", username: "iconfan", admin: false, pbToken: "pb-old-secret" },
		}
		const list = await rpc(await handleMcpRequest(modernRequest(1, "tools/list", {})))
		const tool = list.result?.tools?.find((item) => item.name === "propose_icon_update")
		expect(list.result?.tools).toHaveLength(10)
		expect(tool?.inputSchema?.required).toEqual(expect.arrayContaining(["name"]))
		expect(tool?.inputSchema?.required).not.toContain("svg")
		expect(tool?.inputSchema?.required).not.toContain("variants")
		const args = {
			name: "plex",
			variants: { wordmark: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>' },
			remove: [{ key: "light", note: "Obsolete artwork" }],
			categories: [],
		}
		const filed = await rpc(
			await handleMcpRequest(
				modernRequest(2, "tools/call", { name: "propose_icon_update", arguments: args }, "propose_icon_update"),
				authInfo,
			),
		)
		expect(filed.result?.isError).toBeUndefined()
		expect(filed.result?.structuredContent).toMatchObject({ id: "rec1", url: expect.stringContaining("rec1") })
		expect(submissionWrites).toHaveLength(1)
		expect(submissionWrites[0]).toMatchObject({
			name: "plex",
			target_submission: "",
			icon_update: {
				target: { revision: "rev-1", kind: "published" },
				variants: [{ key: "wordmark", action: "add", destination: "plex-wordmark" }],
				aliases: { add: [], remove: [] },
				categories: { add: [], remove: ["Media"] },
			},
		})
		const anonymous = await rpc(
			await handleMcpRequest(modernRequest(3, "tools/call", { name: "propose_icon_update", arguments: args }, "propose_icon_update")),
		)
		expect(anonymous.result?.isError).toBe(true)
		expect(anonymous.result?.content?.[0]?.text).toContain("needs a signed-in")
		for (const remove of [
			[{ key: "base" }],
			[{ key: "custom:dark" }],
			[{ key: "custom:UPPER" }],
			[{ key: "light", file: "other.svg" }],
			[
				{ key: "dark", note: "First reason" },
				{ key: "dark", note: "Different reason" },
			],
			[{ key: "wordmark", note: "Conflicting replacement" }],
		]) {
			const invalid = await rpc(
				await handleMcpRequest(
					modernRequest(4, "tools/call", { name: "propose_icon_update", arguments: { ...args, remove } }, "propose_icon_update"),
					authInfo,
				),
			)
			expect(invalid.result?.isError).toBe(true)
		}
		expect(submissionWrites).toHaveLength(1)
		await settle()
		expect(toolCalls()[0]).toMatchObject({
			distinctId: "user_123",
			properties: { $mcp_tool_name: "propose_icon_update", $mcp_tool_category: "account" },
		})
		for (const secret of ["mcp-access-secret", "pb-old-secret", "pb-fresh-secret"]) expect(JSON.stringify(captured)).not.toContain(secret)
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

	it("returns structuredContent that validates against the advertised outputSchema, extra keys included", async () => {
		const { handleMcpRequest } = await importHttp()
		const list = await rpc(await handleMcpRequest(modernRequest(1, "tools/list", {})))
		const schemas = new Map((list.result?.tools ?? []).map((tool) => [tool.name, tool.outputSchema]))
		const ajv = new AjvJsonSchemaValidator()

		const calls: [string, Record<string, unknown>, Record<string, unknown>][] = [
			["match_icons", { services: ["Plex", "LM Studio", "qbitrr", "zz-unknown"] }, { matches: expect.any(Array) }],
			["search_icons", { query: "plex" }, { total: 1 }],
			["get_icon", { name: "plex" }, { found: true, icon: { license: null } }],
			["get_icon", { name: "qbitrr" }, { found: true, icon: { source: "selfhst", license: { name: "CC BY 4.0" } } }],
			["get_icon", { name: "lm-studio" }, { found: true, resolved_from: "lm-studio", icon: { name: "lmstudio" } }],
			["get_icon", { name: "plexx" }, { found: false, did_you_mean: [expect.objectContaining({ name: "plex" })] }],
			["get_icon_svg", { name: "plex", theme: "dark" }, { found: true, svg: expect.stringContaining("plex-dark") }],
			["get_icon_svg", { name: "ntopng" }, { found: true, svg: null, reason: "no_svg" }],
			["list_categories", {}, { categories: expect.any(Array) }],
			["browse_icons", { limit: 1 }, { items: expect.any(Array), next_cursor: "1" }],
		]

		let id = 2
		for (const [name, args, expected] of calls) {
			const schema = schemas.get(name)
			expect(schema?.additionalProperties).not.toBe(false)
			const reply = await rpc(
				await handleMcpRequest(modernRequest(id++, "tools/call", { name, arguments: { ...args, context: INTENT } }, name)),
			)
			const structured = reply.result?.structuredContent
			expect(reply.result?.isError, name).toBeUndefined()
			expect(structured, name).toMatchObject(expected)

			const validate = ajv.getValidator(schema as Record<string, unknown>)
			expect(validate(structured), name).toMatchObject({ valid: true })
			expect(validate({ ...structured, _mcp_instructions: { conversation_id: "conv" }, future_key: 1 }), name).toMatchObject({
				valid: true,
			})
		}
		await settle()

		expect(toolCalls().map((event) => event.properties.$mcp_tool_category)).toEqual([
			"discovery",
			"discovery",
			"details",
			"details",
			"details",
			"details",
			"details",
			"details",
			"discovery",
			"discovery",
		])
	})

	it("serves the icon SVG resource with completion and the dashboard prompt", async () => {
		const { handleMcpRequest } = await importHttp()
		const call = async (id: number, method: string, params: Record<string, unknown>) =>
			rpc(await handleMcpRequest(post({ jsonrpc: "2.0", id, method, params })))

		const templates = (await call(1, "resources/templates/list", {})) as { result?: { resourceTemplates?: { uriTemplate: string }[] } }
		expect(templates.result?.resourceTemplates?.map((template) => template.uriTemplate)).toEqual(["dashboard-icons://icons/{name}"])

		const read = await call(2, "resources/read", { uri: "dashboard-icons://icons/lm-studio" })
		expect(read.result?.contents?.[0]).toMatchObject({ mimeType: "image/svg+xml", text: expect.stringContaining("lmstudio.svg") })

		const missing = await call(3, "resources/read", { uri: "dashboard-icons://icons/zz-unknown" })
		expect(missing.error).toMatchObject({ message: expect.stringContaining('No icon named "zz-unknown"') })

		const completion = await call(4, "completion/complete", {
			ref: { type: "ref/resource", uri: "dashboard-icons://icons/{name}" },
			argument: { name: "name", value: "pl" },
		})
		expect(completion.result?.completion?.values).toEqual(["plex"])

		const prompt = await call(5, "prompts/get", {
			name: "icons_for_dashboard",
			arguments: { services: "Plex, Sonarr", dashboard: "homepage" },
		})
		expect(prompt.result?.messages?.[0]?.content.text).toContain('services ["Plex","Sonarr"]')

		const dashboards = await call(6, "completion/complete", {
			ref: { type: "ref/prompt", name: "icons_for_dashboard" },
			argument: { name: "dashboard", value: "d" },
		})
		expect(dashboards.result?.completion?.values).toEqual(["dashy"])
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
