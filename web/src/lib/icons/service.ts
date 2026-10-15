import "server-only"

import { readFile } from "node:fs/promises"
import { unstable_rethrow } from "next/navigation"
import { METADATA_URL } from "@/constants"
import type { IconFile } from "@/types/icons"

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

export function clearMetadataCacheForTests(): void {
	globalThis.__dashboardIconsMetadata = undefined
	globalThis.__dashboardIconsMetadataPending = undefined
}
