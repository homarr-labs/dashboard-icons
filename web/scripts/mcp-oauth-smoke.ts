// Usage: npx tsx scripts/mcp-oauth-smoke.ts <base-url> <pocketbase-url> <email> [password] [event-log]
// Password falls back to MCP_SMOKE_PASSWORD. Pass the dev server's log (MCP_ANALYTICS_DEBUG=true) as event-log
// to also check the analytics events. See docs/MCP-AUTH.md for the local stack this expects.
import { createHash, randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"

type RpcResult = { content?: { type: string; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean }
type RpcReply = { status: number; headers: Headers; result?: RpcResult; error?: unknown }
type Tokens = { access_token: string; refresh_token: string; expires_in: number; scope: string }

const [baseArg = "http://localhost:3005", pbArg = "http://127.0.0.1:8090", email, passwordArg, eventLog] = process.argv.slice(2)
const password = passwordArg || process.env.MCP_SMOKE_PASSWORD
const base = new URL(baseArg).origin
const pocketbase = new URL(pbArg).origin
const endpoint = `${base}/api/mcp`
const REDIRECT_URI = "http://127.0.0.1:33418/callback"
const MODERN_VERSION = "2026-07-28"
const LEGACY_VERSION = "2025-11-25"
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4f46e5"/></svg>'
const failures: string[] = []
let nextId = 1

function check(label: string, ok: boolean, detail = ""): boolean {
	console.log(`${ok ? "ok  " : "FAIL"} ${label} ${detail}`.trimEnd())
	if (!ok) failures.push(label)
	return ok
}

async function json<T>(response: Response): Promise<T> {
	return (await response.json()) as T
}

async function rpc(method: string, params: Record<string, unknown>, headers: Record<string, string> = {}): Promise<RpcReply> {
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
		body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
	})
	const text = await response.text()
	const body = text.startsWith("{") ? (JSON.parse(text) as { result?: RpcResult; error?: unknown }) : {}
	return { status: response.status, headers: response.headers, result: body.result, error: body.error }
}

function modernCall(name: string, args: Record<string, unknown>, bearer?: string): Promise<RpcReply> {
	const headers: Record<string, string> = { "mcp-protocol-version": MODERN_VERSION, "mcp-method": "tools/call", "mcp-name": name }
	if (bearer) headers.authorization = `Bearer ${bearer}`
	const meta = {
		"io.modelcontextprotocol/protocolVersion": MODERN_VERSION,
		"io.modelcontextprotocol/clientInfo": { name: "mcp-oauth-smoke", version: "1.0.0" },
		"io.modelcontextprotocol/clientCapabilities": {},
	}
	return rpc("tools/call", { name, arguments: args, _meta: meta }, headers)
}

async function legacyCall(name: string, args: Record<string, unknown>, bearer: string): Promise<RpcReply> {
	const auth = { authorization: `Bearer ${bearer}` }
	const init = await rpc(
		"initialize",
		{ protocolVersion: LEGACY_VERSION, capabilities: {}, clientInfo: { name: "mcp-oauth-smoke-legacy", version: "1.0.0" } },
		auth,
	)
	const headers: Record<string, string> = { ...auth, "mcp-protocol-version": LEGACY_VERSION }
	const session = init.headers.get("mcp-session-id")
	if (session) headers["mcp-session-id"] = session
	return rpc("tools/call", { name, arguments: args }, headers)
}

function toolOk(reply: RpcReply): boolean {
	return reply.status === 200 && !reply.error && !reply.result?.isError && Boolean(reply.result?.structuredContent)
}

function describeReply(reply: RpcReply): string {
	if (reply.result?.isError) return `status=${reply.status} toolError=${reply.result.content?.[0]?.text}`
	if (reply.error) return `status=${reply.status} error=${JSON.stringify(reply.error)}`
	return `status=${reply.status}`
}

async function tokenRequest(params: Record<string, string>): Promise<{ status: number; body: Tokens & { error?: string } }> {
	const response = await fetch(`${base}/api/oauth/token`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(params),
	})
	return { status: response.status, body: await json(response) }
}

function tamper(token: string): string {
	const raw = Buffer.from(token, "base64url")
	raw[raw.length - 1] ^= 0xff
	return raw.toString("base64url")
}

async function checkEventLog(userId: string, secrets: string[]): Promise<void> {
	if (!eventLog) return
	await new Promise((resolve) => setTimeout(resolve, 1500))
	const log = await readFile(eventLog, "utf8")
	const events = log
		.split("\n")
		.filter((line) => line.startsWith("{") && line.includes('"$mcp_'))
		.map((line) => JSON.parse(line) as { event: string; distinct_id: string; properties: Record<string, unknown> })
	const accountCalls = events.filter(
		(event) => event.event === "$mcp_tool_call" && ["submit_icon", "list_my_submissions"].includes(String(event.properties.$mcp_tool_name)),
	)
	const signedIn = accountCalls.filter((event) => event.properties.$mcp_is_error === false)
	check(
		"events: signed-in account calls use the PocketBase user id",
		signedIn.length > 0 && signedIn.every((event) => event.distinct_id === userId),
		`count=${signedIn.length}`,
	)
	check(
		"events: no bearer or refresh token logged",
		secrets.every((secret) => !log.includes(secret)),
	)
	check("events: no JWT (PocketBase token) logged", !/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/.test(log))
}

async function main(): Promise<void> {
	if (!email || !password) throw new Error("Usage: mcp-oauth-smoke.ts <base-url> <pocketbase-url> <email> [password] [event-log]")
	console.log(`MCP OAuth smoke test against ${endpoint} (PocketBase ${pocketbase})`)

	const anonymous = await modernCall("submit_icon", { name: "mcp-smoke", svg: SVG })
	const challenge = anonymous.headers.get("www-authenticate") ?? ""
	const prmUrl = /resource_metadata="([^"]+)"/.exec(challenge)?.[1]
	check("anonymous submit_icon -> 401 challenge", anonymous.status === 401 && Boolean(prmUrl), `status=${anonymous.status} ${challenge}`)
	check("401 exposes WWW-Authenticate to browsers", anonymous.headers.get("access-control-expose-headers") === "WWW-Authenticate")
	if (!prmUrl) throw new Error("no resource_metadata in the challenge")

	const prm = await json<{ resource: string; authorization_servers: string[] }>(await fetch(prmUrl))
	const asMetadata = await json<{ registration_endpoint: string; token_endpoint: string }>(
		await fetch(`${prm.authorization_servers[0]}/.well-known/oauth-authorization-server`),
	)
	check(
		"protected resource + AS metadata",
		prm.resource === endpoint && Boolean(asMetadata.registration_endpoint),
		`resource=${prm.resource}`,
	)

	const registration = await fetch(asMetadata.registration_endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ client_name: "mcp-oauth-smoke", redirect_uris: [REDIRECT_URI], token_endpoint_auth_method: "none" }),
	})
	const { client_id: clientId } = await json<{ client_id: string }>(registration)
	check("dynamic client registration", registration.status === 201 && Boolean(clientId), `status=${registration.status}`)

	const login = await fetch(`${pocketbase}/api/collections/users/auth-with-password`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ identity: email, password }),
	})
	const pbAuth = await json<{ token: string; record: { id: string } }>(login)
	if (!check("PocketBase password login", login.ok, `status=${login.status}`)) throw new Error("cannot sign in to PocketBase")

	const verifier = randomBytes(32).toString("base64url")
	const state = randomBytes(8).toString("hex")
	const approval = await fetch(`${base}/api/oauth/authorize`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			pbToken: pbAuth.token,
			params: {
				response_type: "code",
				client_id: clientId,
				redirect_uri: REDIRECT_URI,
				state,
				scope: "account",
				code_challenge: createHash("sha256").update(verifier).digest("base64url"),
				code_challenge_method: "S256",
				resource: endpoint,
			},
		}),
	})
	const redirect = new URL((await json<{ redirectTo: string }>(approval)).redirectTo)
	const code = redirect.searchParams.get("code") ?? ""
	check(
		"consent approval -> code",
		approval.ok && Boolean(code) && redirect.searchParams.get("state") === state,
		`iss=${redirect.searchParams.get("iss")}`,
	)

	const exchange = {
		grant_type: "authorization_code",
		code,
		redirect_uri: REDIRECT_URI,
		client_id: clientId,
		code_verifier: verifier,
		resource: endpoint,
	}
	const issued = await tokenRequest(exchange)
	check(
		"code + PKCE -> tokens",
		issued.status === 200 && Boolean(issued.body.access_token && issued.body.refresh_token),
		`expires_in=${issued.body.expires_in}`,
	)
	const replay = await tokenRequest(exchange)
	check("code replay rejected", replay.status === 400 && replay.body.error === "invalid_grant", `status=${replay.status}`)

	const name = `mcp-smoke-${Date.now().toString(36)}`
	const submitted = await modernCall(
		"submit_icon",
		{ name, svg: SVG, aliases: ["MCP Smoke"], categories: ["tools"] },
		issued.body.access_token,
	)
	const submissionId = String(submitted.result?.structuredContent?.id ?? "")
	check(
		"submit_icon as the user",
		toolOk(submitted) && Boolean(submissionId),
		`${describeReply(submitted)} id=${submissionId} url=${submitted.result?.structuredContent?.url}`,
	)

	const record = await fetch(`${pocketbase}/api/collections/submissions/records/${submissionId}`, {
		headers: { authorization: pbAuth.token },
	})
	const stored = await json<{ created_by?: string; status?: string; assets?: string[]; extras?: { base?: string; categories?: string[] } }>(
		record,
	)
	check(
		"PocketBase record owned by the user",
		record.ok && stored.created_by === pbAuth.record.id && stored.status === "pending" && stored.assets?.[0]?.endsWith(".svg") === true,
		`created_by=${stored.created_by} status=${stored.status} assets=${stored.assets?.join(",")} extras=${JSON.stringify(stored.extras)}`,
	)

	const listed = await legacyCall("list_my_submissions", { limit: 5 }, issued.body.access_token)
	const ids = ((listed.result?.structuredContent?.submissions ?? []) as { id: string }[]).map((item) => item.id)
	check(
		"list_my_submissions (2025-era leg) shows it",
		toolOk(listed) && ids.includes(submissionId),
		`${describeReply(listed)} total=${listed.result?.structuredContent?.total}`,
	)

	const refreshed = await tokenRequest({
		grant_type: "refresh_token",
		refresh_token: issued.body.refresh_token,
		client_id: clientId,
		resource: endpoint,
	})
	const rotated = refreshed.body.refresh_token !== issued.body.refresh_token
	check("refresh grant rotates tokens", refreshed.status === 200 && rotated, `status=${refreshed.status}`)
	const afterRefresh = await modernCall("list_my_submissions", { status: "pending" }, refreshed.body.access_token)
	check("refreshed access token works", toolOk(afterRefresh), describeReply(afterRefresh))

	const tampered = await modernCall("search_icons", { query: "plex" }, tamper(issued.body.access_token))
	check(
		"tampered bearer -> 401 invalid_token",
		tampered.status === 401 && (tampered.headers.get("www-authenticate") ?? "").includes('error="invalid_token"'),
		`status=${tampered.status}`,
	)

	const cleanup = await fetch(`${pocketbase}/api/collections/submissions/records/${submissionId}`, {
		method: "DELETE",
		headers: { authorization: pbAuth.token },
	})
	console.log(`info cleanup: delete ${submissionId} -> ${cleanup.status}`)

	await checkEventLog(pbAuth.record.id, [
		pbAuth.token,
		issued.body.access_token,
		issued.body.refresh_token,
		refreshed.body.access_token,
		refreshed.body.refresh_token,
	])

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
