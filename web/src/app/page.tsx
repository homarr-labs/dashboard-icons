export const revalidate = 900

import { HeroSection } from "@/components/hero"
import { RecentlyAddedIcons } from "@/components/recently-added-icons"
import { REPO_NAME, WEB_URL } from "@/constants"
import { getRecentlyAddedIcons, getTotalIcons } from "@/lib/api"

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

	const websiteJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "Dashboard Icons",
		url: WEB_URL,
		description: `A collection of ${iconStats.totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
		inLanguage: "en",
		publisher: {
			"@type": "Organization",
			name: "Homarr Labs",
		},
	}

	const organizationJsonLd = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Homarr Labs",
		url: WEB_URL,
		logo: {
			"@type": "ImageObject",
			url: `${WEB_URL}/og-image.png`,
			width: 1200,
			height: 630,
		},
		sameAs: [`https://github.com/${REPO_NAME}`],
	}

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
			/>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
			/>
			<div className="flex flex-col min-h-screen">
				<HeroSection
					totalIcons={iconStats.totalIcons}
					nativeCount={iconStats.nativeCount}
					sourceCounts={iconStats.sourceCounts}
					stars={stars}
				/>
				<RecentlyAddedIcons icons={recentIcons} />
			</div>
		</>
	)
}
