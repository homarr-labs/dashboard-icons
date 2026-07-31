import { describe, expect, it } from "vitest"
import {
	getClaudeCodeAddCommand,
	getHttpMcpConfigJson,
	getIconUrlExampleJson,
	getMcpEndpointUrl,
	getMcpRemoteConfigJson,
	getVscodeMcpConfigJson,
	getZedMcpConfigJson,
	MCP_CLIENT_GUIDES,
	MCP_TOOLS,
	type McpClientGuide,
	type McpClientSetupVariant,
} from "../mcp-setup-config"

const WEB = "https://dashboardicons.com"
const ENDPOINT = `${WEB}/api/mcp`

type GuideSnippet = {
	guide: McpClientGuide
	variant: McpClientSetupVariant | null
	snippet: string
}

function getGuideSnippets(webUrl: string): GuideSnippet[] {
	const snippets: GuideSnippet[] = []

	for (const guide of MCP_CLIENT_GUIDES) {
		if (guide.variants?.length) {
			for (const variant of guide.variants) {
				snippets.push({
					guide,
					variant,
					snippet: variant.getSnippet(webUrl),
				})
			}
			continue
		}

		snippets.push({
			guide,
			variant: null,
			snippet: guide.getSnippet?.(webUrl) ?? "",
		})
	}

	return snippets
}

describe("mcp-setup-config", () => {
	it("builds endpoint url", () => {
		expect(getMcpEndpointUrl(WEB)).toBe(ENDPOINT)
	})

	it("builds http config json for Cursor", () => {
		const json = getHttpMcpConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.mcpServers["dashboard-icons"].url).toBe(ENDPOINT)
	})

	it("builds mcp-remote config json", () => {
		const json = getMcpRemoteConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.mcpServers["dashboard-icons"].command).toBe("npx")
		expect(parsed.mcpServers["dashboard-icons"].args).toContain(ENDPOINT)
	})

	it("builds vscode config json", () => {
		const json = getVscodeMcpConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.servers["dashboard-icons"].args).toContain(ENDPOINT)
	})

	it("builds zed config json", () => {
		const json = getZedMcpConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.context_servers["dashboard-icons"].command).toBe("npx")
		expect(parsed.context_servers["dashboard-icons"].args).toContain(ENDPOINT)
	})

	it("builds claude code command", () => {
		const command = getClaudeCodeAddCommand(WEB)
		expect(command).toContain("claude mcp add dashboard-icons")
		expect(command).toContain(ENDPOINT)
	})

	it("builds icon example json", () => {
		const json = getIconUrlExampleJson("1337x")
		expect(JSON.parse(json)).toEqual({
			tool: "get_icon_url",
			arguments: { name: "1337x", format: "svg" },
		})
	})

	it("lists four tools", () => {
		expect(MCP_TOOLS).toHaveLength(4)
	})

	it("defines six client guides with valid snippets", () => {
		expect(MCP_CLIENT_GUIDES).toHaveLength(6)
		expect(MCP_CLIENT_GUIDES.map((guide) => guide.id)).toEqual(["vscode", "cursor", "claude", "windsurf", "zed", "custom"])

		const claudeGuide = MCP_CLIENT_GUIDES.find((guide) => guide.id === "claude")
		expect(claudeGuide?.variants).toHaveLength(2)

		for (const { guide, variant, snippet } of getGuideSnippets(WEB)) {
			const snippetKind = variant?.snippetKind ?? guide.snippetKind
			if (snippetKind === "json") {
				expect(() => JSON.parse(snippet)).not.toThrow()
			}
			expect(snippet).toContain(ENDPOINT)
			if (guide.iconUrl) {
				expect(guide.iconUrl).toMatch(/^https:\/\//)
			}
		}
	})
})
