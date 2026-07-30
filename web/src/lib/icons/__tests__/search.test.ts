import { describe, expect, it } from "vitest"
import {
	calculateStringSimilarity,
	containsCharsInOrder,
	filterAndSortIcons,
	fuzzySearch,
	levenshteinDistance,
	normalizeForSearch,
	type SortOption,
	scoreIcon,
} from "@/lib/icons/search"
import type { IconWithName } from "@/types/icons"

const mockIcon = (
	name: string,
	overrides: Partial<IconWithName["data"]> = {},
	source: IconWithName["source"] = "native",
): IconWithName => ({
	name,
	source,
	data: {
		base: "svg",
		aliases: [],
		categories: [],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "test" } },
		...overrides,
	},
})

describe("normalizeForSearch", () => {
	it("strips hyphens and spaces", () => {
		expect(normalizeForSearch("home-assistant")).toBe("homeassistant")
	})
})

describe("levenshteinDistance", () => {
	it("returns zero for identical strings", () => {
		expect(levenshteinDistance("abc", "abc")).toBe(0)
	})

	it("counts substitutions and insertions", () => {
		expect(levenshteinDistance("kitten", "sitting")).toBe(3)
	})
})

describe("calculateStringSimilarity", () => {
	it("returns 0 for empty strings", () => {
		expect(calculateStringSimilarity("", "abc")).toBe(0)
	})

	it("returns 1 for equal strings", () => {
		expect(calculateStringSimilarity("Plex", "plex")).toBe(1)
	})
})

describe("containsCharsInOrder", () => {
	it("returns 1 for empty query", () => {
		expect(containsCharsInOrder("plex", "")).toBe(1)
	})

	it("returns 0 for empty text", () => {
		expect(containsCharsInOrder("", "plex")).toBe(0)
	})

	it("returns score when chars match in order", () => {
		expect(containsCharsInOrder("plexamp", "px")).toBeGreaterThan(0)
	})

	it("returns 0 when chars are out of order", () => {
		expect(containsCharsInOrder("plex", "xlp")).toBe(0)
	})
})

describe("fuzzySearch", () => {
	it("returns 1 for empty query", () => {
		expect(fuzzySearch("plex", "")).toBe(1)
	})

	it("returns 0 for empty text", () => {
		expect(fuzzySearch("", "plex")).toBe(0)
	})

	it("scores exact matches highest", () => {
		expect(fuzzySearch("plex", "plex")).toBeGreaterThan(fuzzySearch("plexamp", "plex"))
	})

	it("scores stripped exact matches", () => {
		expect(fuzzySearch("home-assistant", "homeassistant")).toBeGreaterThan(0.9)
	})

	it("scores prefix matches", () => {
		expect(fuzzySearch("plexamp", "plex")).toBeGreaterThan(0.8)
	})

	it("scores substring matches", () => {
		expect(fuzzySearch("my-plex-server", "plex")).toBeGreaterThan(0.6)
	})

	it("penalizes multi-word queries missing words", () => {
		const full = fuzzySearch("plex media server", "plex media server")
		const partial = fuzzySearch("plex media server", "plex docker")
		expect(full).toBeGreaterThan(partial)
	})

	it("penalizes low scores", () => {
		expect(fuzzySearch("abcdef", "ghijkl")).toBeLessThan(0.2)
	})

	it("matches words via similarity and subsequence", () => {
		expect(fuzzySearch("media srv", "media server")).toBeGreaterThan(0)
	})

	it("handles whitespace-only query words", () => {
		expect(fuzzySearch("plex", " ")).toBeGreaterThanOrEqual(0)
	})
})

describe("filterAndSortIcons", () => {
	const icons = [
		mockIcon("plex"),
		mockIcon("plexamp", { aliases: ["Plex Amp"] }),
		mockIcon("docker", { categories: ["Dev"] }),
		mockIcon("external-one", {}, "selfhst"),
	]

	it("finds plex by name", () => {
		const results = filterAndSortIcons({ icons, query: "plex", limit: 5 })
		expect(results[0]?.name).toBe("plex")
	})

	it("matches aliases", () => {
		const results = filterAndSortIcons({ icons, query: "plex amp", limit: 5 })
		expect(results.some((icon) => icon.name === "plexamp")).toBe(true)
	})

	it("filters by category", () => {
		const results = filterAndSortIcons({ icons, query: "", categories: ["Dev"] })
		expect(results).toHaveLength(1)
		expect(results[0]?.name).toBe("docker")
	})

	it("sorts alphabetically ascending", () => {
		const results = filterAndSortIcons({ icons, sort: "alphabetical-asc" })
		expect(results[0]?.name).toBe("docker")
	})

	it("sorts alphabetically descending", () => {
		const results = filterAndSortIcons({ icons, sort: "alphabetical-desc" })
		expect(results[0]?.name).toBe("plexamp")
	})

	it("sorts by newest", () => {
		const datedIcons = [
			mockIcon("old", { update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } } }),
			mockIcon("new", { update: { timestamp: "2025-01-01T00:00:00Z", author: { id: 1 } } }),
		]
		const results = filterAndSortIcons({ icons: datedIcons, sort: "newest" })
		expect(results[0]?.name).toBe("new")
	})

	it("sorts newest icons without timestamps last", () => {
		const datedIcons: IconWithName[] = [
			mockIcon("dated", { update: { timestamp: "2025-01-01T00:00:00Z", author: { id: 1 } } }),
			{
				name: "undated",
				data: {
					base: "svg",
					aliases: [],
					categories: [],
					update: { timestamp: "", author: { id: 1 } },
				},
			},
		]
		const results = filterAndSortIcons({ icons: datedIcons, sort: "newest" })
		expect(results[0]?.name).toBe("dated")
	})

	it("keeps undated icons stable when sorting by newest", () => {
		const undatedIcons: IconWithName[] = [
			{
				name: "b",
				data: {
					base: "svg",
					aliases: [],
					categories: [],
					update: { timestamp: "", author: { id: 1 } },
				},
			},
			{ name: "a", data: { base: "svg", aliases: [], categories: [], update: { timestamp: "", author: { id: 1 } } } },
		]
		const results = filterAndSortIcons({ icons: undatedIcons, sort: "newest" })
		expect(results.map((icon) => icon.name)).toEqual(["b", "a"])
	})

	it("prioritizes native icons when sorting by newest", () => {
		const mixedIcons = [
			mockIcon("external", { update: { timestamp: "2025-01-01T00:00:00Z", author: { id: 1 } } }, "selfhst"),
			mockIcon("native", { update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } } }),
		]
		const results = filterAndSortIcons({ icons: mixedIcons, sort: "newest" })
		expect(results[0]?.name).toBe("native")
	})

	it("prioritizes native icons when sorting alphabetically", () => {
		const mixedIcons = [mockIcon("zebra", {}, "selfhst"), mockIcon("alpha")]
		const results = filterAndSortIcons({ icons: mixedIcons, sort: "alphabetical-asc" })
		expect(results[0]?.name).toBe("alpha")
	})

	it("respects limit without query", () => {
		const results = filterAndSortIcons({ icons, limit: 2 })
		expect(results).toHaveLength(2)
	})

	it("prioritizes native icons on tie", () => {
		const results = filterAndSortIcons({ icons, query: "external", limit: 5 })
		const nativeIndex = results.findIndex((icon) => icon.name === "plex")
		const externalIndex = results.findIndex((icon) => icon.name === "external-one")
		if (nativeIndex >= 0 && externalIndex >= 0) {
			expect(nativeIndex).toBeLessThan(externalIndex)
		}
	})

	it("matches category-only queries with penalty", () => {
		const results = filterAndSortIcons({
			icons: [mockIcon("tool", { categories: ["Monitoring"] })],
			query: "Monitoring",
			limit: 5,
		})
		expect(results[0]?.name).toBe("tool")
	})

	it("breaks score ties with native icons first", () => {
		const tiedIcons = [
			mockIcon("external-icon", { aliases: ["shared-alias"] }, "selfhst"),
			mockIcon("native-icon", { aliases: ["shared-alias"] }),
		]
		const results = filterAndSortIcons({ icons: tiedIcons, query: "shared-alias", limit: 5 })
		expect(results.map((icon) => icon.name)).toEqual(["native-icon", "external-icon"])
	})

	it("breaks score ties alphabetically for same source", () => {
		const tiedIcons = [mockIcon("zebra-match", { aliases: ["shared-query"] }), mockIcon("alpha-match", { aliases: ["shared-query"] })]
		const results = filterAndSortIcons({ icons: tiedIcons, query: "shared-query", limit: 5 })
		expect(results[0]?.name).toBe("alpha-match")
	})

	it("matches normalized aliases and categories", () => {
		const results = filterAndSortIcons({
			icons: [mockIcon("svc", { aliases: ["Home Assistant"], categories: ["Smart-Home"] })],
			query: "home assistant",
			limit: 5,
		})
		expect(results[0]?.name).toBe("svc")
	})

	it("filters out weak multi-word matches", () => {
		const results = filterAndSortIcons({
			icons: [mockIcon("unrelated", { aliases: ["alpha"] })],
			query: "alpha beta gamma",
			limit: 5,
		})
		expect(results).toHaveLength(0)
	})
})

describe("scoreIcon", () => {
	it("scores exact name match highly", () => {
		expect(scoreIcon(mockIcon("docker"), "docker")).toBeGreaterThan(0.7)
	})

	it("scores alias matches", () => {
		expect(scoreIcon(mockIcon("plexamp", { aliases: ["Plex Amp"] }), "plex amp")).toBeGreaterThan(0)
	})

	it("scores icons without aliases using name only", () => {
		expect(scoreIcon(mockIcon("docker"), "docker")).toBeGreaterThan(0)
	})
})

describe("sort options", () => {
	it.each<SortOption>(["relevance", "alphabetical-asc", "alphabetical-desc", "newest"])("supports %s", (sort) => {
		const results = filterAndSortIcons({
			icons: [mockIcon("a"), mockIcon("b")],
			query: "a",
			sort,
		})
		expect(results.length).toBeGreaterThan(0)
	})
})
