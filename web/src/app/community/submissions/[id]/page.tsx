import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { IconUpdateDiff } from "@/components/dashboard/icon-update-diff"
import { IconDetails } from "@/components/icon-details"
import { StatusBadge } from "@/components/status-badge"
import { RejectionNotice } from "@/components/submission/rejection-notice"
import { APACHE_LICENSE_URL, BASE_URL, WEB_URL } from "@/constants"
import { computeRelatedIcons, getAllIcons } from "@/lib/api"
import {
	getCommunityGallery,
	getCommunityGalleryRecord,
	getCommunitySubmissions,
	getCommunityUpdateDetails,
	transformGalleryToIcon,
} from "@/lib/community"
import { iconUpdatePreviews } from "@/lib/icon-update-previews"
import type { AuthorData } from "@/types/icons"

export const dynamicParams = true
export const revalidate = 900
export const dynamic = "force-static"

export async function generateStaticParams() {
	if (process.env.PRERENDER_ICON_PAGES === "false") return []
	const submissions = await getCommunitySubmissions()
	return submissions.map(({ submissionId }) => ({
		id: submissionId,
	}))
}

const robots: Metadata["robots"] = {
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
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params
	const record = await getCommunityGalleryRecord(id)
	if (!record) notFound()

	const pageUrl = `${WEB_URL}/community/submissions/${id}`
	const proposal = getCommunityUpdateDetails(record)
	if (proposal) {
		const title = `${proposal.iconSlug} Update Proposal`
		const description = proposal.summary
		return {
			title,
			description,
			robots,
			openGraph: { title, description, type: "website", url: pageUrl },
			twitter: { card: "summary", title, description },
			alternates: { canonical: pageUrl },
		}
	}

	const iconData = transformGalleryToIcon(record)
	const icon = iconData.iconSlug
	const allIcons = await getCommunityGallery()
	const totalIcons = allIcons.filter((entry) => entry.kind === "icon").length

	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	const mainIconUrl = iconData.data.mainIconUrl || `${BASE_URL}/svg/${icon}.svg`
	return {
		title: `${formattedIconName} Icon & Logo (Community)`,
		description: `Download the ${formattedIconName} community-submitted icon and logo. Part of a collection of ${totalIcons} community icons and logos awaiting review and addition to the Dashboard Icons collection.`,
		assets: [mainIconUrl],
		keywords: [
			`${formattedIconName} icon`,
			`${formattedIconName} logo`,
			`${formattedIconName} icon download`,
			`${formattedIconName} logo download`,
			`${formattedIconName} icon community`,
			`${icon} icon`,
			`${icon} logo`,
			"community icon",
			"user submitted icon",
			"dashboard icon",
		],
		icons: {
			icon: mainIconUrl,
		},
		robots,
		abstract: `Download the ${formattedIconName} community-submitted icon and logo. Part of a collection of ${totalIcons} community icons and logos awaiting review and addition to the Dashboard Icons collection.`,
		openGraph: {
			title: `${formattedIconName} Icon & Logo (Community)`,
			description: `Download the ${formattedIconName} community-submitted icon and logo. Part of a collection of ${totalIcons} community icons and logos awaiting review and addition to the Dashboard Icons collection.`,
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
			title: `${formattedIconName} Icon & Logo (Community)`,
			description: `Download the ${formattedIconName} community-submitted icon and logo. Part of a collection of ${totalIcons} community icons and logos awaiting review and addition to the Dashboard Icons collection.`,
			images: [mainIconUrl],
		},
		alternates: {
			canonical: pageUrl,
		},
	}
}

export default async function CommunityIconPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const record = await getCommunityGalleryRecord(id)
	if (!record) notFound()

	const proposal = getCommunityUpdateDetails(record)
	if (proposal)
		return (
			<section className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
				<header className="space-y-2">
					<h1 className="break-words text-2xl font-semibold">Update proposal for {proposal.iconSlug}</h1>
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge status={record.status} showCollectionStatus />
						<p className="text-sm text-muted-foreground">Submitted by {record.created_by || "Community"}</p>
					</div>
				</header>
				{record.status === "rejected" && <RejectionNotice id={id} feedback={record.admin_comment} />}
				{record.status !== "rejected" && record.admin_comment && (
					<p className="whitespace-pre-wrap break-words text-sm">
						<strong>Reviewer feedback:</strong> {record.admin_comment}
					</p>
				)}
				{proposal.update && (
					<>
						<h2 className="sr-only">Proposal comparison</h2>
						<IconUpdateDiff record={record} update={proposal.update} snapshot={iconUpdatePreviews(proposal.update.target)} />
					</>
				)}
				{!proposal.update && <p className="text-sm text-muted-foreground">{proposal.summary}</p>}
				{record.description && <p className="whitespace-pre-wrap break-words text-sm">{record.description}</p>}
			</section>
		)
	const iconData = transformGalleryToIcon(record)
	const icon = iconData.iconSlug
	const allIconsData = await getAllIcons()
	const categories = iconData.data.categories || []
	const relatedIcons = computeRelatedIcons(icon, categories, allIconsData)

	const author = iconData.data.update.author
	const authorLogin: string = author?.login || author?.name || ""
	const githubId = String(author?.github_id ?? "")

	const authorData: AuthorData = {
		id: 0,
		name: author?.name || "Community",
		login: authorLogin || "community",
		avatar_url: "",
		html_url: "",
	}
	if (authorLogin && authorLogin.toLowerCase() !== "community") {
		authorData.html_url = `https://github.com/${encodeURIComponent(authorLogin)}`
		authorData.avatar_url = `https://github.com/${encodeURIComponent(authorLogin)}.png`
	}
	if (/^\d+$/.test(githubId)) {
		authorData.id = Number(githubId)
		authorData.avatar_url = `https://avatars.githubusercontent.com/u/${githubId}?v=4`
	}

	const mainIconUrl = iconData.data.mainIconUrl || `${BASE_URL}/svg/${icon}.svg`

	const iconDataForDisplay = {
		...iconData.data,
		base: iconData.data.baseFormat,
		mainIconUrl,
	}

	const status = record.status || "pending"

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

	const statusDisplayName = `${getStatusDisplayName(status)} · Round ${record.round || 1}`
	const statusColor = getStatusColor(status)

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
						contentUrl: mainIconUrl,
						...(status === "added_to_collection" && {
							license: APACHE_LICENSE_URL,
							acquireLicensePage: `${WEB_URL}/license`,
							creditText: "Dashboard Icons",
						}),
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
							{ "@type": "ListItem", position: 2, name: "Community Icons", item: `${WEB_URL}/community` },
							{ "@type": "ListItem", position: 3, name: `${formattedName} Icon`, item: `${WEB_URL}/community/submissions/${id}` },
						],
					}).replace(/</g, "\\u003c"),
				}}
			/>
			{status === "rejected" && (
				<div className="container mx-auto px-4 pt-6">
					<RejectionNotice id={id} feedback={record.admin_comment} />
				</div>
			)}
			<IconDetails
				breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Community Icons", href: "/community" }, { label: formattedName }]}
				icon={icon}
				iconData={iconDataForDisplay}
				authorData={authorData}
				relatedIcons={relatedIcons}
				relatedCategories={categories}
				status={status}
				statusDisplayName={statusDisplayName}
				statusColor={statusColor}
			/>
		</>
	)
}
