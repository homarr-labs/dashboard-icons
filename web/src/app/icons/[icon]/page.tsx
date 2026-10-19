import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { IconDetails, type IconDetailsBreadcrumbItem } from "@/components/icon-details"
import { APACHE_LICENSE_URL, BASE_URL, WEB_URL } from "@/constants"
import { computeRelatedIcons, getAllIcons, getAuthorData } from "@/lib/api"
import { getVersionParent } from "@/lib/icon-relations"
import { buildIconAltText, getIconImageVariant, getIconVariantLabel } from "@/lib/icon-variant-text"
import { getNativeIconVariants } from "@/lib/icons/files"
import { buildIconUrl } from "@/lib/icons/urls"
import { formatIconName } from "@/lib/utils"

export const dynamicParams = true
export const dynamic = "force-static"
export const revalidate = 900

export async function generateStaticParams() {
	if (process.env.PRERENDER_ICON_PAGES === "false") return []
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
	const formattedIconName = formatIconName(icon, { capitalize: true, aliases: iconsData[icon].aliases })
	const variants = getNativeIconVariants(icon, iconsData[icon])
	const assets = variants.flatMap((variant) => variant.formats.map((format) => buildIconUrl(variant.stem, format)))
	const formats = [...new Set(variants.flatMap((variant) => variant.formats))]
	const formatNames = formats.map((format) => (format === "webp" ? "WebP" : format.toUpperCase())).join(", ")
	const variantNames = variants
		.flatMap((variant) => variant.keys.filter((key) => key !== "default"))
		.map((key) => getIconVariantLabel({ label: key.replaceAll("-", " ") }))
	const variantSuffix = variantNames.length ? ` (${variantNames.join(", ")})` : ""
	const title = `${formattedIconName} Icon & Logo - ${formatNames}${variantSuffix}`
	let description = `Download the ${formattedIconName} icon and logo in ${formatNames}.`
	if (variantNames.length) description += ` Includes ${variantNames.join(", ")} variants.`
	description += ` Free downloads from a collection of ${totalIcons} curated icons for dashboards and app directories.`
	return {
		title,
		description,
		assets,
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
		abstract: description,
		openGraph: {
			title,
			description,
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
			title,
			description,
			images: [`${WEB_URL}/og/${icon}`],
		},
		alternates: {
			canonical: `${WEB_URL}/icons/${icon}`,
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

	const formattedName = formatIconName(icon, { capitalize: true, aliases: originalIconData.aliases })
	const parent = getVersionParent(icon, iconsData)
	const breadcrumbItems: IconDetailsBreadcrumbItem[] = [
		{ label: "Home", href: "/" },
		{ label: "Browse Icons", href: "/icons" },
	]
	let breadcrumbName = formattedName
	if (parent) {
		breadcrumbName = icon.slice(parent.length + 1).toUpperCase()
		breadcrumbItems.push({
			label: formatIconName(parent, { capitalize: true, aliases: iconsData[parent].aliases }),
			href: `/icons/${parent}`,
		})
	}
	breadcrumbItems.push({ label: breadcrumbName })
	const variants = getNativeIconVariants(icon, originalIconData)
	const pageUrl = `${WEB_URL}/icons/${icon}`
	const encodingFormats = { svg: "image/svg+xml", png: "image/png", webp: "image/webp" }
	const images = variants.flatMap((variant) =>
		variant.formats.map((format) => {
			const url = buildIconUrl(variant.stem, format)
			const name = buildIconAltText(formattedName, getIconImageVariant(variant), format)
			return {
				"@context": "https://schema.org",
				"@type": "ImageObject",
				"@id": url,
				contentUrl: url,
				name,
				caption: `${name}: ${variant.stem}.${format}`,
				encodingFormat: encodingFormats[format],
				representativeOfPage: variant.key === "default",
				license: APACHE_LICENSE_URL,
				acquireLicensePage: `${WEB_URL}/license`,
				creditText: "Dashboard Icons",
				creator: { "@type": "Person", name: authorData.name || authorData.login },
			}
		}),
	)
	const primaryImage = images.find((image) => image.representativeOfPage && image.encodingFormat === "image/png") ?? images[0]

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify([
						{
							"@context": "https://schema.org",
							"@type": "WebPage",
							"@id": pageUrl,
							url: pageUrl,
							name: `${formattedName} Icon & Logo`,
							primaryImageOfPage: primaryImage && { "@id": primaryImage.contentUrl },
							breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
						},
						...images,
					]).replace(/</g, "\\u003c"),
				}}
			/>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BreadcrumbList",
						"@id": `${pageUrl}#breadcrumb`,
						itemListElement: breadcrumbItems.map((item, index) => ({
							"@type": "ListItem",
							position: index + 1,
							name: item.label,
							item: `${WEB_URL}${item.href ?? `/icons/${icon}`}`,
						})),
					}).replace(/</g, "\\u003c"),
				}}
			/>
			<IconDetails
				breadcrumbItems={breadcrumbItems}
				icon={icon}
				iconData={originalIconData}
				authorData={authorData}
				relatedIcons={relatedIcons}
				relatedCategories={categories}
			/>
		</>
	)
}
