// Usage: npx tsx scripts/mcp-smoke.ts [base-url]   (default http://localhost:3005)
// Drives both MCP protocol eras against /api/mcp and exits non-zero on any failure.

type RpcResult = {
	content?: { type: string; text: string }[]
	structuredContent?: Record<string, unknown>
	isError?: boolean
	tools?: { name: string }[]
	serverInfo?: { name: string; version: string }
}

type RpcReply = { status: number; sessionId: string | null; result?: RpcResult; error?: unknown }

const LEGACY_VERSION = "2025-11-25"
const MODERN_VERSION = "2026-07-28"
const CONTEXT = "Smoke-testing the dashboard icons MCP server by looking up an icon for a media server dashboard tile."
const LLM_MODEL = "mcp-smoke-model"
const TOOLS = ["match_icons", "search_icons", "get_icon", "get_icon_svg", "browse_icons", "list_categories"]
const SERVICES = ["Plex", "Home Assistant", "Pi-hole", "LM Studio"]

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

type Hit = { name: string; source: string }

function bestMatches(reply: RpcReply): string {
	const matches = (reply.result?.structuredContent?.matches ?? []) as { service: string; best: Hit | null }[]
	return matches.map(({ service, best }) => `${service}->${best ? `${best.source}:${best.name}` : "none"}`).join(",")
}

function lookupSummary(reply: RpcReply): string {
	const lookup = reply.result?.structuredContent as
		| { found?: boolean; resolved_from?: string; icon?: Hit; did_you_mean?: Hit[]; degraded_sources?: string[] }
		| undefined
	if (!lookup) return "no structuredContent"
	const parts = [`found=${lookup.found}`]
	if (lookup.icon) parts.push(`icon=${lookup.icon.source}:${lookup.icon.name}`)
	if (lookup.resolved_from) parts.push(`resolved_from=${lookup.resolved_from}`)
	if (lookup.did_you_mean) parts.push(`did_you_mean=${lookup.did_you_mean.map((hit) => hit.name).join("|") || "-"}`)
	if (lookup.degraded_sources) parts.push(`degraded=${lookup.degraded_sources.join("|")}`)
	return parts.join(" ")
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
	check(`${era.name} tools/list`, succeeded(list) && TOOLS.every((tool) => toolNames.includes(tool)), `${describe(list)} tools=${toolNames.join(",")}`)

	const match = await era.call(
		"tools/call",
		{ name: "match_icons", arguments: { services: SERVICES, context: CONTEXT, llm_model: LLM_MODEL } },
		"match_icons",
	)
	const conversationId = conversationIdOf(match)
	check(
		`${era.name} tools/call match_icons`,
		succeeded(match) && Boolean(match.result?.structuredContent),
		`${describe(match)} ${bestMatches(match)} conversation_id=${conversationId ?? "-"}`,
	)

	const args: Record<string, unknown> = { name: "lm-studio", context: CONTEXT, llm_model: LLM_MODEL }
	if (conversationId) args.conversation_id = conversationId
	const icon = await era.call("tools/call", { name: "get_icon", arguments: args }, "get_icon")
	const found = icon.result?.structuredContent?.found
	check(`${era.name} tools/call get_icon(lm-studio)`, succeeded(icon) && typeof found === "boolean", `${describe(icon)} ${lookupSummary(icon)}`)
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
