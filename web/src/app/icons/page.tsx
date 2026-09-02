import type { Metadata } from "next"
import { Suspense } from "react"
import { IconSearch } from "@/components/icon-search"
import { EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES, WEB_URL } from "@/constants"
import { getIconsArray } from "@/lib/api"
import { getExternalIcons } from "@/lib/external-icons"

export async function generateMetadata(): Promise<Metadata> {
	const [nativeIcons, externalIcons] = await Promise.all([getIconsArray(), getExternalIcons()])
	const totalIcons = nativeIcons.length + externalIcons.length

	return {
		title: "Browse Icons & Logos",
		description: `Search and browse through our collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
		keywords: [
			"browse icons",
			"browse logos",
			"dashboard icons",
			"dashboard logos",
			"icon search",
			"logo search",
			"service icons",
			"service logos",
			"application icons",
			"tool icons",
			"web dashboard",
			"app directory",
		],
		openGraph: {
			title: "Browse Icons & Logos",
			description: `Search and browse through our collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
			type: "website",
			url: `${WEB_URL}/icons`,
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Icons & Logos",
			description: `Search and browse through our collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
		},
		alternates: {
			canonical: `${WEB_URL}/icons`,
		},
	}
}

export const dynamic = "force-static"
export const revalidate = 900

export default async function IconsPage() {
	const [nativeIcons, externalIcons] = await Promise.all([getIconsArray(), getExternalIcons()])
	const icons = [...nativeIcons, ...externalIcons]
	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Browse icons & logos</h1>
					<p className="text-muted-foreground mb-1">
						Search through {icons.length} icons and logos from Dashboard Icons
						{EXTERNAL_SOURCE_IDS.length > 0 && ` and ${EXTERNAL_SOURCE_IDS.map((id) => EXTERNAL_SOURCES[id].label).join(", ")}`}.{" "}
						{nativeIcons.length} are native Dashboard Icons.
					</p>
				</div>
			</div>
			<Suspense fallback={<IconsSearchSkeleton />}>
				<IconSearch icons={icons} />
			</Suspense>
		</div>
	)
}

function IconsSearchSkeleton() {
	return (
		<div aria-busy="true" className="space-y-4 w-full animate-pulse motion-reduce:animate-none">
			<output className="sr-only">Loading icons...</output>
			<div className="h-10 bg-muted rounded-lg w-full" />
			<div className="flex gap-2">
				<div className="h-8 bg-muted rounded w-28" />
				<div className="h-8 bg-muted rounded w-28" />
			</div>
			<div className="h-px bg-border" />
			<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
				{Array.from({ length: 24 }).map((_, i) => (
					<div key={i} className="flex flex-col items-center p-3 gap-2">
						<div className="h-16 w-16 bg-muted rounded-lg" />
						<div className="h-3 bg-muted rounded w-16" />
					</div>
				))}
			</div>
		</div>
	)
}
