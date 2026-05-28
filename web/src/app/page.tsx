import { HomeFaq } from "@/components/home-faq"
import { HeroSection } from "@/components/hero"
import { RecentlyAddedIcons } from "@/components/recently-added-icons"
import { JsonLd } from "@/components/seo/json-ld"
import { REPO_NAME, getDescription } from "@/constants"
import { getRecentlyAddedIcons, getTotalIcons } from "@/lib/api"
import { buildHomePageGraph } from "@/lib/seo/schemas"

async function getGitHubStars() {
	try {
		const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`, {
			next: { revalidate: 3600 },
		})
		if (!response.ok) return 0
		const data = await response.json()
		return data.stargazers_count ?? 0
	} catch {
		return 0
	}
}

export default async function Home() {
	const iconStats = await getTotalIcons()
	const recentIcons = await getRecentlyAddedIcons(20)
	const stars = await getGitHubStars()
	const description = getDescription(iconStats.totalIcons)

	return (
		<>
			<JsonLd data={buildHomePageGraph({ totalIcons: iconStats.totalIcons, description })} />
			<div className="flex flex-col min-h-screen">
				<HeroSection
					totalIcons={iconStats.totalIcons}
					nativeCount={iconStats.nativeCount}
					sourceCounts={iconStats.sourceCounts}
					stars={stars}
				/>
				<RecentlyAddedIcons icons={recentIcons} />
				<HomeFaq />
			</div>
		</>
	)
}
