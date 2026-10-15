import type { McpServer } from "@modelcontextprotocol/server"
import type { BeforeSendFn, MCPAnalyticsOptions } from "@posthog/mcp"
import { instrument, PostHog } from "@posthog/mcp"
import { getClientIp } from "@/lib/icons/rate-limit"
import { getMcpCaller } from "@/mcp/caller"

type McpCaptureEvent = Parameters<BeforeSendFn>[0]
type IdentifyFn = Extract<MCPAnalyticsOptions["identify"], (...args: never[]) => unknown>
type EventPropertiesFn = NonNullable<MCPAnalyticsOptions["eventProperties"]>

const POSTHOG_HOST = "https://eu.i.posthog.com"
const DEBUG_PROJECT_KEY = "phc_mcp_analytics_debug"
const debug = process.env.MCP_ANALYTICS_DEBUG === "true"

function createPostHogClient(): PostHog | null {
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
	const sending = Boolean(key) && process.env.NEXT_PUBLIC_DISABLE_POSTHOG !== "true"
	if (!sending && !debug) return null
	return new PostHog(key || DEBUG_PROJECT_KEY, { host: POSTHOG_HOST, disableGeoip: false, disabled: !sending })
}

const posthog = createPostHogClient()

// Connection chatter: `$mcp_tools_list` fires on every tools/list response (most of
// which have no identifiable client). Drop it entirely — it carries no product signal.
export const MCP_TOOLS_LIST_EVENT = "$mcp_tools_list"
export const MCP_INITIALIZE_EVENT = "$mcp_initialize"

// Keep a representative trend of `$mcp_initialize` without paying for every handshake.
// Deterministic on the event's distinct_id so a given session is consistently in or out.
export const MCP_INITIALIZE_SAMPLE_RATE = 0.1

// The third-party `mcp-remote` npm package probes HTTP-only endpoints with a throwaway
// client named `mcp-remote-fallback-test` (`version: 0.0.0`). It isn't part of this repo,
// so we can't redirect it; drop its handshakes here instead.
export const MCP_FALLBACK_TEST_CLIENT_NAME = "mcp-remote-fallback-test"

// FNV-1a (32-bit) — cheap, stable hash so sampling doesn't drift between processes.
function hashString(value: string): number {
	let hash = 0x811c9dc5
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index)
		hash = Math.imul(hash, 0x01000193)
	}
	return hash >>> 0
}

/**
 * Deterministic sampler: the same identity always maps to the same decision, so
 * per-session event sequences aren't split mid-stream.
 */
export function isSampledIn(identity: string, rate: number): boolean {
	if (rate >= 1) return true
	if (rate <= 0) return false
	return hashString(identity) % 10_000 < rate * 10_000
}

// `$identify` events carry the SDK request context, whose auth info holds the caller's
// PocketBase token under a key PostHog's redactor does not know. Never send that context.
function dropRequestContext(event: McpCaptureEvent): void {
	const parameters = event.properties.$mcp_parameters
	if (parameters && typeof parameters === "object" && "extra" in parameters) delete parameters.extra
}

/**
 * Event-volume filter applied before anything is sent. `$mcp_tool_call` and the rest
 * pass through untouched; only `$mcp_tools_list` and most `$mcp_initialize` are dropped.
 */
export function mcpBeforeSend(event: McpCaptureEvent): McpCaptureEvent | null {
	dropRequestContext(event)
	if (event.event === MCP_TOOLS_LIST_EVENT) return null

	if (event.event === MCP_INITIALIZE_EVENT) {
		if (event.properties.$mcp_client_name === MCP_FALLBACK_TEST_CLIENT_NAME) return null
		if (!isSampledIn(event.distinct_id, MCP_INITIALIZE_SAMPLE_RATE)) return null
	}

	return event
}

function beforeSend(event: McpCaptureEvent): McpCaptureEvent | null {
	const kept = mcpBeforeSend(event)
	if (kept && debug) process.stderr.write(`${JSON.stringify(kept)}\n`)
	return kept
}

const identify: IdentifyFn = async (_request, extra) => {
	const caller = getMcpCaller(extra?.http?.authInfo)
	if (!caller) return null
	return { distinctId: caller.userId, properties: { username: caller.username, admin: caller.admin } }
}

const clientIpProperties: EventPropertiesFn = (_request, extra) => {
	const headers = extra?.http?.req?.headers
	if (!(headers instanceof Headers)) return null
	const ip = getClientIp(headers)
	if (ip === "unknown") return null
	return { $ip: ip }
}

const analyticsOptions: MCPAnalyticsOptions = {
	context: true,
	captureModel: true,
	enableConversationId: true,
	reportMissing: true,
	enableExceptionAutocapture: false,
	serverBuild: process.env.MCP_SERVER_BUILD || undefined,
	identify,
	eventProperties: clientIpProperties,
	beforeSend,
}

export function instrumentDashboardIconsMcpAnalytics(server: McpServer): void {
	if (!posthog) return
	instrument(server, posthog, analyticsOptions)
}

export async function flushDashboardIconsMcpAnalytics(): Promise<void> {
	if (!posthog) return
	await posthog.flush().catch(() => {})
}
