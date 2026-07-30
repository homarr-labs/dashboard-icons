import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	clearMetadataCacheForTests,
	getAllIcons,
	getIconByName,
	getIconUrl,
	searchIcons,
	suggestIcons,
	warmMetadataCache,
} from "@/lib/icons/service"

const MOCK_METADATA = {
	plex: {
		base: "svg",
		aliases: ["Plex Media Server"],
		categories: ["Media-Servers"],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "test" } },
	},
	docker: {
		base: "svg",
		aliases: [],
		categories: [],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "test" } },
	},
	dagster: {
		base: "svg",
		aliases: [],
		categories: [],
		colors: { light: "dagster-light", dark: "dagster-dark" },
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "test" } },
	},
}

vi.mock("next/cache", () => ({
	unstable_cache: (fn: () => Promise<unknown>) => fn,
}))

const readFileMock = vi.hoisted(() => vi.fn())

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>()
	return {
		...actual,
		readFile: readFileMock,
		default: {
			...actual,
			readFile: readFileMock,
		},
	}
})

beforeEach(() => {
	clearMetadataCacheForTests()
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers({ etag: '"abc"' }),
			json: async () => MOCK_METADATA,
		}),
	)
	delete process.env.DASHBOARD_ICONS_METADATA_PATH
})

afterEach(() => {
	vi.unstubAllGlobals()
	readFileMock.mockReset()
})

describe("searchIcons", () => {
	it("returns empty for blank query", async () => {
		expect(await searchIcons("   ")).toEqual({ results: [], total: 0 })
	})

	it("returns plex for query plex", async () => {
		const { results, total } = await searchIcons("plex", 10)
		expect(total).toBeGreaterThan(0)
		expect(results[0]?.name).toBe("plex")
	})

	it("filters by category", async () => {
		const { results } = await searchIcons("plex", 10, "Media-Servers")
		expect(results.some((icon) => icon.name === "plex")).toBe(true)
	})
})

describe("getIconByName", () => {
	it("returns null for missing icon", async () => {
		expect(await getIconByName("nonexistent-icon-xyz")).toBeNull()
	})

	it("returns metadata for docker", async () => {
		const icon = await getIconByName("docker")
		expect(icon?.name).toBe("docker")
		expect(icon?.urls.svg).toContain("docker.svg")
	})
})

describe("getIconUrl", () => {
	it("returns null for missing icon", async () => {
		expect(await getIconUrl("missing-icon")).toBeNull()
	})

	it("resolves light theme using color variant", async () => {
		const result = await getIconUrl("dagster", "svg", "light")
		expect(result?.url).toContain("dagster-light")
	})

	it("resolves dark theme using color variant", async () => {
		const result = await getIconUrl("dagster", "png", "dark")
		expect(result?.url).toContain("dagster-dark.png")
	})

	it("uses default dark suffix when no color variant exists", async () => {
		const result = await getIconUrl("docker", "svg", "dark")
		expect(result?.url).toContain("docker-dark.svg")
	})
})

describe("suggestIcons", () => {
	it("returns empty for blank service name", async () => {
		expect(await suggestIcons("  ")).toEqual({ suggestions: [] })
	})

	it("suggests plex from service name", async () => {
		const { suggestions } = await suggestIcons("Plex media server", 5)
		expect(suggestions[0]?.name).toBe("plex")
	})
})

describe("metadata loading", () => {
	it("uses in-memory cache on subsequent calls", async () => {
		const fetchMock = vi.mocked(fetch)
		await getAllIcons()
		await getAllIcons()
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("throws when remote metadata fetch fails", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 500,
			headers: new Headers(),
			json: async () => ({}),
		} as Response)
		await expect(getAllIcons()).rejects.toThrow("Failed to fetch metadata")
	})

	it("loads metadata from local path in development", async () => {
		process.env.DASHBOARD_ICONS_METADATA_PATH = "/tmp/metadata.json"
		readFileMock.mockResolvedValueOnce(JSON.stringify(MOCK_METADATA))
		clearMetadataCacheForTests()
		const data = await getAllIcons()
		expect(data).toEqual(MOCK_METADATA)
	})

	it("rejects local metadata path in production", async () => {
		vi.stubEnv("NODE_ENV", "production")
		process.env.DASHBOARD_ICONS_METADATA_PATH = "/tmp/metadata.json"
		await expect(getAllIcons()).rejects.toThrow("not allowed in production")
		vi.unstubAllEnvs()
	})

	it("warms metadata cache", async () => {
		await warmMetadataCache()
		expect(globalThis.__dashboardIconsMetadata?.data).toEqual(MOCK_METADATA)
	})

	it("sends If-None-Match when etag exists", async () => {
		await getAllIcons()
		globalThis.__dashboardIconsMetadata = undefined
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: new Headers({ etag: '"next"' }),
			json: async () => MOCK_METADATA,
		} as Response)
		await getAllIcons()
		const headers = vi.mocked(fetch).mock.calls.at(-1)?.[1]?.headers as Record<string, string>
		expect(headers["If-None-Match"]).toBe('"abc"')
	})

	it("reuses cached metadata on 304 responses", async () => {
		await getAllIcons()
		clearMetadataCacheForTests()
		vi.mocked(fetch).mockImplementationOnce(async () => {
			globalThis.__dashboardIconsMetadata = { data: MOCK_METADATA, etag: '"abc"' }
			return { status: 304, ok: false, headers: new Headers() } as Response
		})
		const data = await getAllIcons()
		expect(data).toEqual(MOCK_METADATA)
	})

	it("loads metadata when response has no etag", async () => {
		clearMetadataCacheForTests()
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: new Headers(),
			json: async () => MOCK_METADATA,
		} as Response)
		await getAllIcons()
		expect(vi.mocked(fetch)).toHaveBeenCalled()
	})
})
