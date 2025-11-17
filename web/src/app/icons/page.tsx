import type { Metadata } from "next"
import { IconSearch } from "@/components/icon-search"
import { BASE_URL } from "@/constants"
import { getIconsArray } from "@/lib/api"

export async function generateMetadata(): Promise<Metadata> {
	const icons = await getIconsArray()
	const totalIcons = icons.length

	return {
		title: "Browse Icons | Free Dashboard Icons",
		description: `Search and browse through our collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		keywords: [
			"browse icons",
			"dashboard icons",
			"icon search",
			"service icons",
			"application icons",
			"tool icons",
			"web dashboard",
			"app directory",
		],
		openGraph: {
			title: "Browse Icons | Free Dashboard Icons",
			description: `Search and browse through our collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
			type: "website",
			url: `${BASE_URL}/icons`,
		},
		twitter: {
			card: "summary_large_image",
			title: "Browse Icons | Free Dashboard Icons",
			description: `Search and browse through our collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		},
		alternates: {
			canonical: `${BASE_URL}/icons`,
		},
	}
}

export const dynamic = "force-static"

export default async function IconsPage() {
	const icons = await getIconsArray()
	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Browse icons</h1>
					<p className="text-muted-foreground mb-1">Search through our collection of {icons.length} beautiful icons.</p>
				</div>
			</div>
			<IconSearch icons={icons} />
		</div>
	)
}
