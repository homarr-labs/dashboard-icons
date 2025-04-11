import { IconDetails } from "@/components/icon-details"
import { BASE_URL } from "@/constants"
import { getAllIcons, getAuthorData } from "@/lib/api"
import type { Metadata, ResolvingMetadata } from "next"
type Icon = {
	base: string
	categories: string[]
	aliases: string[]
	update: {
		timestamp: string
		author: {
			id: string
		}
	}
	colors?: {
		light?: string
		dark?: string
	}
}

export async function generateStaticParams() {
	const iconsData = await getAllIcons()
	console.log(`Found ${Object.keys(iconsData).length} icons`)
	return Object.keys(iconsData).map((icon) => ({
		icon,
	}))
}

type Props = {
	params: Promise<{ icon: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
	const { icon } = await params
	const iconsData = await getAllIcons()
	if (!iconsData[icon]) {
		return {
			title: "Icon Not Found",
		}
	}
	const previousImages = (await parent).openGraph?.images || []
	const authorData = await getAuthorData(iconsData[icon].update.author.id)

	console.debug(
		`Generated metadata for ${icon} by ${authorData.name} (${authorData.html_url}) updated at ${new Date(iconsData[icon].update.timestamp).toLocaleString()}`,
	)

	return {
		title: `${icon} icon · DashboardIcons`,
		description: `Download and use the ${icon} icon from DashboardIcons, updated at ${new Date(iconsData[icon].update.timestamp).toLocaleString()} by ${authorData.name}`,
		authors: [
			{
				name: "homarr",
				url: "https://homarr.dev",
			},
			{
				name: authorData.name,
				url: authorData.html_url,
			},
		],
		openGraph: {
			images: [`${BASE_URL}/${iconsData[icon].base}/${icon}.${iconsData[icon].base}`, ...previousImages],
		},
	}
}

export default async function IconPage({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const iconsData = await getAllIcons()
	const originalIconData = iconsData[icon]
	const iconData: Icon = {
		...originalIconData,
		update: {
			...originalIconData.update,
			author: {
				id: String(originalIconData.update.author.id),
			},
		},
	}

	const authorData = await getAuthorData(originalIconData.update.author.id)
	return <IconDetails icon={icon} iconData={iconData} authorData={authorData} />
}
