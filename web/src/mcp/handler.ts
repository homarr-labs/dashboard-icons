import { createMcpHandler } from "mcp-handler"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const createDashboardIconsMcpHandler = () =>
	createMcpHandler(
		(server) => {
			registerDashboardIconsTools(server)
		},
		{
			serverInfo: getDashboardIconsServerInfo(),
		},
		{
			verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
		},
	)
