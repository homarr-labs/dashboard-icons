import { IconDetails } from "@/components/icon-details"
import { StructuredData } from "@/components/structured-data"
import {
	BASE_URL,
	GITHUB_URL,
	ICON_DETAIL_KEYWORDS,
	SITE_NAME,
	SITE_TAGLINE,
	TITLE_SEPARATOR,
	WEB_URL,
	getIconDescription,
	getIconSchema,
} from "@/constants"
import { getAllIcons, getAuthorData } from "@/lib/api"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import Script from "next/script"

export const dynamicParams = false

export async function generateStaticParams() {
	const iconsData = await getAllIcons()
	return Object.keys(iconsData).map((icon) => ({
		icon,
	}))
}

export const dynamic = "force-static"

type Props = {
	params: { icon: string }
	searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
	const { icon } = params
	const iconsData = await getAllIcons()
	if (!iconsData[icon]) {
		notFound()
	}
	const authorData = await getAuthorData(iconsData[icon].update.author.id)
	const authorName = authorData.name || authorData.login
	const updateDate = new Date(iconsData[icon].update.timestamp)
	const totalIcons = Object.keys(iconsData).length

	const iconImageUrl = `${BASE_URL}/png/${icon}.png`
	const pageUrl = `${WEB_URL}/icons/${icon}`
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	const title = `${formattedIconName} Icon ${TITLE_SEPARATOR} ${SITE_NAME}`
	const fullTitle = `${formattedIconName} Icon ${TITLE_SEPARATOR} ${SITE_NAME} ${TITLE_SEPARATOR} ${SITE_TAGLINE}`
	const description = getIconDescription(formattedIconName, totalIcons)

	return {
		title,
		description,
		assets: [iconImageUrl],
		category: "Icons",
		keywords: ICON_DETAIL_KEYWORDS(formattedIconName),
		icons: {
			icon: iconImageUrl,
		},
		abstract: description,
		robots: {
			index: true,
			follow: true,
		},
		openGraph: {
			title: title,
			description,
			type: "article",
			url: pageUrl,
			authors: [authorName],
			publishedTime: updateDate.toISOString(),
			modifiedTime: updateDate.toISOString(),
			section: "Icons",
			tags: [formattedIconName, ...ICON_DETAIL_KEYWORDS(formattedIconName)],
		},
		twitter: {
			card: "summary_large_image",
			title: title,
			description,
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

export default async function IconPage({ params }: { params: { icon: string } }) {
	const { icon } = params
	const iconsData = await getAllIcons()
	const originalIconData = iconsData[icon]

	if (!originalIconData) {
		notFound()
	}

	const authorData = await getAuthorData(originalIconData.update.author.id)
	const updateDate = new Date(originalIconData.update.timestamp)
	const authorName = authorData.name || authorData.login
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	const imageSchema = getIconSchema(
		formattedIconName,
		icon,
		authorName,
		authorData.html_url,
		updateDate.toISOString(),
		Object.keys(iconsData).length,
	)

	return (
		<>
			<StructuredData data={imageSchema} id="image-schema" />
			<IconDetails icon={icon} iconData={originalIconData} authorData={authorData} />
		</>
	)
}
