import type { McpServer } from "@modelcontextprotocol/server"
import type { BeforeSendFn } from "@posthog/mcp"
import { instrument, PostHog } from "@posthog/mcp"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthog =
	posthogKey && process.env.NEXT_PUBLIC_DISABLE_POSTHOG !== "true"
		? new PostHog(posthogKey, {
				host: "https://eu.i.posthog.com",
			})
		: null

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

/**
 * Event-volume filter passed to `instrument()`. `$mcp_tool_call` and `$exception`
 * pass through untouched; only `$mcp_tools_list` and most `$mcp_initialize` are dropped.
 */
export const mcpBeforeSend: BeforeSendFn = (event) => {
	if (event.event === MCP_TOOLS_LIST_EVENT) return null

	if (event.event === MCP_INITIALIZE_EVENT) {
		if (event.properties.$mcp_client_name === MCP_FALLBACK_TEST_CLIENT_NAME) return null
		if (!isSampledIn(String(event.distinct_id ?? ""), MCP_INITIALIZE_SAMPLE_RATE)) return null
	}

	return event
}

export function instrumentDashboardIconsMcpAnalytics(server: McpServer): void {
	if (!posthog) return
	// @modelcontextprotocol/server v2's McpServer uses registerTool() and has no tool()
	// method, so @posthog/mcp's high-level compatibility check rejects it. Instrument the
	// underlying low-level Server (server.server) instead, which is what actually handles
	// protocol requests — @posthog/mcp 0.11+ instruments it correctly for all event types.
	instrument(server.server, posthog, {
		context: false,
		enableExceptionAutocapture: false,
		beforeSend: mcpBeforeSend,
	})
}

export async function flushDashboardIconsMcpAnalytics(): Promise<void> {
	if (!posthog) return
	await posthog.flush().catch(() => {})
}
