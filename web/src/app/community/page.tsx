import type { Metadata } from "next"
import { Suspense } from "react"
import { CommunityIconSearch } from "@/components/community-icon-search"
import { JsonLd } from "@/components/seo/json-ld"
import { WEB_URL } from "@/constants"
import { fetchCommunitySubmissions, getCommunitySubmissions } from "@/lib/community"
import { buildDefaultOgImages, buildDefaultTwitterImages, getFilteredBrowseMetadata } from "@/lib/seo/metadata"
import { buildCommunityBrowseGraph } from "@/lib/seo/schemas"

export const revalidate = 300

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
	const [icons, params] = await Promise.all([getCommunitySubmissions(), searchParams])
	const totalIcons = icons.length
	const description = `Search and browse through ${totalIcons} community-submitted icons and logos awaiting review and addition to the Dashboard Icons collection.`

	return {
		title: "Browse Community Icons & Logos",
		description,
		keywords: [
			"community icons",
			"community logos",
			"browse community icons",
			"icon submissions",
			"logo submissions",
			"community contributions",
			"pending icons",
			"approved icons",
			"dashboard icons community",
			"user submitted icons",
		],
		openGraph: {
			title: "Browse Community Icons & Logos",
			description,
			type: "website",
			url: `${WEB_URL}/community`,
			images: buildDefaultOgImages("Browse Community Dashboard Icons"),
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Community Icons & Logos",
			description,
			images: buildDefaultTwitterImages(),
		},
		...getFilteredBrowseMetadata(params, "/community"),
	}
}

export default async function CommunityPage() {
	const icons = await fetchCommunitySubmissions()
	const description = `Search and browse through ${icons.length} community-submitted icons and logos awaiting review and addition to the Dashboard Icons collection.`

	return (
		<>
			<JsonLd data={buildCommunityBrowseGraph({ description, totalItems: icons.length })} />
			<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold">Browse community icons & logos</h1>
						<p className="text-muted-foreground mb-1">Search through our collection of {icons.length} community-submitted icons and logos.</p>
					</div>
				</div>
				<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
					<CommunityIconSearch icons={icons as any} />
				</Suspense>
			</div>
		</>
	)
}
