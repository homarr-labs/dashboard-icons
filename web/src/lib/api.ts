import type { AuthorData, IconFile, IconWithName } from "@/types/icons"
import { cache } from "react"
/**
 * Fetches all icon data from the metadata.json file
 */
export const getAllIcons = cache(async (): Promise<IconFile> => {
	try {
		const response = await fetch("https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json", {
			next: { revalidate: 3600 }, // Revalidate cache every hour
		})
		if (!response.ok) {
			console.error(`Failed to fetch metadata.json: ${response.status} ${response.statusText}`)
			return {} // Return empty object on error
		}
		return (await response.json()) as IconFile
	} catch (error) {
		console.error("Error fetching metadata.json:", error)
		return {} // Return empty object on network error
	}
})

/**
 * Gets a list of all icon names.
 */
export const getIconNames = async (): Promise<string[]> => {
	const iconsData = await getAllIcons()
	return Object.keys(iconsData)
}

/**
 * Converts icon data to an array format for easier rendering
 */
export async function getIconsArray(): Promise<IconWithName[]> {
	const iconsData = await getAllIcons()

	return Object.entries(iconsData)
		.map(([name, data]) => ({
			name,
			data,
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Fetches data for a specific icon
 */
export async function getIconData(iconName: string): Promise<IconWithName | null> {
	const iconsData = await getAllIcons()
	const iconData = iconsData[iconName]

	if (!iconData) {
		return null
	}

	return {
		name: iconName,
		data: iconData,
	}
}

/**
 * Fetches author data from GitHub API
 */
export const getAuthorData = cache(async (authorId: number): Promise<AuthorData | null> => {
	// Fail fast if GITHUB_TOKEN is missing
	if (!process.env.GITHUB_TOKEN) {
		console.error("GITHUB_TOKEN environment variable is not set. Cannot fetch author data.")
		return {
			login: `auth-missing-${authorId}`,
			id: authorId,
			avatar_url: "",
			html_url: "#",
			name: "Auth Token Missing",
		}
	}

	try {
		const response = await fetch(`https://api.github.com/user/${authorId}`, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
			next: { revalidate: 86400 }, // Revalidate cache once a day
		})

		if (!response.ok) {
			console.error(`Failed to fetch author data for ID ${authorId}: ${response.status} ${response.statusText}. Body: ${await response.text()}`)
			return {
				login: `fetch-failed-${authorId}`,
				id: authorId,
				avatar_url: "",
				html_url: "#",
				name: "Fetch Failed", // More specific name for debugging
			}
		}

		const data = (await response.json()) as AuthorData
		// Basic validation (could be expanded or use Zod)
		if (typeof data !== "object" || data === null || typeof data.id !== "number" || typeof data.login !== "string") {
			console.error(`Invalid author data received for ID ${authorId}`)
			return {
				login: `invalid-data-${authorId}`,
				id: authorId,
				avatar_url: "",
				html_url: "#",
				name: "Invalid Data", // More specific name for debugging
			}
		}
		return data
	} catch (error) {
		console.error(`Error fetching author data for ID ${authorId}:`, error)
		return {
			login: `network-error-${authorId}`,
			id: authorId,
			avatar_url: "",
			html_url: "#",
			name: "Network Error", // More specific name for debugging
		}
	}
})

/**
 * Fetches featured icons for the homepage
 */
export async function getTotalIcons() {
	const iconsData = await getAllIcons()

	return {
		totalIcons: Object.keys(iconsData).length,
	}
}
