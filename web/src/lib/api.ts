import { unstable_cache } from "next/cache"
import { cache } from "react"
import { METADATA_URL } from "@/constants"
import { ApiError } from "@/lib/errors"
import type { AuthorData, IconFile, IconWithName } from "@/types/icons"

/**
 * Raw fetch function for icon data (without caching)
 */
async function fetchAllIconsRaw(): Promise<IconFile> {
	try {
		const response = await fetch(METADATA_URL, {
			next: { revalidate: 3600 },
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
 * Cached version using unstable_cache for build-time caching
 * Revalidates every hour (3600 seconds)
 */
const getAllIconsCached = unstable_cache(async () => fetchAllIconsRaw(), ["all-icons"], {
	revalidate: 3600,
	tags: ["icons"],
})

/**
 * Fetches all icon data from the metadata.json file
 * Uses React cache() for request-level memoization and unstable_cache for build-level caching
 * This prevents duplicate fetches within the same request and across builds
 */
export const getAllIcons = cache(async (): Promise<IconFile> => {
	return getAllIconsCached()
})

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
export async function getIconsArray(): Promise<IconWithName[]> {
	try {
		const iconsData = await getAllIcons()

		return Object.entries(iconsData)
			.map(([name, data]) => ({
				name,
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
async function fetchAuthorData(authorId: number) {
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

const authorDataCache: Record<number, AuthorData> = {}

/**
 * Cached version of fetchAuthorData
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 86400 seconds (24 hours)
 * Cache key: author-{authorId}
 *
 * This prevents hitting GitHub API rate limits by caching author data
 * across multiple page builds and requests.
 */
export async function getAuthorData(authorId: number): Promise<AuthorData> {
	if (authorDataCache[authorId]) {
		return authorDataCache[authorId]
	}

	const data = await fetchAuthorData(authorId)
	authorDataCache[authorId] = data
	return data
}

/**
 * Fetches total icon count
 */
export async function getTotalIcons() {
	try {
		const iconsData = await getAllIcons()

		return {
			totalIcons: Object.keys(iconsData).length,
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
