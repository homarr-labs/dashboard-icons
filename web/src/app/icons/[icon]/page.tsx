import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { IconDetails } from "@/components/icon-details"
import { BASE_URL, WEB_URL } from "@/constants"
import { computeRelatedIcons, getAllIcons, getAuthorData } from "@/lib/api"

export const dynamicParams = false
export const revalidate = false
export const dynamic = "force-static"

export async function generateStaticParams() {
	const iconsData = await getAllIcons()
	return Object.keys(iconsData).map((icon) => ({
		icon,
	}))
}

type Props = {
	params: Promise<{ icon: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props, _parent: ResolvingMetadata): Promise<Metadata> {
	const { icon } = await params
	const iconsData = await getAllIcons()
	if (!iconsData[icon]) {
		notFound()
	}
	const author = iconsData[icon].update.author
	const authorData = await getAuthorData(author.id, { name: author.name, login: author.login })
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
		title: `${formattedIconName} Icon & Logo`,
		description: `Download the ${formattedIconName} icon and logo in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
		assets: [`${BASE_URL}/svg/${icon}.svg`, `${BASE_URL}/png/${icon}.png`, `${BASE_URL}/webp/${icon}.webp`],
		keywords: [
			`${formattedIconName} icon`,
			`${formattedIconName} logo`,
			`${formattedIconName} icon download`,
			`${formattedIconName} logo download`,
			`${formattedIconName} icon svg`,
			`${formattedIconName} icon png`,
			`${formattedIconName} icon webp`,
			`${icon} icon`,
			`${icon} logo`,
			"application icon",
			"service logo",
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
		abstract: `Download the ${formattedIconName} icon and logo in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
		openGraph: {
			title: `${formattedIconName} Icon & Logo`,
			description: `Download the ${formattedIconName} icon and logo in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
			type: "website",
			url: pageUrl,
			siteName: "Dashboard Icons",
			locale: "en_US",
			images: [
				{
					url: `${WEB_URL}/og/${icon}`,
					width: 1200,
					height: 630,
					alt: `${formattedIconName} icon & logo for dashboards`,
					type: "image/png",
				},
				{
					url: `${BASE_URL}/png/${icon}.png`,
					width: 512,
					height: 512,
					alt: `${formattedIconName} icon`,
					type: "image/png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${formattedIconName} Icon & Logo`,
			description: `Download the ${formattedIconName} icon and logo in SVG, PNG, and WEBP formats for FREE. Part of a collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`,
			images: [`${WEB_URL}/og/${icon}`],
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

	const author = originalIconData.update.author
	const authorData = await getAuthorData(author.id, { name: author.name, login: author.login })
	const categories = originalIconData.categories || []
	const relatedIcons = computeRelatedIcons(icon, categories, iconsData)

	const formattedName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "ImageObject",
						contentUrl: `${BASE_URL}/png/${icon}.png`,
						license: "https://creativecommons.org/licenses/by/4.0/",
						acquireLicensePage: `${WEB_URL}/license`,
						creditText: `Icon by ${authorData.name || authorData.login}`,
						copyrightNotice: "© Homarr Labs",
						creator: {
							"@type": "Person",
							name: authorData.name || authorData.login,
						},
					}).replace(/</g, "\\u003c"),
				}}
			/>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BreadcrumbList",
						itemListElement: [
							{ "@type": "ListItem", position: 1, name: "Home", item: WEB_URL },
							{ "@type": "ListItem", position: 2, name: "Browse Icons", item: `${WEB_URL}/icons` },
							{ "@type": "ListItem", position: 3, name: `${formattedName} Icon`, item: `${WEB_URL}/icons/${icon}` },
						],
					}).replace(/</g, "\\u003c"),
				}}
			/>
			<IconDetails
				breadcrumbItems={[
					{ label: "Home", href: "/" },
					{ label: "Browse Icons", href: "/icons" },
					{ label: formattedName },
				]}
				icon={icon}
				iconData={originalIconData}
				authorData={authorData}
				relatedIcons={relatedIcons}
				relatedCategories={categories}
			/>
		</>
	)
}
