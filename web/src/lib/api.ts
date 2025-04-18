import { METADATA_URL } from "@/constants"
import type { IconFile, IconWithName } from "@/types/icons"

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
	status: number

	constructor(message: string, status = 500) {
		super(message)
		this.name = "ApiError"
		this.status = status
	}
}

/**
 * Fetches all icon data from the metadata.json file
 */
export async function getAllIcons(): Promise<IconFile> {
	try {
		const response = await fetch(METADATA_URL)

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
 * Fetches author data from GitHub API
 */
export async function getAuthorData(authorId: number) {
	try {
		const response = await fetch(`https://api.github.com/user/${authorId}`, {
			headers: {
				Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
				"Cache-Control": "public, max-age=86400",
			},
			next: { revalidate: 86400 }, // Revalidate cache once a day
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
