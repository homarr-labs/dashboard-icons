import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { IconDetails } from "@/components/icon-details"
import { IconNameRelatedLinks, IconRelatedLinks } from "@/components/icon-related-links"
import { EXTERNAL_SOURCES, isExternalSourceId, SIMPLE_ICONS_DISCLAIMER_URL, WEB_URL } from "@/constants"
import { getExternalIconOgPath, getExternalIconPagePath, getExternalIconPreviewUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySourceAndSlug, getExternalIcons } from "@/lib/external-icons"
import { getIconRelations } from "@/lib/icon-relations"
import { getLobehubBaseSlug, isLobehubVariantAlias } from "@/lib/lobehub-variants"
import type { AuthorData, ExternalIconRecord } from "@/types/icons"

export const dynamicParams = true
export const dynamic = "force-static"
export const revalidate = 900

export async function generateStaticParams() {
	if (process.env.PRERENDER_ICON_PAGES === "false") return []
	const icons = await getExternalIcons()
	return icons.map((icon) => ({ source: icon.source, slug: icon.slug }))
}

type Params = Promise<{ source: string; slug: string }>

type Props = {
	params: Params
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getIcon(params: Params): Promise<ExternalIconRecord> {
	const { source, slug } = await params
	if (!isExternalSourceId(source)) {
		notFound()
	}
	let canonicalSlug = slug
	if (source === "lobehub") canonicalSlug = getLobehubBaseSlug(slug)
	const icon = await getExternalIconBySourceAndSlug(source, canonicalSlug)
	if (!icon) {
		notFound()
	}
	if (canonicalSlug !== slug) {
		if (!isLobehubVariantAlias(icon.external, slug)) notFound()
		permanentRedirect(getExternalIconPagePath(icon))
	}
	return icon
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const icon = await getIcon(params)
	const sourceConfig = EXTERNAL_SOURCES[icon.source]
	const formattedName = icon.external.name
	const license = icon.external.license
	const licenseDescription = license ? ` Licensed under ${license}.` : ""
	const pageUrl = `${WEB_URL}${getExternalIconPagePath(icon)}`
	const ogImageUrl = `${WEB_URL}${getExternalIconOgPath(icon)}`
	const previewUrl = getExternalIconPreviewUrl(icon.external)
	const previewFormat = icon.external.formats.includes("svg")
		? "svg"
		: icon.external.formats.includes("png")
			? "png"
			: icon.external.formats[0]
	const imageType = previewFormat === "svg" ? "image/svg+xml" : previewFormat === "webp" ? "image/webp" : "image/png"

	return {
		title: `${formattedName} Icon & Logo (${sourceConfig.label})`,
		description: `Download the ${formattedName} icon and logo from ${sourceConfig.label} via Dashboard Icons.${licenseDescription}`,
		assets: icon.external.formats.map((format) => resolveExternalIconUrl(icon.external, format)),
		keywords: [
			`${formattedName} icon`,
			`${formattedName} logo`,
			`${icon.slug} icon`,
			`${icon.slug} logo`,
			`${sourceConfig.label} icons`,
			"dashboard icon",
			"logo download",
			"icon download",
		],
		icons: {
			icon: previewUrl,
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
		openGraph: {
			title: `${formattedName} Icon & Logo (${sourceConfig.label})`,
			description: `Download the ${formattedName} icon and logo from ${sourceConfig.label}.${licenseDescription}`,
			type: "website",
			url: pageUrl,
			siteName: "Dashboard Icons",
			locale: "en_US",
			images: [
				{
					url: ogImageUrl,
					width: 1200,
					height: 630,
					alt: `${formattedName} icon & logo from ${sourceConfig.label}`,
					type: "image/png",
				},
				{
					url: previewUrl,
					width: 512,
					height: 512,
					alt: `${formattedName} icon`,
					type: imageType,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${formattedName} Icon & Logo (${sourceConfig.label})`,
			description: `Download the ${formattedName} icon and logo from ${sourceConfig.label} via Dashboard Icons.`,
			images: [ogImageUrl],
		},
		alternates: {
			canonical: pageUrl,
		},
	}
}

export default async function ExternalIconPage({ params }: { params: Params }) {
	const icon = await getIcon(params)
	const relations = await getIconRelations(icon)
	const sourceConfig = EXTERNAL_SOURCES[icon.source]
	const previewUrl = getExternalIconPreviewUrl(icon.external)
	const licenseFallbackUrl =
		icon.source === "simpleicons" ? SIMPLE_ICONS_DISCLAIMER_URL : icon.external.source_url || sourceConfig.authorUrl

	const authorData: AuthorData = {
		id: sourceConfig.id,
		name: sourceConfig.authorName,
		login: sourceConfig.authorLogin,
		avatar_url: "",
		html_url: sourceConfig.authorUrl,
	}

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "ImageObject",
						contentUrl: previewUrl,
						license: icon.external.license ? icon.external.license_url : undefined,
						acquireLicensePage: icon.external.license_url || licenseFallbackUrl,
						creditText: icon.external.attribution,
						copyrightNotice: icon.source === "selfhst" ? "Icons by selfh.st" : undefined,
						creator: {
							"@type": "Organization",
							name: sourceConfig.authorName,
							url: sourceConfig.authorUrl,
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
							{
								"@type": "ListItem",
								position: 3,
								name: `${icon.external.name} Icon`,
								item: `${WEB_URL}${getExternalIconPagePath(icon)}`,
							},
						],
					}).replace(/</g, "\\u003c"),
				}}
			/>
			<IconDetails
				relatedLinks={<IconRelatedLinks relations={relations} />}
				nameRelatedLinks={<IconNameRelatedLinks icons={relations.relatedByName} />}
				icon={icon.external.slug}
				iconData={icon.data}
				authorData={authorData}
				externalIcon={icon.external}
				breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Browse Icons", href: "/icons" }, { label: icon.external.name }]}
			/>
		</>
	)
}
