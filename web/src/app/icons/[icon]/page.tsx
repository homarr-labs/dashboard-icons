import { BASE_URL } from "@/constants"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { promises as fs } from "node:fs"
import { IconDetails } from "./icon-details"

export async function generateStaticParams() {
	// https://vercel.com/guides/loading-static-file-nextjs-api-route
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const data = JSON.parse(file)
	console.log(`Found ${Object.keys(data).length} icons`)
	return Object.keys(data).map((icon) => ({
		icon,
	}))
}

type Props = {
	params: Promise<{ icon: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
	// read route params
	const { icon } = await params
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const data = JSON.parse(file) as IconFile

	// optionally access and extend (rather than replace) parent metadata
	const previousImages = (await parent).openGraph?.images || []
	const author = await fetch(`https://api.github.com/user/${data[icon].update.author.id}`, {
		headers: {
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
		},
	})
	const authorData = await author.json()
	console.debug(
		`Generated metadata for ${icon} by ${authorData.name} (${authorData.html_url}) updated at ${new Date(data[icon].update.timestamp).toLocaleString()}`,
	)
	return {
		title: `${icon} icon · DashboardIcons`,
		description: `Download and use the ${icon} icon from DashboardIcons, updated at ${new Date(data[icon].update.timestamp).toLocaleString()} by ${authorData.name}`,
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
			images: [`${BASE_URL}/${data[icon].base}/${icon}.${data[icon].base}`, ...previousImages],
		},
	}
}

export default async function IconPage({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const data = JSON.parse(file) as IconFile
	const iconData = data[icon]
	if (!iconData) {
		notFound()
	}
	// --header "Authorization: Bearer YOUR-TOKEN" \
	console.log(`Found icon ${icon} with author ${iconData.update.author.id}`)
	const author = await fetch(`https://api.github.com/user/${iconData.update.author.id}`, {
		headers: {
			Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
		},
	})

	const authorData = await author.json()
	if (!icon) {
		notFound()
	}
	return <IconDetails icon={icon} iconData={iconData} authorData={authorData} />
}
