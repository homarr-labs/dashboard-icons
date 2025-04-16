import { BASE_URL } from "@/constants"
import { getIconsArray } from "@/lib/api"
import type { Metadata } from "next"
import { IconSearch } from "./components/icon-search"

export const metadata: Metadata = {
	title: "Browse icons | Dashboard Icons",
	description: "Search and browse through our collection of beautiful dashboard icons for your applications",
	keywords: ["dashboard icons", "browse icons", "icon search", "free icons", "open source icons"],
	openGraph: {
		title: "Browse Dashboard Icons Collection",
		description: "Search and browse through our collection of beautiful dashboard icons for your applications",
		type: "website",
		url: `${BASE_URL}/icons`,
		images: [
			{
				url: "/og-image-browse.png",
				width: 1200,
				height: 630,
				alt: "Browse Dashboard Icons",
				type: "image/png",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Browse Dashboard Icons Collection",
		description: "Search and browse through our collection of beautiful dashboard icons for your applications",
		images: ["/og-image-browse.png"],
	},
	alternates: {
		canonical: `${BASE_URL}/icons`,
	},
}

export const dynamic = "force-static"

export default async function IconsPage() {
	const icons = await getIconsArray()
	return (
		<div className="py-8">
			<div className="space-y-4 mb-8 mx-auto max-w-[80vw]">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold">Browse icons</h1>
						<p className="text-muted-foreground">Search through our collection of {icons.length} beautiful icons.</p>
					</div>
				</div>

				<IconSearch icons={icons} />
			</div>
		</div>
	)
}
