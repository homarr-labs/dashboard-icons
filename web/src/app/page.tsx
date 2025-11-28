import { HeroSection } from "@/components/hero"
import { RecentlyAddedIcons } from "@/components/recently-added-icons"
import { REPO_NAME } from "@/constants"
import { getRecentlyAddedIcons, getTotalIcons } from "@/lib/api"

async function getGitHubStars() {
	const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`, {
		next: { revalidate: 3600 },
	})
	const data = await response.json()
	console.log(`GitHub stars: ${data.stargazers_count}`)
	return data.stargazers_count
}

export default async function Home() {
	const { totalIcons } = await getTotalIcons()
	const recentIcons = await getRecentlyAddedIcons(20)
	const stars = await getGitHubStars()

	return (
		<div className="flex flex-col min-h-screen">
			<HeroSection totalIcons={totalIcons} stars={stars} />
			<RecentlyAddedIcons icons={recentIcons} />
		</div>
	)
}
