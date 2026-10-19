import { SITEMAP_IDS, sitemapUrl } from "@/lib/sitemap"

export function GET() {
	const sitemaps = SITEMAP_IDS.map((id) => `<sitemap><loc>${sitemapUrl(id)}</loc></sitemap>`).join("\n")
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>
`
	return new Response(xml, { headers: { "Content-Type": "application/xml" } })
}
