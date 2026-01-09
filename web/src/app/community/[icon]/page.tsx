import type { Metadata, ResolvingMetadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { IconDetails } from "@/components/icon-details"
import { BASE_URL, WEB_URL } from "@/constants"
import { getAllIcons, getAuthorData } from "@/lib/api"
import { getCommunityGalleryRecord, getCommunitySubmissionByName, getCommunitySubmissions } from "@/lib/community"

function isIconAddedToCollection(
	record: Awaited<ReturnType<typeof getCommunityGalleryRecord>>,
	collectionIcons: Record<string, unknown>,
	icon: string,
) {
	return record?.status === "added_to_collection" && Object.hasOwn(collectionIcons, icon)
}

export const dynamicParams = true
export const revalidate = 21600 // 6 hours
export const dynamic = "force-static"

export async function generateStaticParams() {
	const icons = await getCommunitySubmissions()
	return icons.map((icon) => ({
		icon: icon.name,
	}))
}

type Props = {
	params: Promise<{ icon: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props, _parent: ResolvingMetadata): Promise<Metadata> {
	const { icon } = await params
	const iconData = await getCommunitySubmissionByName(icon)

	if (!iconData) {
		notFound()
	}

	const record = await getCommunityGalleryRecord(icon)
	const collectionIcons = await getAllIcons()
	const isInCollection = isIconAddedToCollection(record, collectionIcons, icon)

	if (isInCollection) {
		permanentRedirect(`/icons/${icon}`)
	}

	const allIcons = await getCommunitySubmissions()
	const totalIcons = allIcons.length
	const updateDate = new Date(iconData.data.update.timestamp)
	const authorName = iconData.data.update.author.name || "Community"

	console.debug(`Generated metadata for community icon ${icon} by ${authorName} updated at ${updateDate.toLocaleString()}`)

	const pageUrl = `${WEB_URL}/community/${icon}`
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	const mainIconUrl =
		typeof iconData.data.base === "string" && iconData.data.base.startsWith("http")
			? iconData.data.base
			: (iconData.data as any).mainIconUrl || `${BASE_URL}/svg/${icon}.svg`
	return {
		title: `${formattedIconName} Icon (Community) | Dashboard Icons`,
		description: `Download the ${formattedIconName} community-submitted icon. Part of a collection of ${totalIcons} community icons awaiting review and addition to the Dashboard Icons collection.`,
		assets: [mainIconUrl],
		keywords: [
			`${formattedIconName} icon`,
			`${formattedIconName} icon download`,
			`${formattedIconName} icon community`,
			`${icon} icon`,
			"community icon",
			"user submitted icon",
			"dashboard icon",
		],
		icons: {
			icon: mainIconUrl,
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
		abstract: `Download the ${formattedIconName} community-submitted icon. Part of a collection of ${totalIcons} community icons awaiting review and addition to the Dashboard Icons collection.`,
		openGraph: {
			title: `${formattedIconName} Icon (Community) | Dashboard Icons`,
			description: `Download the ${formattedIconName} community-submitted icon. Part of a collection of ${totalIcons} community icons awaiting review and addition to the Dashboard Icons collection.`,
			type: "website",
			url: pageUrl,
			siteName: "Dashboard Icons",
			locale: "en_US",
			images: [
				{
					url: mainIconUrl,
					width: 512,
					height: 512,
					alt: `${formattedIconName} icon`,
					type: mainIconUrl.endsWith(".svg") ? "image/svg+xml" : mainIconUrl.endsWith(".webp") ? "image/webp" : "image/png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${formattedIconName} Icon (Community) | Dashboard Icons`,
			description: `Download the ${formattedIconName} community-submitted icon. Part of a collection of ${totalIcons} community icons awaiting review and addition to the Dashboard Icons collection.`,
			images: [mainIconUrl],
		},
		alternates: {
			canonical: `${WEB_URL}/community/${icon}`,
		},
	}
}

export default async function CommunityIconPage({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const iconData = await getCommunitySubmissionByName(icon)

	if (!iconData) {
		notFound()
	}

	const record = await getCommunityGalleryRecord(icon)
	const allIcons = await getAllIcons()
	const isInCollection = isIconAddedToCollection(record, allIcons, icon)
	if (isInCollection) {
		permanentRedirect(`/icons/${icon}`)
	}

	const author = iconData.data.update.author as any
	const githubId = author?.github_id
	const authorMetaLogin = author?.login || author?.name

	let authorData:
		| {
				id: number | string
				name?: string
				login: string
				avatar_url: string
				html_url: string
		  }
		| undefined

	if (githubId && /^\d+$/.test(String(githubId))) {
		authorData = await getAuthorData(String(githubId), { login: authorMetaLogin, name: author?.name })
	} else if (authorMetaLogin && authorMetaLogin !== "community" && authorMetaLogin !== "Community") {
		// Fallback: resolve by GitHub username if we don't have github_id in the community_gallery view.
		// This avoids losing the GitHub link when PB doesn't expose github_id in the view.
		try {
			const headers: Record<string, string> = {}
			if (process.env.GITHUB_TOKEN) {
				headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
			}
			const res = await fetch(`https://api.github.com/users/${encodeURIComponent(authorMetaLogin)}`, { headers })
			if (res.ok) {
				const gh = await res.json()
				authorData = {
					id: gh?.id ?? 0,
					name: gh?.name ?? authorMetaLogin,
					login: gh?.login ?? authorMetaLogin,
					avatar_url: gh?.avatar_url ?? "",
					html_url: gh?.html_url ?? "",
				}
			}
		} catch (err) {
			console.log("[CommunityPage] GitHub username fallback failed:", { icon, login: authorMetaLogin, err })
		}
	}

	if (!authorData) {
		authorData = {
			id: 0,
			name: author?.name || "Community",
			login: authorMetaLogin || "community",
			avatar_url: "",
			html_url: "",
		}
	}
	console.log("[CommunityPage] resolved authorData:", {
		icon,
		id: authorData.id,
		login: authorData.login,
		html_url: authorData.html_url,
		avatar_url: authorData.avatar_url,
	})
	console.log(iconData.data)

	const mainIconUrl =
		typeof iconData.data.base === "string" && iconData.data.base.startsWith("http")
			? iconData.data.base
			: (iconData.data as any).mainIconUrl || `${BASE_URL}/svg/${icon}.svg`

	const iconDataForDisplay = {
		...iconData.data,
		base: (iconData.data as any).baseFormat || "svg",
		mainIconUrl: mainIconUrl,
		assetUrls: (iconData.data as any).assetUrls || [mainIconUrl],
	}

	const status = record?.status || "pending"
	const rejectionReason = status === "rejected" ? record?.admin_comment : null

	const getStatusDisplayName = (status: string) => {
		switch (status) {
			case "pending":
				return "Awaiting Review"
			case "approved":
				return "Approved"
			case "rejected":
				return "Rejected"
			case "added_to_collection":
				return "Added to Collection"
			default:
				return "Awaiting Review"
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "approved":
				return "bg-blue-500/10 text-blue-400 font-bold border-blue-500/20"
			case "rejected":
				return "bg-red-500/10 text-red-500 border-red-500/20"
			case "pending":
				return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
			case "added_to_collection":
				return "bg-green-500/10 text-green-500 border-green-500/20"
			default:
				return "bg-gray-500/10 text-gray-500 border-gray-500/20"
		}
	}

	const statusDisplayName = getStatusDisplayName(status)
	const statusColor = getStatusColor(status)

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Needs to be done
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "ImageObject",
						contentUrl: mainIconUrl,
						license: "https://creativecommons.org/licenses/by/4.0/",
						acquireLicensePage: `${WEB_URL}/license`,
						creator: {
							"@type": "Person",
							name: authorData.name || authorData.login,
						},
					}),
				}}
			/>
			<IconDetails
				icon={icon}
				iconData={iconDataForDisplay as any}
				authorData={authorData}
				allIcons={allIcons}
				status={status}
				rejectionReason={rejectionReason ?? undefined}
				statusDisplayName={statusDisplayName}
				statusColor={statusColor}
			/>
		</>
	)
}
