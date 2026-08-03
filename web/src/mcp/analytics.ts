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
	instrument(server, posthog, { context: false })
}

export async function flushDashboardIconsMcpAnalytics(): Promise<void> {
	if (!posthog) return
	await posthog.flush().catch(() => {})
}
