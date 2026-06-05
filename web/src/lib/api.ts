import type { RelatedIcon } from "@/components/icon-details"
import { METADATA_URL } from "@/constants"
import { ApiError } from "@/lib/errors"
import type { AuthorData, Icon, IconFile, IconWithName, NativeIconRecord } from "@/types/icons"

/**
 * Fetches all icon data from the metadata.json file
 * Uses fetch with revalidate for caching
 */
export async function getAllIcons(): Promise<IconFile> {
	try {
		const response = await fetch(METADATA_URL, {
			next: { revalidate: 900, tags: ["native-icons"] },
		})

		if (!response.ok) {
			throw new ApiError(`Failed to fetch icons: ${response.statusText}`, response.status)
		}

		return (await response.json()) as IconFile
	} catch (error) {
		if (error instanceof ApiError) {
			throw error
		}
		console.error("Error fetching icons:", error)
		throw new ApiError("Failed to fetch icons data. Please try again later.")
	}
}

/**
 * Gets a list of all icon names.
 */
export const getIconNames = async (): Promise<string[]> => {
	try {
		const iconsData = await getAllIcons()
		return Object.keys(iconsData)
	} catch (error) {
		console.error("Error getting icon names:", error)
		throw error
	}
}

/**
 * Converts icon data to an array format for easier rendering
 */
export async function getIconsArray(): Promise<NativeIconRecord[]> {
	try {
		const iconsData = await getAllIcons()

		return Object.entries(iconsData)
			.map(([name, data]) => ({
				name,
				slug: name,
				source: "native" as const,
				data,
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	} catch (error) {
		console.error("Error getting icons array:", error)
		throw error
	}
}

/**
 * Fetches data for a specific icon
 */
export async function getIconData(iconName: string): Promise<IconWithName | null> {
	try {
		const iconsData = await getAllIcons()
		const iconData = iconsData[iconName]

		if (!iconData) {
			throw new ApiError(`Icon '${iconName}' not found`, 404)
		}

		return {
			name: iconName,
			data: iconData,
		}
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null
		}
		console.error("Error getting icon data:", error)
		throw error
	}
}

/**
 * Fetch author data from GitHub API (raw function without caching)
 */
async function fetchGitHubAuthorData(authorId: number) {
	try {
		const response = await fetch(`https://api.github.com/user/${authorId}`, {
			headers: {
				Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
			},
		})

		if (!response.ok) {
			// If unauthorized or other error, return a default user object
			if (response.status === 401 || response.status === 403) {
				console.warn(`GitHub API rate limit or authorization issue: ${response.statusText}`)
				return {
					login: "unknown",
					avatar_url: "https://avatars.githubusercontent.com/u/0",
					html_url: "https://github.com",
					name: "Unknown User",
					bio: null,
				}
			}
			throw new ApiError(`Failed to fetch author data: ${response.statusText}`, response.status)
		}

		return response.json()
	} catch (error) {
		console.error("Error fetching author data:", error)
		// Even for unexpected errors, return a default user to prevent page failures
		return {
			login: "unknown",
			avatar_url: "https://avatars.githubusercontent.com/u/0",
			html_url: "https://github.com",
			name: "Unknown User",
			bio: null,
		}
	}
}

const authorDataCache: Record<string | number, AuthorData> = {}

/**
 * Build author data from internal (PocketBase) user metadata
 * These users don't have GitHub profiles, so we construct a local AuthorData object
 * - No html_url so the component won't render a link
 * - Uses a generic avatar placeholder
 */
function buildInternalAuthorData(author: { id: string | number; name?: string; login?: string }): AuthorData {
	return {
		id: author.id,
		name: author.name || "Community Contributor",
		login: author.login || author.name || "contributor",
		avatar_url: "", // Empty = will use fallback avatar in component
		html_url: "", // Empty = no link will be rendered
	}
}

/**
 * Cached version of fetchAuthorData
 * Supports both GitHub users (numeric IDs) and internal PocketBase users (string IDs)
 *
 * For GitHub users: fetches from GitHub API
 * For internal users: constructs AuthorData from the embedded metadata
 *
 * This prevents hitting GitHub API rate limits by caching author data
 * across multiple page builds and requests.
 */
export async function getAuthorData(authorId: number | string, authorMeta?: { name?: string; login?: string }): Promise<AuthorData> {
	const cacheKey = String(authorId)

	if (authorDataCache[cacheKey]) {
		return authorDataCache[cacheKey]
	}

	let data: AuthorData

	// If authorId is a numeric string, treat it as a GitHub user ID.
	if (typeof authorId === "string" && /^\d+$/.test(authorId)) {
		const ghId = Number(authorId)
		data = await fetchGitHubAuthorData(ghId)

		// If GitHub API fails (rate-limited, no token, etc.), fall back to authorMeta.login to still render a link.
		if (authorMeta?.login && (data.login === "unknown" || !data.html_url)) {
			data = {
				...data,
				login: authorMeta.login,
				name: data.name || authorMeta.name || authorMeta.login,
				html_url: `https://github.com/${authorMeta.login}`,
				avatar_url: data.avatar_url || `https://github.com/${authorMeta.login}.png`,
			}
		}
	} else if (typeof authorId === "string") {
		// Non-numeric string => internal PocketBase user
		data = buildInternalAuthorData({ id: authorId, ...authorMeta })
	} else {
		// Numeric ID = GitHub user
		data = await fetchGitHubAuthorData(authorId)
	}

	authorDataCache[cacheKey] = data
	return data
}

const MAX_RELATED_ICONS = 16

export function computeRelatedIcons(currentIcon: string, currentCategories: string[], allIcons: IconFile): RelatedIcon[] {
	if (currentCategories.length === 0) return []

	const scored: { name: string; data: Icon; score: number }[] = []
	for (const [name, data] of Object.entries(allIcons)) {
		if (name === currentIcon) continue
		const otherCategories = data.categories || []
		let score = 0
		for (const cat of currentCategories) {
			if (otherCategories.includes(cat)) score++
		}
		if (score > 0) scored.push({ name, data, score })
	}

	scored.sort((a, b) => b.score - a.score)

	return scored.slice(0, MAX_RELATED_ICONS).map(({ name, data }) => ({
		name,
		data: {
			base: data.base,
			aliases: data.aliases ?? [],
			categories: data.categories ?? [],
			update: data.update,
			colors: data.colors,
		},
	}))
}

/**
 * Fetches total icon count with per-source breakdown
 */
export async function getTotalIcons() {
	const { getExternalIcons } = await import("@/lib/external-icons")
	try {
		const [iconsData, externalIcons] = await Promise.all([getAllIcons(), getExternalIcons()])
		const nativeCount = Object.keys(iconsData).length
		const externalCount = externalIcons.length
		const sourceCounts: Record<string, number> = {}
		for (const icon of externalIcons) {
			sourceCounts[icon.source] = (sourceCounts[icon.source] || 0) + 1
		}

		return {
			totalIcons: nativeCount + externalCount,
			nativeCount,
			externalCount,
			sourceCounts,
		}
	} catch (error) {
		console.error("Error getting total icons:", error)
		throw error
	}
}

/**
 * Fetches recently added icons sorted by timestamp
 */
export async function getRecentlyAddedIcons(limit = 8): Promise<IconWithName[]> {
	try {
		const icons = await getIconsArray()

		return icons
			.sort((a, b) => {
				// Sort by timestamp in descending order (newest first)
				return new Date(b.data.update.timestamp).getTime() - new Date(a.data.update.timestamp).getTime()
			})
			.slice(0, limit)
	} catch (error) {
		console.error("Error getting recently added icons:", error)
		throw error
	}
}
