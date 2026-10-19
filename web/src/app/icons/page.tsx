import type { Metadata } from "next"
import { Suspense } from "react"
import { IconDirectory } from "@/components/icon-directory"
import { IconsBrowser } from "@/components/icons-browser"
import { Button } from "@/components/ui/button"
import { WEB_URL } from "@/constants"
import { getIconDirectoryPage } from "@/lib/icon-directory"

export const metadata: Metadata = {
	title: "Browse Icons & Logos",
	description:
		"Search and browse thousands of curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.",
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
		description: "Search and browse thousands of curated icons and logos for dashboards and app directories.",
		type: "website",
		url: `${WEB_URL}/icons`,
	},
	twitter: {
		card: "summary_large_image",
		title: "Browse Icons & Logos",
		description: "Search and browse thousands of curated icons and logos for dashboards and app directories.",
	},
	alternates: {
		canonical: `${WEB_URL}/icons`,
	},
}

export const revalidate = 900

export default async function IconsPage() {
	const directory = await getIconDirectoryPage(1)

	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Browse icons & logos</h1>
				</div>
				<Button asChild variant="ghost" className="h-11 self-start sm:self-auto">
					<a href="#icon-directory">Browse icon directory</a>
				</Button>
			</div>
			<div className="min-h-screen">
				<Suspense>
					<IconsBrowser />
				</Suspense>
			</div>
			<IconDirectory directory={directory} />
		</div>
	)
}
