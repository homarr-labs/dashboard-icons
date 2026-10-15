import type { McpServer, ReadResourceTemplateCallback, ResourceTemplate } from "@modelcontextprotocol/server"
import { ResourceNotFoundError } from "@modelcontextprotocol/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { completeIconName, ICON_RESOURCE_TEMPLATE, registerDashboardIconsResources } from "@/mcp/resources"

const catalog = vi.hoisted(() => ({ searchCatalog: vi.fn(), getCatalogIconSvg: vi.fn() }))

vi.mock("@/lib/icons/catalog", () => catalog)

function register() {
	const registerResource = vi.fn()
	registerDashboardIconsResources({ registerResource } as unknown as McpServer)
	const [name, template, config, read] = registerResource.mock.calls[0] as [
		string,
		ResourceTemplate,
		{ mimeType: string },
		ReadResourceTemplateCallback,
	]
	return { name, template, config, read }
}

const ctx = {} as Parameters<ReadResourceTemplateCallback>[2]

beforeEach(() => {
	vi.clearAllMocks()
})

describe("icon SVG resource template", () => {
	it("registers the template with name completion and no listing", async () => {
		const { name, template, config } = register()
		expect(name).toBe("icon_svg")
		expect(template.uriTemplate.toString()).toBe(ICON_RESOURCE_TEMPLATE)
		expect(template.listCallback).toBeUndefined()
		expect(template.completeCallback("name")).toBe(completeIconName)
		expect(config.mimeType).toBe("image/svg+xml")
	})

	it("completes names from search, deduped across sources", async () => {
		catalog.searchCatalog.mockResolvedValue({ results: [{ name: "openai" }, { name: "openai" }, { name: "openwebui" }], total: 3 })
		expect(await completeIconName("open")).toEqual(["openai", "openwebui"])
		expect(catalog.searchCatalog).toHaveBeenCalledWith("open", { limit: 20 })
	})

	it("reads the SVG markup, decoding the name", async () => {
		catalog.getCatalogIconSvg.mockResolvedValue({
			found: true,
			name: "lmstudio",
			source: "native",
			theme: "default",
			svg: "<svg/>",
			url: "u",
		})
		const { read } = register()
		const uri = new URL("dashboard-icons://icons/LM%20Studio")
		expect(await read(uri, { name: "LM%20Studio" }, ctx)).toEqual({
			contents: [{ uri: uri.href, mimeType: "image/svg+xml", text: "<svg/>" }],
		})
		expect(catalog.getCatalogIconSvg).toHaveBeenCalledWith("LM Studio")
	})

	it("rejects oversized completion values without searching the catalog", async () => {
		expect(await completeIconName("x".repeat(101))).toEqual([])
		expect(catalog.searchCatalog).not.toHaveBeenCalled()
	})

	it.each(["x".repeat(81), "%61".repeat(81), "100%", "%E0%A4%A"])("rejects invalid resource names before catalog access", async (name) => {
		const { read } = register()
		await expect(read(new URL("dashboard-icons://icons/invalid"), { name }, ctx)).rejects.toBeInstanceOf(ResourceNotFoundError)
		expect(catalog.getCatalogIconSvg).not.toHaveBeenCalled()
	})

	it("accepts names and completion values at their length limits", async () => {
		catalog.searchCatalog.mockResolvedValue({ results: [] })
		await completeIconName("x".repeat(100))
		expect(catalog.searchCatalog).toHaveBeenCalledWith("x".repeat(100), { limit: 20 })
		catalog.getCatalogIconSvg.mockResolvedValue({ found: false, did_you_mean: [] })
		const { read } = register()
		await expect(read(new URL("dashboard-icons://icons/valid"), { name: "x".repeat(80) }, ctx)).rejects.toThrow(/No icon named/)
		expect(catalog.getCatalogIconSvg).toHaveBeenCalledWith("x".repeat(80))
	})

	it("fails with resource-not-found and suggestions for unknown icons or missing SVGs", async () => {
		const { read } = register()
		const uri = new URL("dashboard-icons://icons/plexx")

		catalog.getCatalogIconSvg.mockResolvedValue({ found: false, did_you_mean: [{ name: "plex" }] })
		await expect(read(uri, { name: "plexx" }, ctx)).rejects.toThrow(/Closest: plex/)

		catalog.getCatalogIconSvg.mockResolvedValue({ found: false, did_you_mean: [] })
		await expect(read(uri, { name: "plexx" }, ctx)).rejects.toThrow(/Closest: none/)

		catalog.getCatalogIconSvg.mockResolvedValue({ found: true, name: "ntopng", svg: null, url: null, reason: "no_svg" })
		await expect(read(uri, { name: "ntopng" }, ctx)).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
