import type { MetadataRoute } from "next"
import { BASE_URL, EXTERNAL_SOURCE_IDS, type ExternalSourceId, WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/api"
import { getCommunitySubmissions } from "@/lib/community"
import { resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIcons, getSlugOwners } from "@/lib/external-icons"
import type { ExternalIconRecord } from "@/types/icons"

const EXTERNAL_PREFIX = "external-"

type ExternalSitemapId = `${typeof EXTERNAL_PREFIX}${ExternalSourceId}`

export type SitemapId = "pages" | "icons" | ExternalSitemapId | "community"

export const SITEMAP_IDS: readonly SitemapId[] = [
	"pages",
	"icons",
	...EXTERNAL_SOURCE_IDS.map((source) => `${EXTERNAL_PREFIX}${source}` as const),
	"community",
]

export function sitemapUrl(id: SitemapId): string {
	return `${WEB_URL}/sitemaps/sitemap/${id}.xml`
}

const toLastModified = (value: string | undefined): string | undefined => {
	if (!value) return undefined
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return undefined
	return date.toISOString()
}

const isOwnUrl = (url: string): boolean => new URL(url).origin === new URL(WEB_URL).origin

function pagesSitemap(): MetadataRoute.Sitemap {
	return [
		{ url: WEB_URL, changeFrequency: "yearly", priority: 1 },
		{ url: `${WEB_URL}/icons`, changeFrequency: "daily", priority: 1 },
		{ url: `${WEB_URL}/community`, changeFrequency: "daily", priority: 0.7 },
		{ url: `${WEB_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
		{ url: `${WEB_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
	]
}

async function iconsSitemap(): Promise<MetadataRoute.Sitemap> {
	const iconsData = await getAllIcons()
	return Object.entries(iconsData).map(([iconName, icon]) => ({
		url: `${WEB_URL}/icons/${iconName}`,
		lastModified: toLastModified(icon.update.timestamp),
		changeFrequency: "yearly",
		priority: 0.8,
		images: [
			`${BASE_URL}/png/${iconName}.png`,
			...(icon.base === "svg" ? [`${BASE_URL}/svg/${iconName}.svg`] : []),
			`${BASE_URL}/webp/${iconName}.webp`,
		],
	}))
}

function externalIconImages(icon: ExternalIconRecord): string[] {
	const formats = (icon.external.formats ?? []).filter((format) => format === "svg" || format === "png" || format === "webp")
	const keys: string[] = [...formats]
	const variants = icon.external.variants ?? {}
	for (const format of formats) {
		if (format === "svg") continue
		if (variants.light) keys.push(`${format}_light`)
		if (variants.dark) keys.push(`${format}_dark`)
	}
	return keys.map((key) => new URL(resolveExternalIconUrl(icon.external, key), WEB_URL).href).filter(isOwnUrl)
}

async function externalSitemap(source: ExternalSourceId): Promise<MetadataRoute.Sitemap> {
	const externalIcons = await getExternalIcons()
	return getSlugOwners(externalIcons)
		.filter((icon) => icon.source === source)
		.map((icon) => ({
			url: `${WEB_URL}/icons/external/${icon.slug}`,
			lastModified: toLastModified(icon.updatedAt),
			changeFrequency: "yearly",
			priority: 0.6,
			images: externalIconImages(icon),
		}))
}

async function communitySitemap(): Promise<MetadataRoute.Sitemap> {
	const communityIcons = await getCommunitySubmissions()
	return communityIcons.map((icon) => ({
		url: `${WEB_URL}/community/submissions/${icon.slug}`,
		lastModified: toLastModified(icon.data.update.timestamp),
		changeFrequency: "weekly",
		priority: 0.5,
	}))
}

export async function buildSitemap(id: SitemapId): Promise<MetadataRoute.Sitemap> {
	switch (id) {
		case "pages":
			return pagesSitemap()
		case "icons":
			return iconsSitemap()
		case "community":
			return communitySitemap()
		default: {
			const externalId: ExternalSitemapId = id
			return externalSitemap(externalId.slice(EXTERNAL_PREFIX.length) as ExternalSourceId)
		}
	}
}
