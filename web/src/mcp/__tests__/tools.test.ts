import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DASHBOARD_ICONS_TOOLS, isAccountTool, registerDashboardIconsTools } from "@/mcp/tools"
import { READ_ONLY_ANNOTATIONS } from "@/mcp/tools/types"

const catalog = vi.hoisted(() => ({
	searchCatalog: vi.fn(),
	matchServices: vi.fn(),
	getCatalogIcon: vi.fn(),
	getCatalogIconSvg: vi.fn(),
	listCatalogCategories: vi.fn(),
	browseCatalog: vi.fn(),
}))

vi.mock("@/lib/icons/catalog", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/icons/catalog")>()),
	...catalog,
}))

type ToolCallback = (args: Record<string, unknown>) => Promise<CallToolResult>

function registerWithFakeServer(caller: Parameters<typeof registerDashboardIconsTools>[1], publicOnly = false) {
	const callbacks = new Map<string, ToolCallback>()
	const registerTool = vi.fn((name: string, _config: unknown, callback: ToolCallback) => {
		callbacks.set(name, callback)
	})
	registerDashboardIconsTools({ registerTool } as unknown as McpServer, caller, publicOnly)
	return { registerTool, call: (name: string, args: Record<string, unknown>) => callbacks.get(name)?.(args) }
}

function textOf(result: CallToolResult | undefined): string {
	const [block] = result?.content ?? []
	if (block?.type !== "text") throw new Error("expected a text block")
	return block.text
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("tool registry", () => {
	it("registers exactly the six public tools and cannot dispatch account tools", () => {
		const { registerTool, call } = registerWithFakeServer(null, true)
		expect(registerTool.mock.calls.map(([name]) => name)).toEqual([
			"match_icons",
			"search_icons",
			"get_icon",
			"get_icon_svg",
			"browse_icons",
			"list_categories",
		])
		for (const name of ["submit_icon", "propose_icon_update", "list_my_submissions", "get_more_tools"]) {
			expect(call(name, {})).toBeUndefined()
		}
	})

	it("lists the public read-only tools and the account tools with categories", () => {
		expect(DASHBOARD_ICONS_TOOLS.map((tool) => [tool.name, tool.access, tool.config._meta?.category])).toEqual([
			["match_icons", "public", "discovery"],
			["search_icons", "public", "discovery"],
			["get_icon", "public", "details"],
			["get_icon_svg", "public", "details"],
			["browse_icons", "public", "discovery"],
			["list_categories", "public", "discovery"],
			["submit_icon", "account", "account"],
			["propose_icon_update", "account", "account"],
			["list_my_submissions", "account", "account"],
		])
		for (const tool of DASHBOARD_ICONS_TOOLS) {
			if (tool.access === "public" || tool.name === "list_my_submissions") expect(tool.config.annotations).toEqual(READ_ONLY_ANNOTATIONS)
			expect(tool.config.description.length).toBeGreaterThan(80)
		}
		expect(DASHBOARD_ICONS_TOOLS).toHaveLength(9)
	})

	it("advertises output schemas that tolerate extra top-level keys", () => {
		for (const tool of DASHBOARD_ICONS_TOOLS) {
			const output = tool.config.outputSchema["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			expect(output.type).toBe("object")
			expect(output.additionalProperties).not.toBe(false)
			const input = tool.config.inputSchema["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			expect(input.type).toBe("object")
			expect(input.anyOf ?? input.oneOf ?? input.allOf).toBeUndefined()
		}
	})

	it("only gates account tools", () => {
		for (const tool of DASHBOARD_ICONS_TOOLS) expect(isAccountTool(tool.name)).toBe(tool.access === "account")
		expect(isAccountTool("get_more_tools")).toBe(false)
	})

	it("registers every tool with its config", () => {
		const { registerTool } = registerWithFakeServer(null)
		expect(registerTool.mock.calls.map(([name, config]) => [name, config])).toEqual(
			DASHBOARD_ICONS_TOOLS.map((tool) => [tool.name, tool.config]),
		)
	})
})

describe("tool handlers", () => {
	it("search_icons forwards filters and returns compact JSON plus structured content", async () => {
		const found = { results: [{ name: "plex", title: "Plex", source: "native", preview_url: "u", score: 2 }], total: 1 }
		catalog.searchCatalog.mockResolvedValue(found)
		const result = await registerWithFakeServer(null).call("search_icons", {
			query: "plex",
			sources: ["native"],
			category: "media",
			limit: 5,
		})
		expect(catalog.searchCatalog).toHaveBeenCalledWith("plex", { sources: ["native"], category: "media", limit: 5 })
		expect(result?.structuredContent).toEqual(found)
		expect(textOf(result)).toBe(JSON.stringify(found))
	})

	it("match_icons matches every service in one call", async () => {
		const matched = { matches: [{ service: "Plex", best: null, alternatives: [] }], degraded_sources: ["selfhst"] }
		catalog.matchServices.mockResolvedValue(matched)
		const result = await registerWithFakeServer(null).call("match_icons", { services: ["Plex"] })
		expect(catalog.matchServices).toHaveBeenCalledWith(["Plex"], { sources: undefined })
		expect(result?.structuredContent).toEqual(matched)
	})

	it("get_icon reports misses as data, not errors", async () => {
		const miss = { found: false, did_you_mean: [] }
		catalog.getCatalogIcon.mockResolvedValue(miss)
		const result = await registerWithFakeServer(null).call("get_icon", { name: "nope", source: "lobehub" })
		expect(catalog.getCatalogIcon).toHaveBeenCalledWith("nope", { source: "lobehub" })
		expect(result?.isError).toBeUndefined()
		expect(result?.structuredContent).toEqual(miss)
	})

	it("get_icon_svg returns the markup as the text block when available", async () => {
		const svg = { found: true, name: "plex", source: "native", theme: "dark", svg: "<svg>plex</svg>", url: "u" }
		catalog.getCatalogIconSvg.mockResolvedValue(svg)
		const { call } = registerWithFakeServer(null)
		const result = await call("get_icon_svg", { name: "plex", theme: "dark" })
		expect(catalog.getCatalogIconSvg).toHaveBeenCalledWith("plex", { source: undefined, theme: "dark" })
		expect(textOf(result)).toBe("<svg>plex</svg>")
		expect(result?.structuredContent).toEqual(svg)

		const unavailable = { found: true, name: "ntopng", source: "native", theme: "default", svg: null, url: null, reason: "no_svg" }
		catalog.getCatalogIconSvg.mockResolvedValue(unavailable)
		expect(JSON.parse(textOf(await call("get_icon_svg", { name: "ntopng", theme: "default" })))).toEqual(unavailable)
	})

	it("list_categories and browse_icons pass their options through", async () => {
		catalog.listCatalogCategories.mockResolvedValue({ categories: [{ name: "AI", count: 2 }] })
		catalog.browseCatalog.mockResolvedValue({ items: [], total: 0, next_cursor: null })
		const { call } = registerWithFakeServer(null)

		expect((await call("list_categories", { source: "lobehub" }))?.structuredContent).toEqual({ categories: [{ name: "AI", count: 2 }] })
		expect(catalog.listCatalogCategories).toHaveBeenCalledWith({ source: "lobehub" })

		const options = { category: "AI", sort: "newest", limit: 10, cursor: "20" }
		expect((await call("browse_icons", options))?.structuredContent).toEqual({ items: [], total: 0, next_cursor: null })
		expect(catalog.browseCatalog).toHaveBeenCalledWith(options)
	})
})
