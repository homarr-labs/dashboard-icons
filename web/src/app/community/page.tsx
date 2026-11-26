// Read the mounted database at request time, not the empty image-build database.
export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { Suspense } from "react"
import { CommunityIconSearch } from "@/components/community-icon-search"
import { WEB_URL } from "@/constants"
import { getCommunityGallery } from "@/lib/community"

export const revalidate = 900

export async function generateMetadata(): Promise<Metadata> {
	const submissions = await getCommunityGallery()
	const description = `Browse ${submissions.length} community submissions, including new icons and update proposals.`

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
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Community Icons & Logos",
			description,
		},
		alternates: {
			canonical: `${WEB_URL}/community`,
		},
	}
}

export default async function CommunityPage() {
	const submissions = await getCommunityGallery()
	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Browse community icons & logos</h1>
					<p className="text-muted-foreground mb-1">
						Browse {submissions.length} community submissions, including new icons and update proposals.
					</p>
				</div>
			</div>
			<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
				<CommunityIconSearch submissions={submissions} />
			</Suspense>
		</div>
	)
}
