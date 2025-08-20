import { IconDetails } from "@/components/icon-details"
import { BASE_URL, WEB_URL } from "@/constants"
import { getAllIcons, getAuthorData } from "@/lib/api"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
export const dynamicParams = false

export async function generateStaticParams() {
	const iconsData = await getAllIcons()
	return Object.keys(iconsData).map((icon) => ({
		icon,
	}))
}

export const dynamic = "force-static"

type Props = {
	params: Promise<{ icon: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
	const { icon } = await params
	const iconsData = await getAllIcons()
	if (!iconsData[icon]) {
		notFound()
	}
	const authorData = await getAuthorData(iconsData[icon].update.author.id)
	const authorName = authorData.name || authorData.login
	const updateDate = new Date(iconsData[icon].update.timestamp)
	const totalIcons = Object.keys(iconsData).length

	console.debug(`Generated metadata for ${icon} by ${authorName} (${authorData.html_url}) updated at ${updateDate.toLocaleString()}`)

	const pageUrl = `${WEB_URL}/icons/${icon}`
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	return {
		title: `${formattedIconName} Icon | Dashboard Icons`,
		description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		assets: [`${BASE_URL}/svg/${icon}.svg`, `${BASE_URL}/png/${icon}.png`, `${BASE_URL}/webp/${icon}.webp`],
		keywords: [
			`${formattedIconName} icon`,
			`${formattedIconName} icon download`,
			`${formattedIconName} icon svg`,
			`${formattedIconName} icon png`,
			`${formattedIconName} icon webp`,
			`${icon} icon`,
			"application icon",
			"tool icon",
			"web dashboard",
			"app directory",
		],
		icons: {
			icon: `${BASE_URL}/webp/${icon}.webp`,
		},
		robots: {
			index: true,
			follow: true,
			nocache: false,
			googleBot: {
				index: true,
				follow: true,
				noimageindex: false,
				"max-video-preview": -1,
				"max-image-preview": "large",
			},
		},
		abstract: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		openGraph: {
			title: `${formattedIconName} Icon | Dashboard Icons`,
			description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
			type: "website",
			url: pageUrl,
			siteName: "Dashboard Icons",
			  images: [{
    url: `${BASE_URL}/webp/${icon}.webp`,
    width: 512,
    height: 512,
    alt: `${formattedIconName} icon`,
  }]

		},
		twitter: {
			card: "summary_large_image",
			title: `${formattedIconName} Icon | Dashboard Icons`,
			description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		},
		alternates: {
			canonical: `${WEB_URL}/icons/${icon}`,
			media: {
				png: `${BASE_URL}/png/${icon}.png`,
				svg: `${BASE_URL}/svg/${icon}.svg`,
				webp: `${BASE_URL}/webp/${icon}.webp`,
			},
		},
	}
}

export default async function IconPage({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const iconsData = await getAllIcons()
	const originalIconData = iconsData[icon]

	if (!originalIconData) {
		notFound()
	}

	const authorData = await getAuthorData(originalIconData.update.author.id)

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Needs to be done
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "ImageObject",
						contentUrl: `${BASE_URL}/png/${icon}.png`,
						license: "https://creativecommons.org/licenses/by/4.0/",
						acquireLicensePage: `${WEB_URL}/license`,
						creator: {
							"@type": "Person",
							name: authorData.name || authorData.login,
						},
					}),
				}}
			/>
			<IconDetails icon={icon} iconData={originalIconData} authorData={authorData} allIcons={iconsData} />
		</>
	)
}
