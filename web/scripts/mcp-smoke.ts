// Usage: npx tsx scripts/mcp-smoke.ts [base-url]   (default http://localhost:3005)
// Drives both MCP protocol eras against /api/mcp and exits non-zero on any failure.

type RpcResult = {
	content?: { type: string; text: string }[]
	isError?: boolean
	tools?: { name: string }[]
	serverInfo?: { name: string; version: string }
}

type RpcReply = { status: number; sessionId: string | null; result?: RpcResult; error?: unknown }

const LEGACY_VERSION = "2025-11-25"
const MODERN_VERSION = "2026-07-28"
const CONTEXT = "Smoke-testing the dashboard icons MCP server by looking up an icon for a media server dashboard tile."
const LLM_MODEL = "mcp-smoke-model"

const endpoint = new URL("/api/mcp", process.argv[2] ?? "http://localhost:3005").toString()
const failures: string[] = []
let nextId = 1

function check(label: string, ok: boolean, detail: string): void {
	if (ok) {
		console.log(`ok   ${label} ${detail}`)
		return
	}
	console.log(`FAIL ${label} ${detail}`)
	failures.push(label)
}

async function readBody(response: Response): Promise<{ result?: RpcResult; error?: unknown } | undefined> {
	const text = await response.text()
	if (!text) return undefined
	if (!response.headers.get("content-type")?.includes("text/event-stream")) return JSON.parse(text)
	const data = text
		.split("\n")
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice("data:".length).trim())
		.filter(Boolean)
		.at(-1)
	if (data) return JSON.parse(data)
	return undefined
}

async function send(body: Record<string, unknown>, headers: Record<string, string>): Promise<RpcReply> {
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
		body: JSON.stringify({ jsonrpc: "2.0", ...body }),
	})
	const sessionId = response.headers.get("mcp-session-id")
	const parsed = await readBody(response)
	return { status: response.status, sessionId, result: parsed?.result, error: parsed?.error }
}

function conversationIdOf(reply: RpcReply): string | undefined {
	for (const block of reply.result?.content ?? []) {
		if (!block.text.includes("conversation_id")) continue
		try {
			return (JSON.parse(block.text) as { conversation_id?: string }).conversation_id
		} catch {
			return undefined
		}
	}
	return undefined
}

function firstIconName(reply: RpcReply): string {
	const text = reply.result?.content?.[0]?.text ?? "{}"
	const parsed = JSON.parse(text) as { results?: { name: string }[] }
	return parsed.results?.[0]?.name ?? "plex"
}

function describe(reply: RpcReply): string {
	const parts = [`status=${reply.status}`]
	if (reply.sessionId) parts.push(`session=${reply.sessionId}`)
	if (reply.error) parts.push(`error=${JSON.stringify(reply.error)}`)
	if (reply.result?.isError) parts.push(`toolError=${reply.result.content?.[0]?.text}`)
	return parts.join(" ")
}

function succeeded(reply: RpcReply): boolean {
	return reply.status === 200 && !reply.error && !reply.result?.isError
}

type Era = {
	name: string
	call: (method: string, params: Record<string, unknown>, name?: string) => Promise<RpcReply>
}

async function runToolFlow(era: Era): Promise<void> {
	const list = await era.call("tools/list", {})
	const toolNames = list.result?.tools?.map((tool) => tool.name) ?? []
	check(`${era.name} tools/list`, succeeded(list) && toolNames.includes("search_icons"), `${describe(list)} tools=${toolNames.join(",")}`)

	const search = await era.call(
		"tools/call",
		{ name: "search_icons", arguments: { query: "plex", limit: 3, context: CONTEXT, llm_model: LLM_MODEL } },
		"search_icons",
	)
	const conversationId = conversationIdOf(search)
	check(`${era.name} tools/call search_icons`, succeeded(search), `${describe(search)} conversation_id=${conversationId ?? "-"}`)

	const args: Record<string, unknown> = { name: firstIconName(search), context: CONTEXT, llm_model: LLM_MODEL }
	if (conversationId) args.conversation_id = conversationId
	const icon = await era.call("tools/call", { name: "get_icon", arguments: args }, "get_icon")
	check(`${era.name} tools/call get_icon(${String(args.name)})`, succeeded(icon), describe(icon))
}

async function legacyEra(): Promise<void> {
	const initialize = await send(
		{
			id: nextId++,
			method: "initialize",
			params: { protocolVersion: LEGACY_VERSION, capabilities: {}, clientInfo: { name: "mcp-smoke-legacy", version: "1.0.0" } },
		},
		{},
	)
	check("legacy initialize", succeeded(initialize) && Boolean(initialize.sessionId), describe(initialize))
	const headers: Record<string, string> = { "mcp-protocol-version": LEGACY_VERSION }
	if (initialize.sessionId) headers["mcp-session-id"] = initialize.sessionId

	const initialized = await send({ method: "notifications/initialized" }, headers)
	check("legacy notifications/initialized", initialized.status === 202, describe(initialized))

	await runToolFlow({
		name: "legacy",
		call: (method, params) => send({ id: nextId++, method, params }, headers),
	})
}

async function modernEra(): Promise<void> {
	const meta = {
		"io.modelcontextprotocol/protocolVersion": MODERN_VERSION,
		"io.modelcontextprotocol/clientInfo": { name: "mcp-smoke-modern", version: "1.0.0" },
		"io.modelcontextprotocol/clientCapabilities": {},
	}
	await runToolFlow({
		name: "modern",
		call: (method, params, name) => {
			const headers: Record<string, string> = { "mcp-protocol-version": MODERN_VERSION, "mcp-method": method }
			if (name) headers["mcp-name"] = name
			return send({ id: nextId++, method, params: { ...params, _meta: meta } }, headers)
		},
	})
}

async function main(): Promise<void> {
	console.log(`MCP smoke test against ${endpoint}`)
	await legacyEra()
	await modernEra()
	if (failures.length > 0) {
		console.error(`${failures.length} check(s) failed: ${failures.join(", ")}`)
		process.exit(1)
	}
	console.log("all checks passed")
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
