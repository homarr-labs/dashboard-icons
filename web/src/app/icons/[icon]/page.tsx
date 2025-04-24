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

	const iconImageUrl = `${BASE_URL}/png/${icon}.png`
	const pageUrl = `${WEB_URL}/icons/${icon}`
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	return {
		title: `${formattedIconName} Icon | Dashboard Icons`,
		description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		assets: [iconImageUrl],
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
			icon: iconImageUrl,
		},
		abstract: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
		openGraph: {
			title: `${formattedIconName} Icon | Dashboard Icons`,
			description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
			type: "article",
			url: pageUrl,
			authors: [authorName],
			publishedTime: updateDate.toISOString(),
			modifiedTime: updateDate.toISOString(),
			section: "Icons",
			tags: [formattedIconName, "dashboard icon", "service icon", "application icon", "tool icon", "web dashboard", "app directory"],
		},
		twitter: {
			card: "summary_large_image",
			title: `${formattedIconName} Icon | Dashboard Icons`,
			description: `Download the ${formattedIconName} icon in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons for services, applications and tools, designed specifically for dashboards and app directories.`,
			images: [iconImageUrl],
		},
		alternates: {
			canonical: pageUrl,
			media: {
				png: iconImageUrl,
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

	return <IconDetails icon={icon} iconData={originalIconData} authorData={authorData} />
}
