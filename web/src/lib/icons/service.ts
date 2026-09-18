import "server-only"

import { readFile } from "node:fs/promises"
import { unstable_rethrow } from "next/navigation"
import { METADATA_URL } from "@/constants"
import { filterAndSortIcons, scoreIcon } from "@/lib/icons/search"
import type { IconDetail, IconUrlResult, SearchResult, Suggestion } from "@/lib/icons/types"
import { buildIconUrl, buildIconUrls } from "@/lib/icons/urls"
import { assertIconName } from "@/lib/icons/validate"
import type { Icon, IconFile, IconWithName } from "@/types/icons"

const METADATA_FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_SECONDS = 900
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000

type MetadataCacheState = {
	data: IconFile
	etag: string | null
	loadedAt: number
}

type MetadataFetchResult = Omit<MetadataCacheState, "loadedAt">

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
	if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
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
				// Keep serving the last catalogue during upstream outages. Leave its
				// timestamp expired so the next request can retry the refresh.
				if (cached) return cached.data
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

export async function searchIcons(query: string, limit = 20, category?: string): Promise<{ results: SearchResult[]; total: number }> {
	const trimmed = query.trim()
	if (!trimmed) return { results: [], total: 0 }

	const icons = await getIconsArray()
	const categories = category ? [category] : []
	const matched = filterAndSortIcons({ icons, query: trimmed, categories })

	const results = matched.slice(0, limit).map((icon) => ({
		name: icon.name,
		aliases: icon.data.aliases,
		categories: icon.data.categories,
		score: scoreIcon(icon, trimmed),
	}))

	return { results, total: matched.length }
}

export async function getIconByName(name: string): Promise<IconDetail | null> {
	const validated = assertIconName(name)
	const metadata = await getAllIcons()
	const icon = metadata[validated]
	if (!icon) return null

	return {
		name: validated,
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
	format: "svg" | "png" | "webp" = "svg",
	theme: "default" | "light" | "dark" = "default",
): Promise<IconUrlResult | null> {
	const validated = assertIconName(name)
	const metadata = await getAllIcons()
	const icon = metadata[validated]
	if (!icon) return null

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
		format,
		theme,
	}
}

export async function suggestIcons(serviceName: string, limit = 5): Promise<{ suggestions: Suggestion[] }> {
	const trimmed = serviceName.trim()
	if (!trimmed) return { suggestions: [] }

	const icons = await getIconsArray()
	const matched = filterAndSortIcons({ icons, query: trimmed, limit })

	const suggestions: Suggestion[] = matched.map((icon) => ({
		name: icon.name,
		score: scoreIcon(icon, trimmed),
		url: buildIconUrl(icon.name, "svg", "default"),
	}))

	return { suggestions }
}

export function clearMetadataCacheForTests(): void {
	globalThis.__dashboardIconsMetadata = undefined
	globalThis.__dashboardIconsMetadataPending = undefined
}
