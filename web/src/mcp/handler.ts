import { createMcpHandler } from "mcp-handler"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const createDashboardIconsMcpHandler = () =>
	createMcpHandler(
		(server) => {
			registerDashboardIconsTools(server)
		},
		{
			serverInfo: {
				name: "dashboard-icons",
				version: "1.0.0",
			},
		},
		{
			verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
		},
	)
