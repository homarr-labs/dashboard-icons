import { createMcpHandler } from "mcp-handler"
import { instrumentDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const createDashboardIconsMcpHandler = () =>
	createMcpHandler(
		(server) => {
			// Register tools first so @posthog/mcp's low-level instrumentation doesn't
			// clash with the tools/call handler that registerTool() installs.
			registerDashboardIconsTools(server)
			instrumentDashboardIconsMcpAnalytics(server)
		},
		{
			serverInfo: getDashboardIconsServerInfo(),
			verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
		},
	)
