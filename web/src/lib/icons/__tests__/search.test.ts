import { describe, expect, it } from "vitest"
import { getNativeIconVariants } from "@/lib/icons/files"
import {
	calculateStringSimilarity,
	containsCharsInOrder,
	filterAndSortIcons,
	findMatchedVariant,
	fuzzySearch,
	levenshteinDistance,
	normalizeForSearch,
	type SortOption,
	scoreIcon,
} from "@/lib/icons/search"
import { type IconVariantMatch, matchIconVariant, resolveIconVariants, variantToneClass } from "@/lib/icons/variants"
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

	it("keeps early subsequence matches normalized", () => {
		expect(containsCharsInOrder("plex media server for home", "p")).toBeLessThanOrEqual(1)
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

describe("variant search", () => {
	it("omits declared files that do not exist in the native format inventory", () => {
		const icon = mockIcon("sonarr", { variants: { missing: "sonarr-missing-variant" } })
		expect(getNativeIconVariants(icon.name, icon.data).map(({ stem }) => stem)).toEqual(["sonarr"])
	})

	it("keeps an exact compound brand match instead of reinterpreting its suffix as a Variant", () => {
		const icon = mockIcon("github-light", { colors: { light: "github-light-white" } })
		expect(findMatchedVariant(icon, "github light")).toBeNull()
		expect(scoreIcon(icon, "github light")).toBeCloseTo(3.3833)
		expect(filterAndSortIcons({ icons: [icon], query: "github light" })).toEqual([icon])
	})

	it("does not select a Variant for blank queries", () => {
		expect(findMatchedVariant(mockIcon("sonarr"), " \t ")).toBeNull()
	})

	it.each([
		[undefined, undefined],
		["default", undefined],
		["wordmark", undefined],
		["light", "bg-zinc-900 ring-zinc-700"],
		["dark", "bg-white ring-zinc-200"],
		["wordmark-light", "bg-zinc-900 ring-zinc-700"],
		["wordmark-dark", "bg-white ring-zinc-200"],
		["animated-light", "bg-zinc-900 ring-zinc-700"],
		["animated-dark", "bg-white ring-zinc-200"],
		["animated", undefined],
	])("chooses a readable preview background for %s", (key, expected) => {
		let variant: IconVariantMatch | undefined
		if (key) variant = { key, label: key, stem: `sonarr-${key}` }
		expect(variantToneClass(variant)).toBe(expected)
	})

	it("ignores reserved Custom keys without losing legitimate variants", () => {
		const icon = mockIcon("sonarr", { variants: { light: "sonarr-invalid-light", outline: "sonarr-outline" } })
		expect(resolveIconVariants(icon.name, icon.data)).toEqual([
			{ key: "default", label: "Base", stem: "sonarr", keys: ["default"] },
			{ key: "outline", label: "outline", stem: "sonarr-outline", keys: ["outline"] },
		])
		expect(matchIconVariant(icon, "sonarr light")).toBeNull()
	})

	it("does not expose an empty Base stem while resolving available declared variants", () => {
		expect(resolveIconVariants("", { variants: { outline: "sonarr-outline" } })).toEqual([
			{ key: "outline", label: "outline", stem: "sonarr-outline", keys: ["outline"] },
		])
	})

	it("does not match a Custom term without a parent name", () => {
		const icon = mockIcon("sonarr", { variants: { "animated-outline": "sonarr-animated-outline" } })
		expect(matchIconVariant(icon, "animated outline")).toBeNull()
		expect(matchIconVariant(icon, "sonarr animated outline")).toMatchObject({ key: "animated-outline", rest: "sonarr" })
	})

	it("uses actual per-stem formats for mixed SVG and PNG Custom variants", () => {
		const svgBase = mockIcon("sonarr", { base: "svg", variants: { raster: "radarr-3d" } })
		const pngBase = mockIcon("radarr-3d", { base: "png", variants: { vector: "sonarr" } })
		expect(getNativeIconVariants(svgBase.name, svgBase.data).find((variant) => variant.key === "raster")?.formats).toEqual(["png", "webp"])
		expect(getNativeIconVariants(pngBase.name, pngBase.data).find((variant) => variant.key === "vector")?.formats).toEqual([
			"svg",
			"png",
			"webp",
		])
	})

	const github = mockIcon("github", { colors: { dark: "github", light: "github-light" } })
	const helix = mockIcon("helix", { wordmark: { light: "helix-light", dark: "helix-dark" } })
	const sonarr = mockIcon("sonarr", { variants: { "4k": "sonarr-4k" } })
	const icons = [mockIcon("github-desktop"), github, helix, mockIcon("helixcore"), sonarr]

	it.each([
		["github white", "github", "light", "github-light"],
		["github for dark background", "github", "light", "github-light"],
		["helix wordmark", "helix", "wordmark-light", "helix-light"],
		["sonarr 4k", "sonarr", "4k", "sonarr-4k"],
	])("ranks the parent icon first for %s and reports the matched Variant", (query, name, key, stem) => {
		const [first] = filterAndSortIcons({ icons, query })
		expect(first?.name).toBe(name)
		expect(findMatchedVariant(first, query)).toMatchObject({ key, stem })
	})

	it.each([
		["dark mode", mockIcon("rust", { aliases: ["modern-language"], colors: { light: "rust", dark: "rust-dark" } })],
		["white logo", mockIcon("nrk-logo", { colors: { light: "nrk-logo-light" } })],
		["dark reader", mockIcon("readwise-reader", { aliases: ["reader"], colors: { dark: "readwise-reader-dark" } })],
		["github dark", mockIcon("gitea", { categories: ["github"], colors: { dark: "gitea-dark" } })],
	])("reports no Variant for %s", (query, icon) => {
		expect(findMatchedVariant(icon, query)).toBeNull()
	})

	it("reports no Variant for plain name queries", () => {
		expect(findMatchedVariant(github, "github")).toBeNull()
		expect(findMatchedVariant(helix, "helix dark")).toBeNull()
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
