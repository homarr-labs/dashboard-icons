import { describe, expect, it } from "vitest"
import {
	getClaudeCodeAddCommand,
	getHttpMcpConfigJson,
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
		expect(parsed.mcpServers["dashboard-icons"].args).toEqual(["-y", "mcp-remote@0.15.1", ENDPOINT])
	})

	it("builds vscode config json", () => {
		const json = getVscodeMcpConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.servers["dashboard-icons"]).toEqual({ type: "http", url: ENDPOINT })
	})

	it("builds zed config json", () => {
		const json = getZedMcpConfigJson(WEB)
		const parsed = JSON.parse(json)
		expect(parsed.context_servers["dashboard-icons"]).toEqual({ url: ENDPOINT })
	})

	it("builds claude code command", () => {
		const command = getClaudeCodeAddCommand(WEB)
		expect(command).toBe(`claude mcp add --transport http dashboard-icons ${ENDPOINT}`)
	})

	it("lists the public MCP tools", () => {
		expect(MCP_TOOLS.map((tool) => tool.name)).toEqual([
			"match_icons",
			"search_icons",
			"get_icon",
			"get_icon_svg",
			"browse_icons",
			"list_categories",
		])
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

describe("native MCP setup guides", () => {
	it("uses the remote Cascade schema for Windsurf", () => {
		const guide = MCP_CLIENT_GUIDES.find((item) => item.id === "windsurf")
		expect(JSON.parse(guide?.getSnippet?.(WEB) ?? "")).toEqual({
			mcpServers: { "dashboard-icons": { serverUrl: ENDPOINT } },
		})
	})

	it("gives Claude Desktop a copyable endpoint instead of a local config", () => {
		const desktop = MCP_CLIENT_GUIDES.find((guide) => guide.id === "claude")?.variants?.[1]
		expect(desktop?.snippetKind).toBe("text")
		expect(desktop?.getSnippet(WEB)).toBe(ENDPOINT)
		expect(desktop?.steps.join(" ")).toContain("Connectors")
		expect(desktop?.steps.join(" ")).not.toContain("Restart")
	})

	it("reserves the pinned stdio bridge for Custom MCP client", () => {
		const snippets = getGuideSnippets(WEB)
		expect(snippets).toHaveLength(7)
		for (const { guide, snippet } of snippets) {
			if (guide.id === "custom") {
				expect(snippet).toContain("mcp-remote@0.15.1")
			} else {
				expect(snippet).not.toContain("mcp-remote")
				expect(snippet).not.toContain("npx")
			}
		}
	})

	it("preserves alternate origins for every guide", () => {
		const origin = "https://icons.example.test"
		for (const { snippet } of getGuideSnippets(origin)) {
			expect(snippet).toContain(`${origin}/api/mcp`)
			expect(snippet).not.toContain(WEB)
		}
	})
})
