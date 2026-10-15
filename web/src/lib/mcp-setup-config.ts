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
	{ name: "match_icons", description: "Best icon for up to 50 services in one call" },
	{ name: "search_icons", description: "Fuzzy search across every icon source" },
	{ name: "get_icon", description: "Every CDN URL, variant and license for one icon" },
	{ name: "get_icon_svg", description: "Raw SVG markup to inline in code" },
	{ name: "browse_icons", description: "Page through a category or the newest icons" },
	{ name: "list_categories", description: "Icon categories with counts" },
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
