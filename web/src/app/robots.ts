import type { MetadataRoute } from "next"
import { WEB_URL } from "@/constants"

const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const

const DISALLOWED_PATHS = ["/api/", "/dashboard/", "/submit/", "/og/"]

function buildCrawlerRule(userAgent: string) {
	return {
		userAgent,
		allow: "/",
		disallow: DISALLOWED_PATHS,
	}
}

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [buildCrawlerRule("*"), ...AI_CRAWLERS.map((crawler) => buildCrawlerRule(crawler))],
		sitemap: `${WEB_URL}/sitemap.xml`,
	}
}
