import "server-only"

import { readFile } from "node:fs/promises"
import { unstable_rethrow } from "next/navigation"
import { type ExternalSourceId, METADATA_URL, WEB_URL } from "@/constants"
import { canResolveExternalIconUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { filterAndSortIcons, scoreIcon } from "@/lib/icons/search"
import type { IconDetail, IconSource, IconUrlResult, SearchResult, Suggestion } from "@/lib/icons/types"
import { buildIconUrl, buildIconUrls, type IconFormat, type IconTheme } from "@/lib/icons/urls"
import { assertLookupName, ValidationError } from "@/lib/icons/validate"
import type { ExternalIcon, ExternalIconRecord, Icon, IconFile, IconWithName } from "@/types/icons"

const METADATA_FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_SECONDS = 900
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000
const CACHE_RETRY_DELAY_MS = 60_000

type MetadataCacheState = {
	data: IconFile
	etag: string | null
	loadedAt: number
	retryAfter?: number
}

type MetadataFetchResult = Omit<MetadataCacheState, "loadedAt" | "retryAfter">

declare global {
	// eslint-disable-next-line no-var
	var __dashboardIconsMetadata: MetadataCacheState | undefined
	var __dashboardIconsMetadataPending: Promise<IconFile> | undefined
}

async function requestRemoteMetadata(etag?: string): Promise<Response> {
	const headers: Record<string, string> = { Accept: "application/json" }
	if (etag) headers["If-None-Match"] = etag

	return fetch(METADATA_URL, {
		signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
		headers,
		cache: "no-store",
	})
}

async function fetchMetadataFromRemote(): Promise<MetadataFetchResult> {
	const cached = globalThis.__dashboardIconsMetadata
	let response = await requestRemoteMetadata(cached?.etag ?? undefined)

	if (response.status === 304) {
		if (cached) return { data: cached.data, etag: cached.etag }
		response = await requestRemoteMetadata()
	}

	if (!response.ok) {
		throw new Error(`Failed to fetch metadata: ${response.status}`)
	}

	return { data: (await response.json()) as IconFile, etag: response.headers.get("etag") }
}

async function fetchMetadataFromLocal(path: string): Promise<MetadataFetchResult> {
	const raw = await readFile(path, "utf8")
	return { data: JSON.parse(raw) as IconFile, etag: null }
}

async function loadMetadataUncached(): Promise<MetadataFetchResult> {
	const localPath = process.env.DASHBOARD_ICONS_METADATA_PATH
	if (localPath) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("DASHBOARD_ICONS_METADATA_PATH is not allowed in production")
		}
		return fetchMetadataFromLocal(localPath)
	}

	return fetchMetadataFromRemote()
}

export async function warmMetadataCache(): Promise<void> {
	await getAllIcons()
}

export async function getAllIcons(): Promise<IconFile> {
	const cached = globalThis.__dashboardIconsMetadata
	const now = Date.now()
	if (cached && (now - cached.loadedAt < CACHE_TTL_MS || (cached.retryAfter ?? 0) > now)) {
		return cached.data
	}

	// Whole catalogues exceed Next's 2 MB data-cache limit. Share one refresh
	// between requests and retain the ETag for conditional requests after expiry.
	if (!globalThis.__dashboardIconsMetadataPending) {
		globalThis.__dashboardIconsMetadataPending = loadMetadataUncached()
			.then((fresh) => {
				globalThis.__dashboardIconsMetadata = { ...fresh, loadedAt: Date.now() }
				return fresh.data
			})
			.catch((error) => {
				unstable_rethrow(error)
				if (cached) {
					cached.retryAfter = Date.now() + CACHE_RETRY_DELAY_MS
					return cached.data
				}
				throw error
			})
			.finally(() => {
				globalThis.__dashboardIconsMetadataPending = undefined
			})
	}
	return globalThis.__dashboardIconsMetadataPending
}

function toIconWithName(name: string, data: Icon): IconWithName {
	return { name, data, source: "native", slug: name }
}

async function getIconsArray(): Promise<IconWithName[]> {
	const metadata = await getAllIcons()
	return Object.entries(metadata)
		.map(([name, data]) => toIconWithName(name, data))
		.sort((a, b) => a.name.localeCompare(b.name))
}

// Lazy import: external-icons imports api, which imports this module.
async function getExternalIconRecords(): Promise<ExternalIconRecord[]> {
	const { getExternalIcons } = await import("@/lib/external-icons")
	return getExternalIcons()
}

// One entry per slug, so a search is not flooded with the same brand from every
// source: native icons win, then external sources in EXTERNAL_SOURCE_IDS order.
async function getSearchableIcons(): Promise<IconWithName[]> {
	const [native, external] = await Promise.all([getIconsArray(), getExternalIconRecords()])
	const seen = new Set(native.map((icon) => icon.name))
	const icons: IconWithName[] = native
	for (const icon of external) {
		if (seen.has(icon.slug)) continue
		seen.add(icon.slug)
		icons.push(icon)
	}
	return icons
}

async function findExternalIcon(slug: string, source?: ExternalSourceId): Promise<ExternalIcon | null> {
	const icons = await getExternalIconRecords()
	const match = icons.find((icon) => icon.slug === slug && (!source || icon.source === source))
	if (!match) return null
	// The cached list is trimmed; fetch the full record for licence and attribution.
	const { getExternalIconBySourceAndSlug } = await import("@/lib/external-icons")
	return (await getExternalIconBySourceAndSlug(match.source, match.slug))?.external ?? match.external
}

function hasExternalUrl(icon: ExternalIcon, format: IconFormat, theme: IconTheme = "default"): boolean {
	if (!icon.formats.includes(format) || !canResolveExternalIconUrl(icon, format)) return false
	if (theme === "default") return true
	const key = `${format}_${theme}`
	// Simple Icons recolours any mark; other sources only ship the variants they list.
	return (
		canResolveExternalIconUrl(icon, key) &&
		(icon.source === "simpleicons" || Boolean(icon.url_templates?.[key]) || Boolean(icon.variants?.[theme]))
	)
}

function externalIconUrl(icon: ExternalIcon, format: IconFormat, theme: IconTheme = "default"): string {
	const url = resolveExternalIconUrl(icon, theme === "default" ? format : `${format}_${theme}`)
	// Simple Icons PNGs are rendered by this site, so that builder returns a relative path.
	return url.startsWith("/") ? `${WEB_URL}${url}` : url
}

function externalBaseFormat(icon: ExternalIcon): IconFormat {
	return (["svg", "png", "webp"] as const).find((format) => hasExternalUrl(icon, format)) ?? "svg"
}

function buildExternalIconUrls(icon: ExternalIcon): IconDetail["urls"] {
	const urls: IconDetail["urls"] = {}
	for (const format of ["svg", "png", "webp"] as const) {
		if (hasExternalUrl(icon, format)) urls[format] = externalIconUrl(icon, format)
	}
	// Variants can exist in fewer formats than the base mark (LobeHub ships them as WebP only).
	for (const theme of ["light", "dark"] as const) {
		const format = (["svg", "png", "webp"] as const).find((candidate) => hasExternalUrl(icon, candidate, theme))
		if (format) urls[theme] = externalIconUrl(icon, format, theme)
	}
	return urls
}

function previewUrl(icon: IconWithName): string {
	return icon.external ? externalIconUrl(icon.external, externalBaseFormat(icon.external)) : buildIconUrl(icon.name, "svg", "default")
}

function resultName(icon: IconWithName): string {
	return icon.external ? (icon.slug ?? icon.name) : icon.name
}

// Own keys only, so names like `constructor` don't resolve to Object.prototype members.
async function getNativeIcon(name: string): Promise<Icon | undefined> {
	const metadata = await getAllIcons()
	return Object.hasOwn(metadata, name) ? metadata[name] : undefined
}

export async function searchIcons(query: string, limit = 20, category?: string): Promise<{ results: SearchResult[]; total: number }> {
	const trimmed = query.trim()
	if (!trimmed) return { results: [], total: 0 }

	const icons = await getSearchableIcons()
	const categories = category ? [category] : []
	const matched = filterAndSortIcons({ icons, query: trimmed, categories })

	const results = matched.slice(0, limit).map((icon) => ({
		name: resultName(icon),
		source: icon.source ?? "native",
		aliases: icon.data.aliases,
		categories: icon.data.categories,
		score: scoreIcon(icon, trimmed),
	}))

	return { results, total: matched.length }
}

export async function getIconByName(name: string, source?: IconSource): Promise<IconDetail | null> {
	const validated = assertLookupName(name, source)
	const icon = source === undefined || source === "native" ? await getNativeIcon(validated) : undefined
	if (!icon) {
		if (source === "native") return null
		const external = await findExternalIcon(validated, source)
		if (!external) return null
		return {
			name: validated,
			source: external.source,
			title: external.name,
			base: externalBaseFormat(external),
			aliases: external.aliases,
			categories: external.categories,
			update: {
				timestamp: external.updated_at_source || external.updated || external.created || new Date(0).toISOString(),
				author: { id: external.source },
			},
			urls: buildExternalIconUrls(external),
			license: external.license || undefined,
			attribution: external.attribution || undefined,
			source_url: external.source_url || undefined,
		}
	}

	return {
		name: validated,
		source: "native",
		base: icon.base,
		aliases: icon.aliases,
		categories: icon.categories,
		colors: icon.colors,
		update: icon.update,
		urls: buildIconUrls(validated, icon),
	}
}

export async function getIconUrl(
	name: string,
	format: IconFormat = "svg",
	theme: IconTheme = "default",
	source?: IconSource,
): Promise<IconUrlResult | null> {
	const validated = assertLookupName(name, source)
	const icon = source === undefined || source === "native" ? await getNativeIcon(validated) : undefined
	if (!icon) {
		if (source === "native") return null
		const external = await findExternalIcon(validated, source)
		if (!external) return null
		if (!hasExternalUrl(external, format)) {
			throw new ValidationError(`Icon '${validated}' from ${external.source} is not available as ${format}`)
		}
		// Fall back to the default mark when the source has no variant for this theme.
		const resolvedTheme = hasExternalUrl(external, format, theme) ? theme : "default"
		return { url: externalIconUrl(external, format, resolvedTheme), name: validated, source: external.source, format, theme }
	}

	let resolvedName = validated
	let resolvedTheme: "default" | "light" | "dark" = theme
	if (theme === "light" && icon.colors?.light) {
		resolvedName = icon.colors.light
		resolvedTheme = "default"
	} else if (theme === "dark" && icon.colors?.dark) {
		resolvedName = icon.colors.dark
		resolvedTheme = "default"
	}

	return {
		url: buildIconUrl(resolvedName, format, resolvedTheme),
		name: validated,
		source: "native",
		format,
		theme,
	}
}

export async function suggestIcons(serviceName: string, limit = 5): Promise<{ suggestions: Suggestion[] }> {
	const trimmed = serviceName.trim()
	if (!trimmed) return { suggestions: [] }

	const icons = await getSearchableIcons()
	const matched = filterAndSortIcons({ icons, query: trimmed, limit })

	const suggestions: Suggestion[] = matched.map((icon) => ({
		name: resultName(icon),
		source: icon.source ?? "native",
		score: scoreIcon(icon, trimmed),
		url: previewUrl(icon),
	}))

	return { suggestions }
}

export function clearMetadataCacheForTests(): void {
	globalThis.__dashboardIconsMetadata = undefined
	globalThis.__dashboardIconsMetadataPending = undefined
}
