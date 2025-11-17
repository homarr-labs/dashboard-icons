import type { MetadataRoute } from "next"
import { BASE_URL, WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/api"

export const dynamic = "force-static"

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date: Date): string => {
	// Format to YYYY-MM-DD
	return date.toISOString().split("T")[0]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const iconsData = await getAllIcons()
	return [
		{
			url: WEB_URL,
			lastModified: formatDate(new Date()),
			changeFrequency: "yearly",
			priority: 1,
		},
		{
			url: `${WEB_URL}/icons`,
			lastModified: formatDate(new Date()),
			changeFrequency: "daily",
			priority: 1,
			images: [`${WEB_URL}/icons/icon.png`],
		},
		...Object.keys(iconsData).map((iconName) => ({
			url: `${WEB_URL}/icons/${iconName}`,
			lastModified: formatDate(new Date(iconsData[iconName].update.timestamp)),
			changeFrequency: "yearly" as const,
			priority: 0.8,
			images: [
				`${BASE_URL}/png/${iconName}.png`,
				// SVG is conditional if it exists
				iconsData[iconName].base === "svg" ? `${BASE_URL}/svg/${iconName}.svg` : null,
				`${BASE_URL}/webp/${iconName}.webp`,
			].filter(Boolean) as string[],
		})),
	]
}
