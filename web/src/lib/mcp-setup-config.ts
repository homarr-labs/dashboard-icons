import { BASE_URL } from "@/constants"

export type McpSetupSource = "hero" | "icon_search"

export type McpClientId = "vscode" | "cursor" | "claude" | "windsurf" | "zed" | "custom"

export type McpSnippetKind = "json" | "bash"

export type McpClientSetupVariant = {
	title: string
	configFileLabel: string
	snippetKind: McpSnippetKind
	steps: string[]
	analyticsClient: string
	getSnippet: (webUrl: string) => string
}

export type McpClientGuide = {
	id: McpClientId
	label: string
	iconUrl?: string
	monochromeIcon: boolean
	useLucideIcon?: "plug"
	prerequisites?: string[]
	variants?: McpClientSetupVariant[]
	configFileLabel?: string
	snippetKind?: McpSnippetKind
	steps?: string[]
	getSnippet?: (webUrl: string) => string
}

export const MCP_TOOLS = [
	{ name: "search_icons", description: "Search icons by name, alias, or category" },
	{ name: "get_icon", description: "Full metadata and CDN URLs for one icon" },
	{ name: "get_icon_url", description: "Direct CDN URL for one icon" },
	{ name: "suggest_icon", description: "Fuzzy match from a natural service name" },
] as const

export function getMcpEndpointUrl(webUrl: string): string {
	return `${webUrl}/api/mcp`
}

export function getHttpMcpConfigJson(webUrl: string): string {
	return JSON.stringify(
		{
			mcpServers: {
				"dashboard-icons": {
					url: getMcpEndpointUrl(webUrl),
				},
			},
		},
		null,
		2,
	)
}

export function getMcpRemoteConfigJson(webUrl: string): string {
	return JSON.stringify(
		{
			mcpServers: {
				"dashboard-icons": {
					command: "npx",
					args: ["-y", "mcp-remote", getMcpEndpointUrl(webUrl)],
				},
			},
		},
		null,
		2,
	)
}

export function getVscodeMcpConfigJson(webUrl: string): string {
	return JSON.stringify(
		{
			servers: {
				"dashboard-icons": {
					command: "npx",
					args: ["-y", "mcp-remote", getMcpEndpointUrl(webUrl)],
				},
			},
		},
		null,
		2,
	)
}

export function getZedMcpConfigJson(webUrl: string): string {
	return JSON.stringify(
		{
			context_servers: {
				"dashboard-icons": {
					source: "custom",
					command: "npx",
					args: ["-y", "mcp-remote", getMcpEndpointUrl(webUrl)],
				},
			},
		},
		null,
		2,
	)
}

export function getClaudeCodeAddCommand(webUrl: string): string {
	return `claude mcp add dashboard-icons -- npx -y mcp-remote ${getMcpEndpointUrl(webUrl)}`
}

export function getIconUrlExampleJson(iconName: string): string {
	return JSON.stringify(
		{
			tool: "get_icon_url",
			arguments: { name: iconName, format: "svg" },
		},
		null,
		2,
	)
}

export const MCP_CLIENT_GUIDES: McpClientGuide[] = [
	{
		id: "vscode",
		label: "Visual Studio Code",
		iconUrl: `${BASE_URL}/svg/vscode.svg`,
		monochromeIcon: false,
		configFileLabel: ".vscode/mcp.json",
		snippetKind: "json",
		prerequisites: ["Install the GitHub Copilot and GitHub Copilot Chat extensions."],
		steps: [
			"Create or open .vscode/mcp.json at the root of your project.",
			"Paste the configuration below.",
			"Click Start on the MCP server in VS Code.",
		],
		getSnippet: getVscodeMcpConfigJson,
	},
	{
		id: "cursor",
		label: "Cursor",
		iconUrl: "https://cdn.simpleicons.org/cursor",
		monochromeIcon: true,
		configFileLabel: ".cursor/mcp.json",
		snippetKind: "json",
		steps: [
			"Open Cursor Settings, then MCP.",
			"Add a new server or edit ~/.cursor/mcp.json.",
			"Paste the configuration below, save, and restart Cursor if needed.",
		],
		getSnippet: getHttpMcpConfigJson,
	},
	{
		id: "claude",
		label: "Claude",
		iconUrl: `${BASE_URL}/svg/claude-ai.svg`,
		monochromeIcon: false,
		prerequisites: ["Use Claude Code in the terminal or Claude Desktop as your MCP client."],
		variants: [
			{
				title: "Claude Code",
				configFileLabel: "terminal",
				snippetKind: "bash",
				analyticsClient: "claude_code",
				steps: ["Run the command below in your terminal.", "Start a Claude Code session by running claude."],
				getSnippet: getClaudeCodeAddCommand,
			},
			{
				title: "Claude Desktop",
				configFileLabel: "claude_desktop_config.json",
				snippetKind: "json",
				analyticsClient: "claude_desktop",
				steps: ["Open your Claude Desktop config file.", "Paste the configuration below under mcpServers.", "Restart Claude Desktop."],
				getSnippet: getMcpRemoteConfigJson,
			},
		],
	},
	{
		id: "windsurf",
		label: "Windsurf",
		iconUrl: "https://cdn.simpleicons.org/windsurf",
		monochromeIcon: true,
		configFileLabel: ".codeium/windsurf/mcp_config.json",
		snippetKind: "json",
		steps: [
			"Navigate to Settings > Windsurf Settings > Cascade.",
			'Click "Manage MCPs", then "View raw config".',
			"Paste the configuration below and refresh the MCP list if needed.",
		],
		getSnippet: getMcpRemoteConfigJson,
	},
	{
		id: "zed",
		label: "Zed",
		iconUrl: "https://cdn.simpleicons.org/zedindustries",
		monochromeIcon: true,
		configFileLabel: ".config/zed/settings.json",
		snippetKind: "json",
		steps: [
			"Go to Settings > Open Settings.",
			"In settings.json, add the context server block below.",
			"Restart Zed if the server does not appear.",
		],
		getSnippet: getZedMcpConfigJson,
	},
	{
		id: "custom",
		label: "Custom MCP client",
		useLucideIcon: "plug",
		monochromeIcon: false,
		configFileLabel: "client MCP config",
		snippetKind: "json",
		steps: [
			"Paste the configuration below into your client's MCP settings.",
			"Ensure Node.js and npx are available.",
			"Restart your MCP client.",
		],
		getSnippet: getMcpRemoteConfigJson,
	},
]
