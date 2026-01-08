import type { Metadata } from "next"
import { Suspense } from "react"
import { CommunityIconSearch } from "@/components/community-icon-search"
import { BASE_URL } from "@/constants"
import { fetchCommunitySubmissions, getCommunitySubmissions } from "@/lib/community"

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
	const icons = await getCommunitySubmissions()
	const totalIcons = icons.length

	return {
		title: "Browse Community Icons | Dashboard Icons",
		description: `Search and browse through ${totalIcons} community-submitted icons awaiting review and addition to the Dashboard Icons collection.`,
		keywords: [
			"community icons",
			"browse community icons",
			"icon submissions",
			"community contributions",
			"pending icons",
			"approved icons",
			"dashboard icons community",
			"user submitted icons",
		],
		openGraph: {
			title: "Browse Community Icons | Dashboard Icons",
			description: `Search and browse through ${totalIcons} community-submitted icons awaiting review and addition to the Dashboard Icons collection.`,
			type: "website",
			url: `${BASE_URL}/community`,
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Community Icons | Dashboard Icons",
			description: `Search and browse through ${totalIcons} community-submitted icons awaiting review and addition to the Dashboard Icons collection.`,
		},
		alternates: {
			canonical: `${BASE_URL}/community`,
		},
	}
}

export default async function CommunityPage() {
	const icons = await fetchCommunitySubmissions();
	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Browse community icons</h1>
					<p className="text-muted-foreground mb-1">Search through our collection of {icons.length} community-submitted icons.</p>
				</div>
			</div>
			<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
				<CommunityIconSearch icons={icons as any} />
			</Suspense>
		</div>
	)
}
