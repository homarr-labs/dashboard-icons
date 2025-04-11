import { promises as fs } from "node:fs"
import type { IconFile, IconWithName } from "@/types"

/**
 * Fetches all icon data from the metadata.json file
 */
export async function getAllIcons(): Promise<IconFile> {
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	return JSON.parse(file) as IconFile
}

export const getIconsWithoutData = async (): Promise<string[]> => {
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
export async function getAuthorData(authorId: number) {
	const response = await fetch(`https://api.github.com/user/${authorId}`, {
		headers: {
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
		},
	})

	return response.json()
}

/**
 * Fetches featured icons for the homepage
 */
export async function getTotalIcons() {
	const iconsData = await getAllIcons()

	return {
		totalIcons: Object.keys(iconsData).length,
	}
}
