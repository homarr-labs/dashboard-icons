import "server-only"

import { setImmediate as yieldToEventLoop } from "node:timers/promises"
import { unstable_rethrow } from "next/navigation"
import { EXTERNAL_SOURCE_IDS, getExternalSource, WEB_URL } from "@/constants"
import { canResolveExternalIconUrl, getExternalIconPreviewUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySourceAndSlug, getExternalIcons } from "@/lib/external-icons"
import { filterAndSortIcons, normalizeForSearch, scoreIcon } from "@/lib/icons/search"
import { getAllIcons } from "@/lib/icons/service"
import { fetchTrustedSvg } from "@/lib/icons/svg-fetch"
import type {
	CatalogBrowseResult,
	CatalogBrowseSort,
	CatalogCategoriesResult,
	CatalogCategory,
	CatalogHit,
	CatalogIcon,
	CatalogItem,
	CatalogLicense,
	CatalogLookup,
	CatalogMatchResult,
	CatalogNotFound,
	CatalogSearchResult,
	CatalogServiceMatch,
	CatalogSource,
	CatalogSvgResult,
	CatalogUrls,
} from "@/lib/icons/types"
import { buildIconUrl, type IconFormat, type IconTheme } from "@/lib/icons/urls"
import { formatIconName } from "@/lib/utils"
import type { ExternalIcon, ExternalIconRecord, IconFile, IconRecord, NativeIconRecord } from "@/types/icons"

export const CATALOG_SOURCES: readonly [CatalogSource, ...CatalogSource[]] = ["native", ...EXTERNAL_SOURCE_IDS]

const FORMATS: readonly IconFormat[] = ["svg", "png", "webp"]
const THEMES: readonly IconTheme[] = ["default", "light", "dark"]
const DEFAULT_SEARCH_LIMIT = 20
const DEFAULT_MATCH_ALTERNATIVES = 3
const DEFAULT_BROWSE_LIMIT = 50
const DID_YOU_MEAN_LIMIT = 5
const MAX_LIMIT = 100

type CatalogSnapshot = {
	entries: IconRecord[]
	degradedSources: CatalogSource[]
}

const nativeRecordsByFile = new WeakMap<IconFile, NativeIconRecord[]>()

function toNativeRecords(file: IconFile): NativeIconRecord[] {
	const cached = nativeRecordsByFile.get(file)
	if (cached) return cached

	const records = Object.entries(file)
		.map(([name, data]): NativeIconRecord => ({ name, slug: name, source: "native", data }))
		.sort((a, b) => a.name.localeCompare(b.name))
	nativeRecordsByFile.set(file, records)
	return records
}

async function loadSource(source: CatalogSource): Promise<IconRecord[] | null> {
	if (source !== "native") {
		const records = (await getExternalIcons()).filter((icon) => icon.source === source)
		if (records.length === 0) return null
		return records
	}

	try {
		return toNativeRecords(await getAllIcons())
	} catch (error) {
		unstable_rethrow(error)
		return null
	}
}

function resolveSources(sources?: readonly CatalogSource[]): CatalogSource[] {
	if (!sources?.length) return [...CATALOG_SOURCES]
	return CATALOG_SOURCES.filter((source) => sources.includes(source))
}

async function loadCatalog(sources?: readonly CatalogSource[]): Promise<CatalogSnapshot> {
	const loaded = await Promise.all(resolveSources(sources).map(async (source) => ({ source, records: await loadSource(source) })))
	return {
		entries: loaded.flatMap(({ records }) => records ?? []),
		degradedSources: loaded.filter(({ records }) => !records).map(({ source }) => source),
	}
}

function clampLimit(limit: number): number {
	return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

function absoluteUrl(url: string): string {
	if (url.startsWith("/")) return `${WEB_URL}${url}`
	return url
}

function isIconFormat(value: string): value is IconFormat {
	return FORMATS.some((format) => format === value)
}

function nativePreviewFormat(entry: NativeIconRecord): IconFormat {
	if (isIconFormat(entry.data.base)) return entry.data.base
	return "svg"
}

function titleOf(entry: IconRecord): string {
	if (entry.source === "native") return formatIconName(entry.name)
	return entry.name
}

function previewUrlOf(entry: IconRecord): string {
	if (entry.source === "native") return buildIconUrl(entry.name, nativePreviewFormat(entry))
	return absoluteUrl(getExternalIconPreviewUrl(entry.external))
}

function pageUrlOf(entry: IconRecord): string {
	if (entry.source === "native") return `${WEB_URL}/icons/${entry.slug}`
	return `${WEB_URL}/icons/external/${entry.slug}`
}

function toItem(entry: IconRecord): CatalogItem {
	return { name: entry.slug, title: titleOf(entry), source: entry.source, previewUrl: previewUrlOf(entry) }
}

function toHit(entry: IconRecord, query: string): CatalogHit {
	return { ...toItem(entry), score: Math.round(scoreIcon(entry, query) * 100) / 100 }
}

function rank(entries: IconRecord[], query: string, limit: number): CatalogHit[] {
	const trimmed = query.trim()
	if (!trimmed) return []
	return filterAndSortIcons({ icons: entries, query: trimmed, limit }).map((entry) => toHit(entry, trimmed))
}

function inCategory(entries: IconRecord[], category?: string): IconRecord[] {
	const wanted = normalizeForSearch(category?.trim() ?? "")
	if (!wanted) return entries
	return entries.filter((entry) => entry.data.categories.some((candidate) => normalizeForSearch(candidate) === wanted))
}

function findBySlug(entries: IconRecord[], name: string): IconRecord | undefined {
	const slug = name.trim().toLowerCase()
	return entries.find((entry) => entry.slug.toLowerCase() === slug)
}

function notFound(snapshot: CatalogSnapshot, name: string): CatalogNotFound {
	return { found: false, didYouMean: rank(snapshot.entries, name, DID_YOU_MEAN_LIMIT), degradedSources: snapshot.degradedSources }
}

function themedUrls(build: (theme: IconTheme) => string | null): Partial<Record<IconTheme, string>> {
	const urls: Partial<Record<IconTheme, string>> = {}
	for (const theme of THEMES) {
		const url = build(theme)
		if (url) urls[theme] = url
	}
	return urls
}

function nativeFile(entry: NativeIconRecord, theme: IconTheme): string | null {
	if (theme === "default") return entry.name
	return entry.data.colors?.[theme] ?? null
}

function nativeUrls(entry: NativeIconRecord): CatalogUrls {
	const urls: CatalogUrls = {}
	for (const format of FORMATS) {
		if (format === "svg" && entry.data.base !== "svg") continue
		urls[format] = themedUrls((theme) => {
			const file = nativeFile(entry, theme)
			if (!file) return null
			return buildIconUrl(file, format)
		})
	}
	return urls
}

function externalUrlKey(format: IconFormat, theme: IconTheme): string {
	if (theme === "default") return format
	return `${format}_${theme}`
}

function externalUrls(icon: ExternalIcon): CatalogUrls {
	const urls: CatalogUrls = {}
	for (const format of FORMATS) {
		if (!icon.formats.includes(format)) continue
		const themed = themedUrls((theme) => {
			const key = externalUrlKey(format, theme)
			if (theme !== "default" && !icon.variants?.[theme]) return null
			if (!canResolveExternalIconUrl(icon, key)) return null
			return absoluteUrl(resolveExternalIconUrl(icon, key))
		})
		if (Object.keys(themed).length > 0) urls[format] = themed
	}
	return urls
}

function urlsOf(entry: IconRecord): CatalogUrls {
	if (entry.source === "native") return nativeUrls(entry)
	return externalUrls(entry.external)
}

function externalLicense(icon: ExternalIcon): CatalogLicense {
	const source = getExternalSource(icon.source)
	return {
		name: icon.license || source.license,
		url: icon.license_url || null,
		attribution: icon.attribution || null,
		sourceUrl: icon.source_url || null,
		guidelinesUrl: icon.guidelines_url || null,
		provider: source.label,
		providerUrl: source.website,
	}
}

function nativeIcon(entry: NativeIconRecord): CatalogIcon {
	const { author } = entry.data.update
	return {
		...toItem(entry),
		aliases: entry.data.aliases,
		categories: entry.data.categories,
		author: author.name ?? author.login ?? null,
		updatedAt: entry.data.update.timestamp,
		brandColor: null,
		license: null,
		pageUrl: pageUrlOf(entry),
		urls: nativeUrls(entry),
	}
}

function externalIcon(entry: ExternalIconRecord): CatalogIcon {
	const { external } = entry
	let brandColor: string | null = null
	if (external.brand_color) brandColor = `#${external.brand_color}`
	return {
		...toItem(entry),
		aliases: entry.data.aliases,
		categories: entry.data.categories,
		author: getExternalSource(entry.source).authorName,
		updatedAt: entry.data.update.timestamp,
		brandColor,
		license: externalLicense(external),
		pageUrl: pageUrlOf(entry),
		urls: externalUrls(external),
	}
}

export async function searchCatalog(
	query: string,
	options: { sources?: readonly CatalogSource[]; category?: string; limit?: number } = {},
): Promise<CatalogSearchResult> {
	const trimmed = query.trim()
	const snapshot = await loadCatalog(options.sources)
	if (!trimmed) return { results: [], total: 0, degradedSources: snapshot.degradedSources }

	const matched = filterAndSortIcons({ icons: inCategory(snapshot.entries, options.category), query: trimmed })
	const results = matched.slice(0, clampLimit(options.limit ?? DEFAULT_SEARCH_LIMIT)).map((entry) => toHit(entry, trimmed))
	return { results, total: matched.length, degradedSources: snapshot.degradedSources }
}

export async function matchServices(
	serviceNames: readonly string[],
	options: { sources?: readonly CatalogSource[]; limit?: number } = {},
): Promise<CatalogMatchResult> {
	const snapshot = await loadCatalog(options.sources)
	const alternatives = clampLimit(options.limit ?? DEFAULT_MATCH_ALTERNATIVES)
	const matches: CatalogServiceMatch[] = []
	for (const service of serviceNames) {
		const [best = null, ...rest] = rank(snapshot.entries, service, alternatives + 1)
		matches.push({ service, best, alternatives: rest })
		await yieldToEventLoop()
	}
	return { matches, degradedSources: snapshot.degradedSources }
}

export async function getCatalogIcon(name: string, options: { source?: CatalogSource } = {}): Promise<CatalogLookup> {
	const snapshot = await loadCatalog(options.source && [options.source])
	const entry = findBySlug(snapshot.entries, name)
	if (!entry) return notFound(snapshot, name)
	if (entry.source === "native") return { found: true, icon: nativeIcon(entry) }

	const full = await getExternalIconBySourceAndSlug(entry.source, entry.slug)
	return { found: true, icon: externalIcon(full ?? entry) }
}

export async function getCatalogIconSvg(
	name: string,
	options: { source?: CatalogSource; theme?: IconTheme } = {},
): Promise<CatalogSvgResult> {
	const snapshot = await loadCatalog(options.source && [options.source])
	const entry = findBySlug(snapshot.entries, name)
	if (!entry) return notFound(snapshot, name)

	const identity = { found: true as const, name: entry.slug, source: entry.source, theme: options.theme ?? "default" }
	const svgUrls = urlsOf(entry).svg
	if (!svgUrls) return { ...identity, svg: null, url: null, reason: "no_svg" }

	const url = svgUrls[identity.theme]
	if (!url) return { ...identity, svg: null, url: null, reason: "no_variant" }

	const svg = await fetchTrustedSvg(url)
	if (svg === null) return { ...identity, svg: null, url, reason: "fetch_failed" }
	return { ...identity, svg, url }
}

export async function listCatalogCategories(options: { source?: CatalogSource } = {}): Promise<CatalogCategoriesResult> {
	const snapshot = await loadCatalog(options.source && [options.source])
	const buckets = new Map<string, CatalogCategory>()

	for (const entry of snapshot.entries) {
		const seen = new Set<string>()
		for (const category of entry.data.categories) {
			const key = normalizeForSearch(category)
			if (!key || seen.has(key)) continue
			seen.add(key)
			const bucket = buckets.get(key)
			if (bucket) bucket.count++
			else buckets.set(key, { name: category, count: 1 })
		}
	}

	const categories = [...buckets.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
	return { categories, degradedSources: snapshot.degradedSources }
}

function parseCursor(cursor?: string | null): number {
	const offset = Number(cursor ?? 0)
	if (!Number.isSafeInteger(offset) || offset < 0) return 0
	return offset
}

export async function browseCatalog(
	options: { category?: string; source?: CatalogSource; sort?: CatalogBrowseSort; limit?: number; cursor?: string | null } = {},
): Promise<CatalogBrowseResult> {
	const snapshot = await loadCatalog(options.source && [options.source])
	let sort: "newest" | "alphabetical-asc" = "alphabetical-asc"
	if (options.sort === "newest") sort = "newest"

	const sorted = filterAndSortIcons({ icons: inCategory(snapshot.entries, options.category), sort })
	const offset = parseCursor(options.cursor)
	const end = offset + clampLimit(options.limit ?? DEFAULT_BROWSE_LIMIT)
	let nextCursor: string | null = null
	if (end < sorted.length) nextCursor = String(end)

	return { items: sorted.slice(offset, end).map(toItem), total: sorted.length, nextCursor, degradedSources: snapshot.degradedSources }
}
