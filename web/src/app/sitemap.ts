import type { MetadataRoute } from "next"
import { BASE_URL, WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/api"
import { getCommunitySubmissions } from "@/lib/community"
import { resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIcons } from "@/lib/external-icons"

export const revalidate = 900

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date: Date): string => {
	if (Number.isNaN(date.getTime())) return "2024-01-01"
	return date.toISOString().split("T")[0]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [iconsData, externalIcons, communityIcons] = await Promise.all([getAllIcons(), getExternalIcons(), getCommunitySubmissions()])
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
		{
			url: `${WEB_URL}/community`,
			lastModified: formatDate(new Date()),
			changeFrequency: "daily",
			priority: 0.7,
		},
		...Object.keys(iconsData).map((iconName) => ({
			url: `${WEB_URL}/icons/${iconName}`,
			lastModified: formatDate(new Date(iconsData[iconName].update.timestamp)),
			changeFrequency: "yearly" as const,
			priority: 0.8,
			images: [
				`${BASE_URL}/png/${iconName}.png`,
				iconsData[iconName].base === "svg" ? `${BASE_URL}/svg/${iconName}.svg` : null,
				`${BASE_URL}/webp/${iconName}.webp`,
			].filter(Boolean) as string[],
		})),
		...externalIcons
			.filter((icon, i, arr) => arr.findIndex((a) => a.slug === icon.slug) === i)
			.map((icon) => {
				const formats = (icon.external.formats ?? []).filter((f) => f === "svg" || f === "png" || f === "webp")
				const images: string[] = formats.map((format) => resolveExternalIconUrl(icon.external, format))
				const variants = icon.external.variants ?? {}
				for (const format of formats) {
					if (format === "svg") continue
					if (variants.light) images.push(resolveExternalIconUrl(icon.external, `${format}_light`))
					if (variants.dark) images.push(resolveExternalIconUrl(icon.external, `${format}_dark`))
				}
				return {
					url: `${WEB_URL}/icons/external/${icon.slug}`,
					lastModified: formatDate(
						new Date(icon.external.updated_at_source || icon.external.updated || icon.external.created || Date.now()),
					),
					changeFrequency: "yearly" as const,
					priority: 0.6,
					images,
				}
			}),
		...communityIcons.map((icon) => ({
			url: `${WEB_URL}/community/${icon.name}`,
			lastModified: formatDate(new Date(icon.data.update.timestamp)),
			changeFrequency: "weekly" as const,
			priority: 0.5,
		})),
	]
}
