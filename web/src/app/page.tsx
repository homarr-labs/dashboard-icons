import { HeroSection } from "@/components/hero"
import { RecentlyAddedIcons } from "@/components/recently-added-icons"
import { BASE_URL, getDescription, REPO_NAME, websiteTitle } from "@/constants"
import { getRecentlyAddedIcons, getTotalIcons } from "@/lib/api"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
	const { totalIcons } = await getTotalIcons()

	return {
		title: websiteTitle,
		description: getDescription(totalIcons),
		keywords: ["dashboard icons", "service icons", "application icons", "tool icons", "web dashboard", "app directory"],
		openGraph: {
			title: websiteTitle,
			description: getDescription(totalIcons),
			type: "website",
			url: BASE_URL,
			images: [
				{
					url: "/og-image.png",
					width: 1200,
					height: 630,
					alt: "Dashboard Icons",
				},
			],
		},
		twitter: {
			title: websiteTitle,
			description: getDescription(totalIcons),
			card: "summary_large_image",
			images: ["/og-image.png"],
		},
		alternates: {
			canonical: BASE_URL,
		},
	}
}

async function getGitHubStars() {
	const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`)
	const data = await response.json()
	console.log(`GitHub stars: ${data.stargazers_count}`)
	return data.stargazers_count
}

export default async function Home() {
	const { totalIcons } = await getTotalIcons()
	const recentIcons = await getRecentlyAddedIcons(10)
	const stars = await getGitHubStars()

	return (
		<div className="flex flex-col min-h-screen">
			<HeroSection totalIcons={totalIcons} stars={stars} />
			<RecentlyAddedIcons icons={recentIcons} />
		</div>
	)
}
