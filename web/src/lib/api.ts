import "server-only"

import { unstable_cache } from "next/cache"
import type { RelatedIcon } from "@/components/icon-details"
import { ApiError } from "@/lib/errors"
import * as iconService from "@/lib/icons/service"
import { assertIconName, ValidationError } from "@/lib/icons/validate"
import type { AuthorData, Icon, IconFile, IconWithName, NativeIconRecord } from "@/types/icons"

const CACHE_TTL_SECONDS = 900
const MAX_RELATED_ICONS = 16
const GITHUB_NUMERIC_ID = /^\d+$/

const UNKNOWN_AUTHOR: AuthorData = {
	id: 0,
	login: "unknown",
	avatar_url: "https://avatars.githubusercontent.com/u/0",
	html_url: "https://github.com",
	name: "Unknown User",
}

const authorDataCache = new Map<string, AuthorData>()
let hasLoggedAuthorFetchFailure = false

function logAuthorFetchFailure(error: unknown): void {
	if (hasLoggedAuthorFetchFailure) return
	hasLoggedAuthorFetchFailure = true
	const message = error instanceof Error ? error.message : String(error)
	console.warn(`Author data unavailable (${message}); using fallback author metadata.`)
}

const getCachedGitHubAuthorData = unstable_cache(
	async (authorId: number): Promise<AuthorData> => fetchGitHubAuthorData(authorId),
	["github-author-data"],
	{ revalidate: CACHE_TTL_SECONDS, tags: ["github-authors"] },
)

const getCachedIconsArray = unstable_cache(
	async (): Promise<NativeIconRecord[]> => {
		const iconsData = await iconService.getAllIcons()
		return Object.entries(iconsData)
			.map(([name, data]) => ({
				name,
				slug: name,
				source: "native" as const,
				data,
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	},
	["native-icons-array"],
	{ revalidate: CACHE_TTL_SECONDS, tags: ["native-icons"] },
)

const getCachedIconNames = unstable_cache(
	async (): Promise<string[]> => {
		const iconsData = await iconService.getAllIcons()
		return Object.keys(iconsData)
	},
	["icon-names"],
	{ revalidate: CACHE_TTL_SECONDS, tags: ["native-icons"] },
)

const getCachedRecentlyAdded = unstable_cache(
	async (limit: number): Promise<IconWithName[]> => {
		const icons = await getCachedIconsArray()
		return icons
			.toSorted((a, b) => new Date(b.data.update.timestamp).getTime() - new Date(a.data.update.timestamp).getTime())
			.slice(0, limit)
			.map(({ name, data }) => ({ name, data }))
	},
	["recently-added-icons"],
	{ revalidate: CACHE_TTL_SECONDS, tags: ["native-icons"] },
)

export async function getAllIcons(): Promise<IconFile> {
	try {
		return await iconService.getAllIcons()
	} catch (error) {
		if (error instanceof ApiError) throw error
		console.error("Error fetching icons:", error)
		throw new ApiError("Failed to fetch icons data. Please try again later.")
	}
}

export async function getIconNames(): Promise<string[]> {
	return getCachedIconNames()
}

export async function getIconsArray(): Promise<NativeIconRecord[]> {
	return getCachedIconsArray()
}

export async function getIconData(iconName: string): Promise<IconWithName | null> {
	try {
		const name = assertIconName(iconName)
		const data = (await getAllIcons())[name]
		if (!data) return null
		return { name, data }
	} catch (error) {
		if (error instanceof ValidationError) return null
		throw error
	}
}

async function fetchGitHubAuthorData(authorId: number): Promise<AuthorData> {
	try {
		const response = await fetch(`https://api.github.com/user/${authorId}`, {
			headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
		})

		if (response.status === 401 || response.status === 403) {
			console.warn(`GitHub API rate limit or authorization issue: ${response.statusText}`)
			return UNKNOWN_AUTHOR
		}

		if (!response.ok) {
			throw new ApiError(`Failed to fetch author data: ${response.statusText}`, response.status)
		}

		return response.json()
	} catch (error) {
		if (error instanceof ApiError) throw error
		logAuthorFetchFailure(error)
		return UNKNOWN_AUTHOR
	}
}

function buildInternalAuthorData(author: { id: string | number; name?: string; login?: string }): AuthorData {
	return {
		id: author.id,
		name: author.name || "Community Contributor",
		login: author.login || author.name || "contributor",
		avatar_url: "",
		html_url: "",
	}
}

function applyAuthorMetaFallback(data: AuthorData, authorMeta?: { name?: string; login?: string }): AuthorData {
	if (!authorMeta?.login) return data
	if (data.login !== "unknown" && data.html_url) return data

	return {
		...data,
		login: authorMeta.login,
		name: data.name || authorMeta.name || authorMeta.login,
		html_url: `https://github.com/${authorMeta.login}`,
		avatar_url: data.avatar_url || `https://github.com/${authorMeta.login}.png`,
	}
}

async function resolveAuthorData(authorId: number | string, authorMeta?: { name?: string; login?: string }): Promise<AuthorData> {
	if (typeof authorId === "string" && !GITHUB_NUMERIC_ID.test(authorId)) {
		return buildInternalAuthorData({ id: authorId, ...authorMeta })
	}

	const ghId = typeof authorId === "number" ? authorId : Number(authorId)
	const data = await getCachedGitHubAuthorData(ghId)
	return applyAuthorMetaFallback(data, authorMeta)
}

export async function getAuthorData(authorId: number | string, authorMeta?: { name?: string; login?: string }): Promise<AuthorData> {
	const cacheKey = String(authorId)
	const cached = authorDataCache.get(cacheKey)
	if (cached) return cached

	const data = await resolveAuthorData(authorId, authorMeta)
	authorDataCache.set(cacheKey, data)
	return data
}

export function computeRelatedIcons(currentIcon: string, currentCategories: string[], allIcons: IconFile): RelatedIcon[] {
	if (currentCategories.length === 0) return []

	const categorySet = new Set(currentCategories)
	const scored: { name: string; data: Icon; score: number }[] = []

	for (const [name, data] of Object.entries(allIcons)) {
		if (name === currentIcon) continue

		const otherCategories = data.categories
		if (!otherCategories?.length) continue

		let score = 0
		for (const cat of otherCategories) {
			if (categorySet.has(cat)) score++
		}
		if (score === 0) continue

		scored.push({ name, data, score })
	}

	return scored
		.toSorted((a, b) => b.score - a.score)
		.slice(0, MAX_RELATED_ICONS)
		.map(({ name, data }) => ({
			name,
			data: {
				base: data.base,
				aliases: data.aliases ?? [],
				categories: data.categories,
				update: data.update,
				colors: data.colors,
			},
		}))
}

export async function getTotalIcons() {
	const { getExternalIcons } = await import("@/lib/external-icons")
	const [iconsData, externalIcons] = await Promise.all([getAllIcons(), getExternalIcons()])

	const nativeCount = Object.keys(iconsData).length
	const externalCount = externalIcons.length
	const sourceCounts: Record<string, number> = {}

	for (const icon of externalIcons) {
		sourceCounts[icon.source] = (sourceCounts[icon.source] ?? 0) + 1
	}

	return {
		totalIcons: nativeCount + externalCount,
		nativeCount,
		externalCount,
		sourceCounts,
	}
}

export async function getRecentlyAddedIcons(limit = 8): Promise<IconWithName[]> {
	return getCachedRecentlyAdded(limit)
}

export function clearAuthorDataCacheForTests(): void {
	authorDataCache.clear()
	hasLoggedAuthorFetchFailure = false
}
