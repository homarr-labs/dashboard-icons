import "server-only"

import { setImmediate as yieldToEventLoop } from "node:timers/promises"
import { unstable_rethrow } from "next/navigation"
import { EXTERNAL_SOURCE_IDS, type ExternalSourceId, getExternalSource, WEB_URL } from "@/constants"
import { canResolveExternalIconUrl, getExternalIconPreviewUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySourceAndSlug, getExternalIcons } from "@/lib/external-icons"
import { filterAndSortIcons, levenshteinDistance, normalizeForSearch, scoreIcon } from "@/lib/icons/search"
import { getAllIcons } from "@/lib/icons/service"
import { fetchTrustedSvg } from "@/lib/icons/svg-fetch"
import type {
	CatalogBrowseResult,
	CatalogBrowseSort,
	CatalogCategoriesResult,
	CatalogCategory,
	CatalogDegraded,
	CatalogHit,
	CatalogIcon,
	CatalogItem,
	CatalogLicense,
	CatalogLookup,
	CatalogMatchResult,
	CatalogNotFound,
	CatalogResolution,
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
const MATCH_ALTERNATIVES = 3
const DEFAULT_BROWSE_LIMIT = 50
const DID_YOU_MEAN_LIMIT = 5
const MIN_TYPO_KEY_LENGTH = 4

export const MAX_FUZZY_MATCHES = 10

type SourceIndex = {
	slugs: Map<string, IconRecord>
	keys: Map<string, IconRecord>
}

type CatalogSnapshot = {
	entries: IconRecord[]
	indexes: SourceIndex[]
	degradedSources: CatalogSource[]
}

type ResolvedEntry = {
	entry: IconRecord
	resolution: CatalogResolution
}

const nativeRecordsByFile = new WeakMap<IconFile, NativeIconRecord[]>()
const externalRecordsByList = new WeakMap<ExternalIconRecord[], Map<CatalogSource, ExternalIconRecord[]>>()
const indexByRecords = new WeakMap<IconRecord[], SourceIndex>()

function toNativeRecords(file: IconFile): NativeIconRecord[] {
	const cached = nativeRecordsByFile.get(file)
	if (cached) return cached

	const records = Object.entries(file)
		.map(([name, data]): NativeIconRecord => ({ name, slug: name, source: "native", data }))
		.sort((a, b) => a.name.localeCompare(b.name))
	nativeRecordsByFile.set(file, records)
	return records
}

function toExternalRecords(list: ExternalIconRecord[], source: ExternalSourceId): ExternalIconRecord[] {
	let bySource = externalRecordsByList.get(list)
	if (!bySource) {
		bySource = new Map()
		for (const record of list) {
			const bucket = bySource.get(record.source)
			if (bucket) bucket.push(record)
			else bySource.set(record.source, [record])
		}
		externalRecordsByList.set(list, bySource)
	}
	return bySource.get(source) ?? []
}

async function loadSource(source: CatalogSource): Promise<IconRecord[] | null> {
	if (source !== "native") {
		const records = toExternalRecords(await getExternalIcons(), source)
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

function compactKey(value: string): string {
	return value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, "")
}

function indexRecords(records: IconRecord[]): SourceIndex {
	const cached = indexByRecords.get(records)
	if (cached) return cached

	const keys = new Map<string, IconRecord>()
	const addKey = (value: string, entry: IconRecord) => {
		const key = compactKey(value)
		if (key && !keys.has(key)) keys.set(key, entry)
	}
	for (const entry of records) addKey(entry.slug, entry)
	for (const entry of records) addKey(entry.name, entry)
	for (const entry of records) {
		for (const alias of entry.data.aliases) addKey(alias, entry)
	}

	const index = { slugs: new Map(records.map((entry) => [entry.slug.toLowerCase(), entry])), keys }
	indexByRecords.set(records, index)
	return index
}

function resolveSources(sources?: readonly CatalogSource[]): CatalogSource[] {
	if (!sources?.length) return [...CATALOG_SOURCES]
	return CATALOG_SOURCES.filter((source) => sources.includes(source))
}

async function loadCatalog(sources?: readonly CatalogSource[]): Promise<CatalogSnapshot> {
	const loaded = await Promise.all(resolveSources(sources).map(async (source) => ({ source, records: await loadSource(source) })))
	const available = loaded.map(({ records }) => records).filter((records): records is IconRecord[] => records !== null)
	return {
		entries: available.flat(),
		indexes: available.map(indexRecords),
		degradedSources: loaded.filter(({ records }) => !records).map(({ source }) => source),
	}
}

function degraded(snapshot: CatalogSnapshot): CatalogDegraded {
	if (snapshot.degradedSources.length === 0) return {}
	return { degraded_sources: snapshot.degradedSources }
}

function exactMatches(snapshot: CatalogSnapshot, name: string): ResolvedEntry[] {
	const slug = name.trim().toLowerCase()
	const key = compactKey(name)
	const matches: ResolvedEntry[] = []
	for (const index of snapshot.indexes) {
		const bySlug = index.slugs.get(slug)
		const byKey = index.keys.get(key)
		if (bySlug) matches.push({ entry: bySlug, resolution: {} })
		else if (byKey) matches.push({ entry: byKey, resolution: { resolved_from: name.trim() } })
	}
	return matches
}

function resolveEntry(snapshot: CatalogSnapshot, name: string): ResolvedEntry | null {
	const matches = exactMatches(snapshot, name)
	return matches.find(({ resolution }) => resolution.resolved_from === undefined) ?? matches[0] ?? null
}

function nearestEntries(snapshot: CatalogSnapshot, name: string, limit: number): IconRecord[] {
	const key = compactKey(name)
	if (key.length < MIN_TYPO_KEY_LENGTH) return []

	const maxDistance = Math.floor(key.length / 4)
	const near: { entry: IconRecord; distance: number }[] = []
	for (const index of snapshot.indexes) {
		for (const [candidate, entry] of index.keys) {
			if (Math.abs(candidate.length - key.length) > maxDistance) continue
			const distance = levenshteinDistance(candidate, key)
			if (distance <= maxDistance) near.push({ entry, distance })
		}
	}
	near.sort((a, b) => a.distance - b.distance)
	return [...new Set(near.map(({ entry }) => entry))].slice(0, limit)
}

function uniqueBrands(entries: IconRecord[]): IconRecord[] {
	const seen = new Set<string>()
	return entries.filter((entry) => {
		const slug = entry.slug.toLowerCase()
		if (seen.has(slug)) return false
		seen.add(slug)
		return true
	})
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
	return { name: entry.slug, title: titleOf(entry), source: entry.source, preview_url: previewUrlOf(entry) }
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

function suggest(snapshot: CatalogSnapshot, name: string, limit: number): CatalogHit[] {
	const ranked = rank(snapshot.entries, name, limit)
	if (ranked.length > 0) return ranked
	return nearestEntries(snapshot, name, limit).map((entry) => toHit(entry, name.trim()))
}

function notFound(snapshot: CatalogSnapshot, name: string): CatalogNotFound {
	return { found: false, did_you_mean: suggest(snapshot, name, DID_YOU_MEAN_LIMIT), ...degraded(snapshot) }
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
		source_url: icon.source_url || null,
		guidelines_url: icon.guidelines_url || null,
		provider: source.label,
		provider_url: source.website,
	}
}

function nativeIcon(entry: NativeIconRecord): CatalogIcon {
	const { author } = entry.data.update
	return {
		...toItem(entry),
		aliases: entry.data.aliases,
		categories: entry.data.categories,
		author: author.name ?? author.login ?? null,
		updated_at: entry.data.update.timestamp,
		brand_color: null,
		license: null,
		page_url: pageUrlOf(entry),
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
		updated_at: entry.data.update.timestamp,
		brand_color: brandColor,
		license: externalLicense(external),
		page_url: pageUrlOf(entry),
		urls: externalUrls(external),
	}
}

export async function searchCatalog(
	query: string,
	options: { sources?: readonly CatalogSource[]; category?: string; limit?: number } = {},
): Promise<CatalogSearchResult> {
	const trimmed = query.trim()
	const snapshot = await loadCatalog(options.sources)
	if (!trimmed) return { results: [], total: 0, ...degraded(snapshot) }

	const matched = filterAndSortIcons({ icons: inCategory(uniqueBrands(snapshot.entries), options.category), query: trimmed })
	const results = matched.slice(0, options.limit ?? DEFAULT_SEARCH_LIMIT).map((entry) => toHit(entry, trimmed))
	return { results, total: matched.length, ...degraded(snapshot) }
}

function toMatch(service: string, hits: CatalogHit[]): CatalogServiceMatch {
	const [best = null, ...rest] = hits
	return { service, best, alternatives: rest.slice(0, MATCH_ALTERNATIVES) }
}

export async function matchServices(
	serviceNames: readonly string[],
	options: { sources?: readonly CatalogSource[] } = {},
): Promise<CatalogMatchResult> {
	const snapshot = await loadCatalog(options.sources)
	const fuzzy = new Map<string, CatalogHit[]>()
	const matches: CatalogServiceMatch[] = []
	for (const service of serviceNames) {
		const exact = exactMatches(snapshot, service).map(({ entry }) => toHit(entry, service.trim()))
		if (exact.length > 0) {
			matches.push(toMatch(service, exact))
			continue
		}

		const key = compactKey(service)
		let hits = fuzzy.get(key)
		if (!hits && fuzzy.size >= MAX_FUZZY_MATCHES) {
			matches.push({ ...toMatch(service, []), reason: "fuzzy_limit" })
			continue
		}
		if (!hits) {
			hits = suggest(snapshot, service, MATCH_ALTERNATIVES + 1)
			fuzzy.set(key, hits)
			await yieldToEventLoop()
		}
		matches.push(toMatch(service, hits))
	}
	return { matches, ...degraded(snapshot) }
}

export async function getCatalogIcon(name: string, options: { source?: CatalogSource } = {}): Promise<CatalogLookup> {
	const snapshot = await loadCatalog(options.source && [options.source])
	const resolved = resolveEntry(snapshot, name)
	if (!resolved) return notFound(snapshot, name)

	const { entry, resolution } = resolved
	if (entry.source === "native") return { found: true, ...resolution, icon: nativeIcon(entry) }

	const full = await getExternalIconBySourceAndSlug(entry.source, entry.slug)
	return { found: true, ...resolution, icon: externalIcon(full ?? entry) }
}

export async function getCatalogIconSvg(
	name: string,
	options: { source?: CatalogSource; theme?: IconTheme } = {},
): Promise<CatalogSvgResult> {
	const snapshot = await loadCatalog(options.source && [options.source])
	const resolved = resolveEntry(snapshot, name)
	if (!resolved) return notFound(snapshot, name)

	const { entry, resolution } = resolved
	const identity = { found: true as const, ...resolution, name: entry.slug, source: entry.source, theme: options.theme ?? "default" }
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

	for (const entry of uniqueBrands(snapshot.entries)) {
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
	return { categories, ...degraded(snapshot) }
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

	const sorted = filterAndSortIcons({ icons: inCategory(uniqueBrands(snapshot.entries), options.category), sort })
	const offset = parseCursor(options.cursor)
	const end = offset + (options.limit ?? DEFAULT_BROWSE_LIMIT)
	let nextCursor: string | null = null
	if (end < sorted.length) nextCursor = String(end)

	return { items: sorted.slice(offset, end).map(toItem), total: sorted.length, next_cursor: nextCursor, ...degraded(snapshot) }
}
