import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ExternalSourceId } from "@/constants"
import {
	browseCatalog,
	CATALOG_SOURCES,
	getCatalogIcon,
	getCatalogIconSvg,
	listCatalogCategories,
	matchServices,
	searchCatalog,
} from "@/lib/icons/catalog"
import type { ExternalIcon, ExternalIconRecord, Icon, IconFile } from "@/types/icons"

const mocks = vi.hoisted(() => ({
	getAllIcons: vi.fn(),
	getExternalIcons: vi.fn(),
	getExternalIconBySourceAndSlug: vi.fn(),
	fetchTrustedSvg: vi.fn(),
}))

vi.mock("@/lib/icons/service", () => ({ getAllIcons: mocks.getAllIcons }))
vi.mock("@/lib/external-icons", () => ({
	getExternalIcons: mocks.getExternalIcons,
	getExternalIconBySourceAndSlug: mocks.getExternalIconBySourceAndSlug,
}))
vi.mock("@/lib/icons/svg-fetch", () => ({ fetchTrustedSvg: mocks.fetchTrustedSvg }))

const NATIVE_CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"
const SELFHST_CDN = "https://cdn.jsdelivr.net/gh/selfhst/icons"
const LOBEHUB_CDN = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest"
const LOBEHUB_PNG = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest"

function native(timestamp: string, overrides: Partial<Icon> = {}, author: Icon["update"]["author"] = { id: 1, name: "alice" }): Icon {
	return { base: "svg", aliases: [], categories: [], update: { timestamp, author }, ...overrides }
}

const NATIVE: IconFile = {
	plex: native("2024-01-01T00:00:00Z", { aliases: ["Plex Media Server"], categories: ["Media-Servers"] }),
	openai: native("2024-02-01T00:00:00Z", { categories: ["AI"] }, { id: 2, login: "bob" }),
	lmstudio: native("2024-03-01T00:00:00Z", { aliases: ["LM Studio"], categories: ["AI", "ai"] }, { id: 3 }),
	dagster: native("2024-04-01T00:00:00Z", { colors: { light: "dagster-light", dark: "dagster-dark" } }),
	ntopng: native("2024-05-01T00:00:00Z", { base: "png", colors: { light: "ntopng-light" } }),
	legacy: native("2024-06-01T00:00:00Z", { base: "avif" }),
	watchstate: native("2024-07-01T00:00:00Z", { aliases: ["Watch State", "—"], categories: ["media servers", ""] }),
}

function external(source: ExternalSourceId, slug: string, name: string, overrides: Partial<ExternalIcon> = {}): ExternalIconRecord {
	const icon: ExternalIcon = {
		id: `${source}-${slug}`,
		source,
		slug,
		name,
		aliases: [],
		categories: [],
		formats: ["svg"],
		variants: {},
		url_templates: {},
		license: "",
		attribution: "",
		source_url: "",
		...overrides,
	}
	return {
		source,
		slug,
		name,
		external: icon,
		data: {
			base: "svg",
			aliases: icon.aliases,
			categories: icon.categories,
			update: { timestamp: "2023-01-01T00:00:00Z", author: { id: source, name: source } },
		},
	}
}

const SELFHST_TEMPLATES = {
	svg: `${SELFHST_CDN}/svg/{slug}.svg`,
	png: `${SELFHST_CDN}/png/{slug}.png`,
	svg_light: `${SELFHST_CDN}/svg/{slug}-light.svg`,
	png_light: `${SELFHST_CDN}/png/{slug}-light.png`,
}

const EXTERNAL: ExternalIconRecord[] = [
	external("selfhst", "iventoy", "iVentoy", {
		formats: ["svg", "png"],
		variants: { light: true },
		url_templates: SELFHST_TEMPLATES,
		categories: ["Media-Servers", "Utilities"],
	}),
	external("selfhst", "openai", "OpenAI", { url_templates: SELFHST_TEMPLATES }),
	external("selfhst", "qbitrr", "qBitrr", { url_templates: SELFHST_TEMPLATES }),
	external("lobehub", "openai", "OpenAI", {
		formats: ["svg", "png", "webp"],
		variants: { light: true, dark: true },
		url_templates: {
			svg: `${LOBEHUB_CDN}/icons/{slug}.svg`,
			png: `${LOBEHUB_PNG}/light/{slug}.png`,
			png_light: `${LOBEHUB_PNG}/light/{slug}.png`,
			png_dark: `${LOBEHUB_PNG}/dark/{slug}.png`,
		},
	}),
	external("lobehub", "litellm", "LiteLLM", { url_templates: { svg: `${LOBEHUB_CDN}/icons/{slug}.svg` } }),
	external("simpleicons", "openai", "OpenAI", {
		formats: ["svg", "png"],
		variants: { light: true, dark: true },
		brand_color: "412991",
	}),
]

beforeEach(() => {
	vi.clearAllMocks()
	mocks.getAllIcons.mockResolvedValue(NATIVE)
	mocks.getExternalIcons.mockResolvedValue(EXTERNAL)
	mocks.getExternalIconBySourceAndSlug.mockResolvedValue(null)
	mocks.fetchTrustedSvg.mockResolvedValue("<svg/>")
})

describe("CATALOG_SOURCES", () => {
	it("lists native first, then every external source", () => {
		expect(CATALOG_SOURCES).toEqual(["native", "selfhst", "lobehub", "simpleicons"])
	})
})

describe("searchCatalog", () => {
	it("returns nothing for a blank query", async () => {
		expect(await searchCatalog("   ")).toEqual({ results: [], total: 0 })
	})

	it("merges sources with native winning ties and compact hits", async () => {
		const { results, total, degraded_sources } = await searchCatalog("openai")
		expect(degraded_sources).toBeUndefined()
		expect(total).toBe(4)
		expect(results.map((hit) => hit.source)).toEqual(["native", "selfhst", "lobehub", "simpleicons"])
		expect(results[0]).toEqual({
			name: "openai",
			title: "openai",
			source: "native",
			preview_url: `${NATIVE_CDN}/svg/openai.svg`,
			score: 3.6,
		})
		expect(results[2]?.preview_url).toBe(`${LOBEHUB_CDN}/icons/openai.svg`)
		expect(results[3]?.preview_url).toBe("https://cdn.simpleicons.org/openai/000000/FFFFFF")
	})

	it("filters by source, normalized category and limit", async () => {
		expect((await searchCatalog("openai", { sources: ["lobehub"] })).results.map((hit) => hit.source)).toEqual(["lobehub"])
		expect((await searchCatalog("openai", { sources: [] })).total).toBe(4)

		const media = await searchCatalog("media", { category: "media servers" })
		expect(media.results.map((hit) => hit.name).sort()).toEqual(["iventoy", "plex", "watchstate"])
		expect((await searchCatalog("openai", { category: "  " })).total).toBe(4)

		const limited = await searchCatalog("openai", { limit: 0 })
		expect(limited.results).toHaveLength(1)
		expect(limited.total).toBe(4)
	})

	it("degrades to native results when external icons are unavailable", async () => {
		mocks.getExternalIcons.mockResolvedValue([])
		const result = await searchCatalog("openai")
		expect(result.degraded_sources).toEqual(["selfhst", "lobehub", "simpleicons"])
		expect(result.results.map((hit) => hit.source)).toEqual(["native"])
	})

	it("degrades native results when metadata cannot load", async () => {
		mocks.getAllIcons.mockRejectedValue(new Error("offline"))
		const result = await searchCatalog("openai")
		expect(result.degraded_sources).toEqual(["native"])
		expect(result.results.map((hit) => hit.source)).toEqual(["selfhst", "lobehub", "simpleicons"])
	})
})

describe("matchServices", () => {
	it("returns the best match and alternatives per service", async () => {
		const { matches, degraded_sources } = await matchServices(["Plex", "LM Studio", "LiteLLM", "Plex Media Server", "zzqqxxjj", "  "])
		expect(degraded_sources).toBeUndefined()
		expect(matches.map((match) => [match.service, match.best?.name ?? null, match.best?.source ?? null])).toEqual([
			["Plex", "plex", "native"],
			["LM Studio", "lmstudio", "native"],
			["LiteLLM", "litellm", "lobehub"],
			["Plex Media Server", "plex", "native"],
			["zzqqxxjj", null, null],
			["  ", null, null],
		])
		expect(matches[4]?.alternatives).toEqual([])
	})

	it("falls back to fuzzy ranking, then to typo distance, when nothing matches exactly", async () => {
		const { matches } = await matchServices(["iVent", "Dagst", "Plexx", "Plexxxx", "abcd"], { limit: 1 })
		expect(matches.map((match) => match.best?.name ?? null)).toEqual(["iventoy", "dagster", "plex", null, null])
		expect(matches.every((match) => match.alternatives.length <= 1)).toBe(true)
	})

	it("honours the alternatives limit and sources", async () => {
		const many = await matchServices(["OpenAI"])
		expect(many.matches[0]?.alternatives.map((hit) => hit.source)).toEqual(["selfhst", "lobehub", "simpleicons"])

		const one = await matchServices(["OpenAI"], { limit: 1, sources: ["lobehub", "simpleicons"] })
		expect(one.matches[0]?.best?.source).toBe("lobehub")
		expect(one.matches[0]?.alternatives.map((hit) => hit.source)).toEqual(["simpleicons"])
	})
})

describe("getCatalogIcon", () => {
	it("returns full native metadata with every existing URL variant", async () => {
		const result = await getCatalogIcon(" Dagster ")
		expect(result).toEqual({
			found: true,
			icon: {
				name: "dagster",
				title: "dagster",
				source: "native",
				preview_url: `${NATIVE_CDN}/svg/dagster.svg`,
				aliases: [],
				categories: [],
				author: "alice",
				updated_at: "2024-04-01T00:00:00Z",
				brand_color: null,
				license: null,
				page_url: "https://dashboardicons.com/icons/dagster",
				urls: {
					svg: {
						default: `${NATIVE_CDN}/svg/dagster.svg`,
						light: `${NATIVE_CDN}/svg/dagster-light.svg`,
						dark: `${NATIVE_CDN}/svg/dagster-dark.svg`,
					},
					png: {
						default: `${NATIVE_CDN}/png/dagster.png`,
						light: `${NATIVE_CDN}/png/dagster-light.png`,
						dark: `${NATIVE_CDN}/png/dagster-dark.png`,
					},
					webp: {
						default: `${NATIVE_CDN}/webp/dagster.webp`,
						light: `${NATIVE_CDN}/webp/dagster-light.webp`,
						dark: `${NATIVE_CDN}/webp/dagster-dark.webp`,
					},
				},
			},
		})
	})

	it("omits SVG for raster-only native icons and falls back on authors", async () => {
		const ntopng = await getCatalogIcon("ntopng")
		if (!ntopng.found) throw new Error("expected ntopng")
		expect(ntopng.icon.preview_url).toBe(`${NATIVE_CDN}/png/ntopng.png`)
		expect(ntopng.icon.urls).toEqual({
			png: { default: `${NATIVE_CDN}/png/ntopng.png`, light: `${NATIVE_CDN}/png/ntopng-light.png` },
			webp: { default: `${NATIVE_CDN}/webp/ntopng.webp`, light: `${NATIVE_CDN}/webp/ntopng-light.webp` },
		})

		const legacy = await getCatalogIcon("legacy")
		if (!legacy.found) throw new Error("expected legacy")
		expect(legacy.icon.preview_url).toBe(`${NATIVE_CDN}/svg/legacy.svg`)

		const openai = await getCatalogIcon("openai")
		const lmstudio = await getCatalogIcon("lmstudio")
		expect(openai.found && openai.icon.author).toBe("bob")
		expect(lmstudio.found && lmstudio.icon.author).toBeNull()
	})

	it("falls back to external sources and uses the full record for licensing", async () => {
		mocks.getExternalIconBySourceAndSlug.mockResolvedValue({
			...EXTERNAL[0],
			external: {
				...EXTERNAL[0]?.external,
				variants: undefined,
				license: "CC BY 4.0",
				license_url: "https://creativecommons.org/licenses/by/4.0/",
				attribution: "Icons by selfh.st",
				source_url: "https://selfh.st/icons/",
				guidelines_url: "https://selfh.st/guidelines",
			},
		})
		const result = await getCatalogIcon("iventoy")
		expect(mocks.getExternalIconBySourceAndSlug).toHaveBeenCalledWith("selfhst", "iventoy")
		expect(result).toEqual({
			found: true,
			icon: {
				name: "iventoy",
				title: "iVentoy",
				source: "selfhst",
				preview_url: `${SELFHST_CDN}/svg/iventoy.svg`,
				aliases: [],
				categories: ["Media-Servers", "Utilities"],
				author: "selfh.st/icons",
				updated_at: "2023-01-01T00:00:00Z",
				brand_color: null,
				license: {
					name: "CC BY 4.0",
					url: "https://creativecommons.org/licenses/by/4.0/",
					attribution: "Icons by selfh.st",
					source_url: "https://selfh.st/icons/",
					guidelines_url: "https://selfh.st/guidelines",
					provider: "selfh.st",
					provider_url: "https://selfh.st/icons/",
				},
				page_url: "https://dashboardicons.com/icons/external/iventoy",
				urls: {
					svg: { default: `${SELFHST_CDN}/svg/iventoy.svg` },
					png: { default: `${SELFHST_CDN}/png/iventoy.png` },
				},
			},
		})
	})

	it("builds external URLs from the cached record when the full record is unavailable", async () => {
		const simple = await getCatalogIcon("openai", { source: "simpleicons" })
		expect(simple).toMatchObject({
			found: true,
			icon: {
				source: "simpleicons",
				brand_color: "#412991",
				license: { name: "CC0-1.0", url: null, attribution: null, source_url: null, guidelines_url: null, provider: "Simple Icons" },
				urls: {
					svg: {
						default: "https://cdn.simpleicons.org/openai/412991",
						light: "https://cdn.simpleicons.org/openai/000000",
						dark: "https://cdn.simpleicons.org/openai/FFFFFF",
					},
					png: {
						default: "https://dashboardicons.com/api/icons/external/simpleicons/openai/brand.png",
						light: "https://dashboardicons.com/api/icons/external/simpleicons/openai/light.png",
						dark: "https://dashboardicons.com/api/icons/external/simpleicons/openai/dark.png",
					},
				},
			},
		})

		const lobehub = await getCatalogIcon("openai", { source: "lobehub" })
		expect(lobehub.found && lobehub.icon.urls).toEqual({
			svg: { default: `${LOBEHUB_CDN}/icons/openai.svg` },
			png: {
				default: `${LOBEHUB_PNG}/light/openai.png`,
				light: `${LOBEHUB_PNG}/light/openai.png`,
				dark: `${LOBEHUB_PNG}/dark/openai.png`,
			},
		})

		const selfhst = await getCatalogIcon("iventoy")
		expect(selfhst.found && selfhst.icon.urls.svg).toEqual({
			default: `${SELFHST_CDN}/svg/iventoy.svg`,
			light: `${SELFHST_CDN}/svg/iventoy-light.svg`,
		})
	})

	it("resolves names that differ only by case, separators or an alias", async () => {
		const cases: [string, string, string][] = [
			["lm-studio", "lmstudio", "native"],
			["i-ventoy", "iventoy", "selfhst"],
			["Watch State", "watchstate", "native"],
			["plex_media_server", "plex", "native"],
			["Q-Bitrr", "qbitrr", "selfhst"],
		]
		for (const [query, name, source] of cases) {
			const result = await getCatalogIcon(query)
			expect(result).toMatchObject({ found: true, resolved_from: query, icon: { name, source } })
		}
		expect(await getCatalogIcon("LMSTUDIO")).not.toHaveProperty("resolved_from")
	})

	it("suggests near slugs when nothing resolves", async () => {
		const result = await getCatalogIcon("plexx")
		expect(result.found).toBe(false)
		expect(!result.found && result.did_you_mean[0]).toMatchObject({ name: "plex", source: "native" })
		expect(result).not.toHaveProperty("degraded_sources")

		const typo = await getCatalogIcon("open-aa")
		expect(!typo.found && typo.did_you_mean.map((hit) => `${hit.source}:${hit.name}`)).toEqual([
			"native:openai",
			"selfhst:openai",
			"lobehub:openai",
			"simpleicons:openai",
		])
	})

	it("only looks in the requested source", async () => {
		const result = await getCatalogIcon("plex", { source: "lobehub" })
		expect(result).toEqual({ found: false, did_you_mean: [] })
		expect(mocks.getAllIcons).not.toHaveBeenCalled()
	})

	it("reports degraded sources with an empty name", async () => {
		mocks.getExternalIcons.mockResolvedValue([])
		expect(await getCatalogIcon("  ")).toEqual({ found: false, did_you_mean: [], degraded_sources: ["selfhst", "lobehub", "simpleicons"] })
	})
})

describe("getCatalogIconSvg", () => {
	it("fetches the themed SVG from the resolved URL", async () => {
		mocks.fetchTrustedSvg.mockResolvedValue("<svg>dark</svg>")
		expect(await getCatalogIconSvg("dagster", { theme: "dark" })).toEqual({
			found: true,
			name: "dagster",
			source: "native",
			theme: "dark",
			svg: "<svg>dark</svg>",
			url: `${NATIVE_CDN}/svg/dagster-dark.svg`,
		})
		expect(await getCatalogIconSvg("openai", { source: "simpleicons" })).toMatchObject({
			found: true,
			theme: "default",
			url: "https://cdn.simpleicons.org/openai/412991",
		})
	})

	it("explains why no SVG is available", async () => {
		expect(await getCatalogIconSvg("ntopng")).toEqual({
			found: true,
			name: "ntopng",
			source: "native",
			theme: "default",
			svg: null,
			url: null,
			reason: "no_svg",
		})
		expect(await getCatalogIconSvg("openai", { source: "lobehub", theme: "light" })).toMatchObject({ svg: null, reason: "no_variant" })

		mocks.fetchTrustedSvg.mockResolvedValue(null)
		expect(await getCatalogIconSvg("plex")).toMatchObject({
			found: true,
			svg: null,
			reason: "fetch_failed",
			url: `${NATIVE_CDN}/svg/plex.svg`,
		})
	})

	it("resolves loose names and returns suggestions when the icon is missing", async () => {
		expect(await getCatalogIconSvg("Lite-LLM")).toMatchObject({ found: true, resolved_from: "Lite-LLM", name: "litellm", svg: "<svg/>" })
		mocks.fetchTrustedSvg.mockClear()

		const result = await getCatalogIconSvg("litelm")
		expect(result.found).toBe(false)
		expect(!result.found && result.did_you_mean[0]).toMatchObject({ name: "litellm", source: "lobehub" })
		expect(mocks.fetchTrustedSvg).not.toHaveBeenCalled()
	})
})

describe("listCatalogCategories", () => {
	it("merges categories across sources by normalized name", async () => {
		expect(await listCatalogCategories()).toEqual({
			categories: [
				{ name: "Media-Servers", count: 3 },
				{ name: "AI", count: 2 },
				{ name: "Utilities", count: 1 },
			],
		})
	})

	it("scopes counts to one source", async () => {
		expect((await listCatalogCategories({ source: "selfhst" })).categories).toEqual([
			{ name: "Media-Servers", count: 1 },
			{ name: "Utilities", count: 1 },
		])
	})
})

describe("browseCatalog", () => {
	it("pages alphabetically with native first by default", async () => {
		const first = await browseCatalog({ limit: 3 })
		expect(first.items.map((item) => item.name)).toEqual(["dagster", "legacy", "lmstudio"])
		expect(first.total).toBe(13)
		expect(first.next_cursor).toBe("3")

		const last = await browseCatalog({ limit: 100, cursor: "10" })
		expect(last.items.map((item) => `${item.source}:${item.name}`)).toEqual(["lobehub:openai", "simpleicons:openai", "selfhst:qbitrr"])
		expect(last.next_cursor).toBeNull()
	})

	it("sorts by newest and filters by category and source", async () => {
		const newest = await browseCatalog({ sort: "newest", source: "native" })
		expect(newest.items.map((item) => item.name)).toEqual(["watchstate", "legacy", "ntopng", "dagster", "lmstudio", "openai", "plex"])
		expect(newest.next_cursor).toBeNull()

		const media = await browseCatalog({ category: "Media-Servers" })
		expect(media.items.map((item) => item.name)).toEqual(["plex", "watchstate", "iventoy"])
		expect(media.items[2]).toEqual({
			name: "iventoy",
			title: "iVentoy",
			source: "selfhst",
			preview_url: `${SELFHST_CDN}/svg/iventoy.svg`,
		})
	})

	it("treats invalid cursors as the first page", async () => {
		for (const cursor of ["abc", "-4", "1.5", null]) {
			const page = await browseCatalog({ cursor, limit: 1 })
			expect(page.items[0]?.name).toBe("dagster")
		}
	})
})
