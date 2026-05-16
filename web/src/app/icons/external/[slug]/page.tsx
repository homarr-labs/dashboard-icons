import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { IconDetails } from "@/components/icon-details"
import { EXTERNAL_SOURCES, type ExternalSourceId, WEB_URL } from "@/constants"
import { getExternalIconPreviewUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySlug, getExternalIcons } from "@/lib/external-icons"
import type { AuthorData } from "@/types/icons"

export const dynamicParams = false
export const dynamic = "force-static"
export const revalidate = false

export async function generateStaticParams() {
	const icons = await getExternalIcons()
	const seen = new Set<string>()
	return icons
		.filter((icon) => {
			if (seen.has(icon.slug)) return false
			seen.add(icon.slug)
			return true
		})
		.map((icon) => ({ slug: icon.slug }))
}

type Props = {
	params: Promise<{ slug: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props, _parent: ResolvingMetadata): Promise<Metadata> {
	const { slug } = await params
	const icon = await getExternalIconBySlug(slug)

	if (!icon) {
		notFound()
	}

	const sourceConfig = EXTERNAL_SOURCES[icon.external.source as ExternalSourceId]
	if (!sourceConfig) {
		notFound()
	}
	const formattedName = icon.external.name
	const pageUrl = `${WEB_URL}/icons/external/${slug}`
	const previewUrl = getExternalIconPreviewUrl(icon.external)
	const imageType = previewUrl.endsWith(".svg") ? "image/svg+xml" : previewUrl.endsWith(".webp") ? "image/webp" : "image/png"

	return {
		title: `${formattedName} Icon & Logo (${sourceConfig.label})`,
		description: `Download the ${formattedName} icon and logo from ${sourceConfig.label} via Dashboard Icons. Licensed under ${sourceConfig.license}.`,
		assets: icon.external.formats.map((format) => resolveExternalIconUrl(icon.external, format)),
		keywords: [
			`${formattedName} icon`,
			`${formattedName} logo`,
			`${slug} icon`,
			`${slug} logo`,
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
			description: `Download the ${formattedName} icon and logo from ${sourceConfig.label}. Licensed under ${sourceConfig.license}.`,
			type: "website",
			url: pageUrl,
			siteName: "Dashboard Icons",
			locale: "en_US",
			images: [
				{
					url: `${WEB_URL}/og/external/${slug}`,
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
			images: [`${WEB_URL}/og/external/${slug}`],
		},
		alternates: {
			canonical: pageUrl,
		},
	}
}

export default async function ExternalIconPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const icon = await getExternalIconBySlug(slug)

	if (!icon) {
		notFound()
	}

	const sourceConfig = EXTERNAL_SOURCES[icon.external.source as ExternalSourceId]
	if (!sourceConfig) {
		notFound()
	}
	const previewUrl = getExternalIconPreviewUrl(icon.external)

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
						license:
							sourceConfig.license === "MIT" ? "https://opensource.org/licenses/MIT" : "https://creativecommons.org/licenses/by/4.0/",
						acquireLicensePage: `${WEB_URL}/license`,
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
								item: `${WEB_URL}/icons/external/${slug}`,
							},
						],
					}).replace(/</g, "\\u003c"),
				}}
			/>
			<IconDetails
				icon={icon.external.slug}
				iconData={icon.data}
				authorData={authorData}
				externalIcon={icon.external}
				breadcrumbItems={[
					{ label: "Home", href: "/" },
					{ label: "Browse Icons", href: "/icons" },
					{ label: icon.external.name },
				]}
			/>
		</>
	)
}
