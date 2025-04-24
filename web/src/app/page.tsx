import { HeroSection } from "@/components/hero"
import { RecentlyAddedIcons } from "@/components/recently-added-icons"
import {
	BASE_URL,
	DEFAULT_KEYWORDS,
	DEFAULT_OG_IMAGE,
	GITHUB_URL,
	ORGANIZATION_NAME,
	ORGANIZATION_SCHEMA,
	REPO_NAME,
	SITE_NAME,
	SITE_TAGLINE,
	WEB_URL,
	getHomeDescription,
	websiteFullTitle,
	websiteTitle,
} from "@/constants"
import { getRecentlyAddedIcons, getTotalIcons } from "@/lib/api"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
	const { totalIcons } = await getTotalIcons()
	const description = getHomeDescription(totalIcons)

	return {
		title: websiteTitle,
		description,
		keywords: DEFAULT_KEYWORDS,
		robots: {
			index: true,
			follow: true,
		},
		openGraph: {
			title: websiteFullTitle,
			description,
			type: "website",
			url: WEB_URL,
			images: [DEFAULT_OG_IMAGE],
		},
		twitter: {
			title: websiteFullTitle,
			description,
			card: "summary_large_image",
			images: [DEFAULT_OG_IMAGE.url],
		},
		alternates: {
			canonical: WEB_URL,
		},
	}
}

async function getGitHubStars() {
	const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`)
	const data = await response.json()
	// TODO: Consider caching this result or fetching at build time to avoid rate limits.
	return data.stargazers_count
}

export default async function Home() {
	const { totalIcons } = await getTotalIcons()
	const recentIcons = await getRecentlyAddedIcons(10)
	const stars = await getGitHubStars()

	return (
		<>
			<div className="flex flex-col min-h-screen">
				<HeroSection totalIcons={totalIcons} stars={stars} />
				<RecentlyAddedIcons icons={recentIcons} />
			</div>
		</>
	)
}
