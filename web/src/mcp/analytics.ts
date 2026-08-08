import type { McpServer } from "@modelcontextprotocol/server"
import { instrument, PostHog } from "@posthog/mcp"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthog =
	posthogKey && process.env.NEXT_PUBLIC_DISABLE_POSTHOG !== "true"
		? new PostHog(posthogKey, {
				host: "https://eu.i.posthog.com",
			})
		: null

export function instrumentDashboardIconsMcpAnalytics(server: McpServer): void {
	if (!posthog) return
	// @modelcontextprotocol/server v2's McpServer uses registerTool() and has no tool()
	// method, so @posthog/mcp's high-level compatibility check rejects it. Instrument the
	// underlying low-level Server (server.server) instead, which is what actually handles
	// protocol requests — @posthog/mcp 0.11+ instruments it correctly for all event types.
	instrument(server.server, posthog, { context: false, enableExceptionAutocapture: false })
}

export async function flushDashboardIconsMcpAnalytics(): Promise<void> {
	if (!posthog) return
	await posthog.flush().catch(() => {})
}
