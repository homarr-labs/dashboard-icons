import type { Metadata } from "next"
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
			<IconSearch icons={icons} />
		</div>
	)
}
