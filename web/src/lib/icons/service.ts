import "server-only"

import { readFile } from "node:fs/promises"
import { unstable_cache } from "next/cache"
import { METADATA_URL } from "@/constants"
import { filterAndSortIcons, scoreIcon } from "@/lib/icons/search"
import type { IconDetail, IconUrlResult, SearchResult, Suggestion } from "@/lib/icons/types"
import { buildIconUrl, buildIconUrls } from "@/lib/icons/urls"
import { assertIconName } from "@/lib/icons/validate"
import type { Icon, IconFile, IconWithName } from "@/types/icons"

const METADATA_FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_SECONDS = 900

type MetadataCacheState = {
	data: IconFile
	etag: string | null
}

declare global {
	// eslint-disable-next-line no-var
	var __dashboardIconsMetadata: MetadataCacheState | undefined
}

let lastEtag: string | null = null

async function fetchMetadataFromRemote(): Promise<IconFile> {
	const headers: Record<string, string> = { Accept: "application/json" }
	if (lastEtag) headers["If-None-Match"] = lastEtag

	const response = await fetch(METADATA_URL, {
		signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
		headers,
		next: { revalidate: CACHE_TTL_SECONDS },
	})

	if (response.status === 304 && globalThis.__dashboardIconsMetadata) {
		return globalThis.__dashboardIconsMetadata.data
	}

	if (!response.ok) {
		throw new Error(`Failed to fetch metadata: ${response.status}`)
	}

	const etag = response.headers.get("etag")
	if (etag) lastEtag = etag

	return (await response.json()) as IconFile
}

async function fetchMetadataFromLocal(path: string): Promise<IconFile> {
	const raw = await readFile(path, "utf8")
	return JSON.parse(raw) as IconFile
}

async function loadMetadataUncached(): Promise<IconFile> {
	const localPath = process.env.DASHBOARD_ICONS_METADATA_PATH
	if (localPath) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("DASHBOARD_ICONS_METADATA_PATH is not allowed in production")
		}
		return fetchMetadataFromLocal(localPath)
	}

	return fetchMetadataFromRemote()
}

const getCachedMetadata = unstable_cache(async () => loadMetadataUncached(), ["dashboard-icons-metadata"], {
	revalidate: CACHE_TTL_SECONDS,
	tags: ["native-icons"],
})

export async function warmMetadataCache(): Promise<void> {
	await getAllIcons()
}

export async function getAllIcons(): Promise<IconFile> {
	if (globalThis.__dashboardIconsMetadata) {
		return globalThis.__dashboardIconsMetadata.data
	}

	const data = await getCachedMetadata()
	globalThis.__dashboardIconsMetadata = { data, etag: lastEtag }
	return data
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
	const matched = filterAndSortIcons({ icons, query: trimmed, categories, limit })

	const results = matched.map((icon) => ({
		name: icon.name,
		aliases: icon.data.aliases,
		categories: icon.data.categories,
		score: scoreIcon(icon, trimmed),
	}))

	return { results, total: results.length }
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
	lastEtag = null
}
