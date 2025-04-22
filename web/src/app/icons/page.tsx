import { BASE_URL, BROWSE_KEYWORDS, DEFAULT_OG_IMAGE, GITHUB_URL, ORGANIZATION_NAME, ORGANIZATION_SCHEMA, SITE_NAME, SITE_TAGLINE, TITLE_SEPARATOR, WEB_URL, getBrowseDescription } from "@/constants"
import { getIconsArray } from "@/lib/api"
import type { Metadata } from "next"
import { IconSearch } from "./components/icon-search"
import Script from "next/script"

export async function generateMetadata(): Promise<Metadata> {
	const icons = await getIconsArray()
	const totalIcons = icons.length

	const title = `Browse Icons ${TITLE_SEPARATOR} ${SITE_NAME}`
	const description = getBrowseDescription(totalIcons)

	return {
		title,
		description,
		keywords: BROWSE_KEYWORDS,
		openGraph: {
			title: `Browse Icons ${TITLE_SEPARATOR} ${SITE_NAME} ${TITLE_SEPARATOR} ${SITE_TAGLINE}`,
			description,
			type: "website",
			url: `${WEB_URL}/icons`,
			images: [DEFAULT_OG_IMAGE],
		},
		twitter: {
			card: "summary_large_image",
			title: `Browse Icons ${TITLE_SEPARATOR} ${SITE_NAME} ${TITLE_SEPARATOR} ${SITE_TAGLINE}`,
			description,
			images: [DEFAULT_OG_IMAGE.url],
		},
		alternates: {
			canonical: `${WEB_URL}/icons`,
		},
		other: {
			"revisit-after": "3 days",
		}
	}
}

export const dynamic = "force-static"

export default async function IconsPage() {
	const icons = await getIconsArray()

	const gallerySchema = {
		"@context": "https://schema.org",
		"@type": "ImageGallery",
		"name": `${SITE_NAME} - Browse ${icons.length} Icons - ${SITE_TAGLINE}`,
		"description": getBrowseDescription(icons.length),
		"url": `${WEB_URL}/icons`,
		"numberOfItems": icons.length,
		"creator": {
			"@type": "Organization",
			"name": ORGANIZATION_NAME,
			"url": GITHUB_URL
		}
	}

	return (
		<>
			<Script id="gallery-schema" type="application/ld+json">
				{JSON.stringify(gallerySchema)}
			</Script>
			<Script id="org-schema" type="application/ld+json">
				{JSON.stringify(ORGANIZATION_SCHEMA)}
			</Script>
			<div className="isolate overflow-hidden">
				<div className="py-8">
					<div className="space-y-4 mb-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h1 className="text-3xl font-bold">Icons</h1>
								<p className="text-muted-foreground">Search our collection of {icons.length} icons - {SITE_TAGLINE}.</p>
							</div>
						</div>

						<IconSearch icons={icons} />
					</div>
				</div>
			</div>
		</>
	)
}
