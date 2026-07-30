import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearMetadataCacheForTests, getIconByName, searchIcons, suggestIcons } from "@/lib/icons/service"

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
}

vi.mock("next/cache", () => ({
	unstable_cache: (fn: () => Promise<unknown>) => fn,
}))

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
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("searchIcons", () => {
	it("returns plex for query plex", async () => {
		const { results, total } = await searchIcons("plex", 10)
		expect(total).toBeGreaterThan(0)
		expect(results[0]?.name).toBe("plex")
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

describe("suggestIcons", () => {
	it("suggests plex from service name", async () => {
		const { suggestions } = await suggestIcons("Plex media server", 5)
		expect(suggestions[0]?.name).toBe("plex")
	})
})
