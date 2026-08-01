import type { McpServer } from "@modelcontextprotocol/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerDashboardIconsTools } from "@/mcp/tools"

const searchIcons = vi.fn()
const getIconByName = vi.fn()
const getIconUrl = vi.fn()
const suggestIcons = vi.fn()

vi.mock("@/lib/icons/service", () => ({
	searchIcons: (...args: unknown[]) => searchIcons(...args),
	getIconByName: (...args: unknown[]) => getIconByName(...args),
	getIconUrl: (...args: unknown[]) => getIconUrl(...args),
	suggestIcons: (...args: unknown[]) => suggestIcons(...args),
}))

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>

function createMockServer() {
	const handlers = new Map<string, ToolHandler>()
	const server = {
		registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
			handlers.set(name, handler)
		}),
	} as unknown as McpServer
	return { server, handlers }
}

function getHandler(handlers: Map<string, ToolHandler>, name: string): ToolHandler {
	const handler = handlers.get(name)
	if (!handler) {
		throw new Error(`Missing handler: ${name}`)
	}
	return handler
}

describe("registerDashboardIconsTools", () => {
	beforeEach(() => {
		searchIcons.mockResolvedValue({ results: [], total: 0 })
		getIconByName.mockResolvedValue(null)
		getIconUrl.mockResolvedValue(null)
		suggestIcons.mockResolvedValue({ suggestions: [] })
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("registers all four tools", () => {
		const { server } = createMockServer()
		registerDashboardIconsTools(server)
		expect(server.registerTool).toHaveBeenCalledTimes(4)
	})

	it("search_icons returns json content", async () => {
		searchIcons.mockResolvedValue({ results: [{ name: "plex" }], total: 1 })
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "search_icons")({ query: "plex", limit: 5 })
		expect(JSON.parse(result.content[0].text)).toEqual({ results: [{ name: "plex" }], total: 1 })
	})

	it("get_icon returns not_found when missing", async () => {
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "get_icon")({ name: "missing" })
		expect(JSON.parse(result.content[0].text)).toMatchObject({ error: "not_found" })
		expect(result.isError).toBe(true)
	})

	it("get_icon returns icon when found", async () => {
		getIconByName.mockResolvedValue({ name: "docker", urls: { svg: "x" } })
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "get_icon")({ name: "docker" })
		expect(JSON.parse(result.content[0].text)).toMatchObject({ name: "docker" })
	})

	it("get_icon_url returns not_found when missing", async () => {
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "get_icon_url")({ name: "missing", format: "svg", theme: "default" })
		expect(JSON.parse(result.content[0].text)).toMatchObject({ error: "not_found" })
		expect(result.isError).toBe(true)
	})

	it("get_icon_url returns url when found", async () => {
		getIconUrl.mockResolvedValue({ url: "https://cdn/x.svg", name: "plex", format: "svg", theme: "default" })
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "get_icon_url")({ name: "plex", format: "svg", theme: "default" })
		expect(JSON.parse(result.content[0].text)).toMatchObject({ url: "https://cdn/x.svg" })
	})

	it("suggest_icon returns suggestions", async () => {
		suggestIcons.mockResolvedValue({ suggestions: [{ name: "plex", score: 2, url: "u" }] })
		const { server, handlers } = createMockServer()
		registerDashboardIconsTools(server)
		const result = await getHandler(handlers, "suggest_icon")({ service_name: "Plex", limit: 3 })
		expect(JSON.parse(result.content[0].text)).toEqual({ suggestions: [{ name: "plex", score: 2, url: "u" }] })
	})
})
