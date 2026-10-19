import type { MetadataRoute } from "next"
import { buildSitemap, SITEMAP_IDS, type SitemapId } from "@/lib/sitemap"

// The build database is empty; discover imported icons from the mounted database.
export const dynamic = "force-dynamic"

export function generateSitemaps() {
	return SITEMAP_IDS.map((id) => ({ id }))
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
	return buildSitemap((await id) as SitemapId)
}
