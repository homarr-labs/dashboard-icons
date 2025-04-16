import { BASE_URL, WEB_URL } from "@/constants";
import { getAllIcons } from "@/lib/api";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const iconsData = await getAllIcons();
	return [
		{
			url: WEB_URL,
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 1,
		},
		{
			url: `${WEB_URL}/icons`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
			images: [`${WEB_URL}/icons/icon.png`],
		},
		...Object.keys(iconsData).map((iconName) => ({
			url: `${WEB_URL}/icons/${iconName}`,
			lastModified: iconsData[iconName].update.timestamp,
			changeFrequency: "yearly" as const,
			priority: 0.8,
			images: [
				`${BASE_URL}/png/${iconName}.png`,
				// SVG is conditional if it exists
				iconsData[iconName].base === "svg"
					? `${BASE_URL}/svg/${iconName}.svg`
					: null,
				`${BASE_URL}/webp/${iconName}.webp`,
			].filter(Boolean) as string[],
		})),
	];
}
