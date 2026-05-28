import type { Metadata } from "next"
import { Suspense } from "react"
import { IconSearch } from "@/components/icon-search"
import { JsonLd } from "@/components/seo/json-ld"
import { EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES, WEB_URL } from "@/constants"
import { getIconsArray } from "@/lib/api"
import { getExternalIcons } from "@/lib/external-icons"
import { buildDefaultOgImages, buildDefaultTwitterImages, getFilteredBrowseMetadata } from "@/lib/seo/metadata"
import { buildIconsBrowseGraph } from "@/lib/seo/schemas"

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
	const [nativeIcons, externalIcons, params] = await Promise.all([getIconsArray(), getExternalIcons(), searchParams])
	const totalIcons = nativeIcons.length + externalIcons.length
	const description = `Search and browse through our collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`

	return {
		title: "Browse Icons & Logos",
		description,
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
			description,
			type: "website",
			url: `${WEB_URL}/icons`,
			images: buildDefaultOgImages("Browse Dashboard Icons & Logos"),
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Icons & Logos",
			description,
			images: buildDefaultTwitterImages(),
		},
		...getFilteredBrowseMetadata(params, "/icons"),
	}
}

export const revalidate = 21600

export default async function IconsPage() {
	const [nativeIcons, externalIcons] = await Promise.all([getIconsArray(), getExternalIcons()])
	const icons = [...nativeIcons, ...externalIcons]
	const description = `Search and browse through our collection of ${icons.length} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`

	return (
		<>
			<JsonLd data={buildIconsBrowseGraph({ description, totalItems: icons.length })} />
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
				<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
					<IconSearch icons={icons} />
				</Suspense>
			</div>
		</>
	)
}
