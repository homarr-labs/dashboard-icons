import { IconDetails } from "@/components/icon-details"
import { BASE_URL } from "@/constants"
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
	const previousImages = (await parent).openGraph?.images || []
	const authorData = await getAuthorData(iconsData[icon].update.author.id)
	const authorName = authorData.name || authorData.login
	const updateDate = new Date(iconsData[icon].update.timestamp)

	console.debug(`Generated metadata for ${icon} by ${authorName} (${authorData.html_url}) updated at ${updateDate.toLocaleString()}`)

	const iconImageUrl = `${BASE_URL}/png/${icon}.png`
	const pageUrl = `${BASE_URL}/icons/${icon}`

	return {
		title: `${icon} icon · Dashboard Icons`,
		description: `Download and use the ${icon} icon from Dashboard Icons for your applications`,
		keywords: [`${icon} icon`, "dashboard icon", "free icon", "open source icon", "application icon"],
		authors: [
			{
				name: "homarr",
				url: "https://homarr.dev",
			},
			{
				name: authorName,
				url: authorData.html_url,
			},
		],
		openGraph: {
			title: `${icon} icon · Dashboard Icons`,
			description: `Download and use the ${icon} icon from Dashboard Icons for your applications`,
			type: "article",
			url: pageUrl,
			images: [
				{
					url: iconImageUrl,
					width: 512,
					height: 512,
					alt: `${icon} icon`,
					type: "image/png",
				},
				...previousImages,
			],
			authors: [authorName, "homarr"],
			publishedTime: updateDate.toISOString(),
			modifiedTime: updateDate.toISOString(),
		},
		twitter: {
			card: "summary_large_image",
			title: `${icon} icon · Dashboard Icons`,
			description: `Download and use the ${icon} icon from Dashboard Icons for your applications`,
			images: [iconImageUrl],
			creator: "@ajnavocado",
		},
		alternates: {
			canonical: pageUrl,
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

	// Pass originalIconData directly, assuming IconDetails can handle it
	const iconData = originalIconData

	const authorData = await getAuthorData(originalIconData.update.author.id)
	return <IconDetails icon={icon} iconData={originalIconData} authorData={authorData} />
}
