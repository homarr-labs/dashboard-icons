import { unstable_cache } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { ClientResponseError } from "pocketbase"
import type { IconUpdate, ListDelta } from "@/lib/icon-update"
import { type CommunityGallery, createServerPB, getPocketBaseUrl } from "@/lib/pb"
import { resolveSubmissionAssets, variantExtras, variantKind } from "@/lib/submission-variants"
import type { Icon } from "@/types/icons"

type CommunitySubmission = {
	name: string
	slug: string
	status: CommunityGallery["status"]
}

export type CommunityIcon = CommunitySubmission & {
	kind: "icon"
	data: Icon & {
		baseFormat: "svg" | "png" | "webp"
		mainIconUrl: string
		assetUrls: string[]
	}
}

export type CommunityUpdate = CommunitySubmission & {
	kind: "update"
	targetId: string
	hasAssets: boolean
	summary: string
	data: Pick<Icon, "aliases" | "categories" | "update">
}

export type CommunityGalleryEntry = CommunityIcon | CommunityUpdate

function submissionActivity(item: CommunityGallery): Icon["update"] {
	return {
		timestamp: item.updated,
		author: {
			id: 0,
			name: item.created_by || "Community",
			login: item.created_by || undefined,
			github_id: item.created_by_github_id,
		},
	}
}

export function transformGalleryToIcon(item: CommunityGallery): CommunityIcon {
	const fileRoot = `${getPocketBaseUrl()}/api/files/community_gallery/${item.id}`
	const assetUrls = item.assets?.map((asset) => `${fileRoot}/${asset}`) || []
	const mainIconUrl = assetUrls[0] || ""
	const extension = item.assets?.[0]?.split(".").pop()?.toLowerCase() || "svg"
	let baseFormat: CommunityIcon["data"]["baseFormat"] = "webp"
	if (extension === "svg" || extension === "png") baseFormat = extension

	const resolved = resolveSubmissionAssets(item.extras, item.assets, item.name)
	const { colors, wordmark, variants } = variantExtras(
		Object.fromEntries(resolved.assets.flatMap(({ file, variant }) => (variant ? [[variant, file]] : []))),
	)

	return {
		kind: "icon",
		name: item.name,
		slug: item.id,
		status: item.status,
		data: {
			base: mainIconUrl || "svg",
			baseFormat,
			mainIconUrl,
			assetUrls,
			aliases: item.extras?.aliases || [],
			categories: item.extras?.categories || [],
			update: submissionActivity(item),
			colors,
			wordmark,
			variants,
		},
	}
}

function listChangeSummary(delta: ListDelta, singular: string, plural: string): string[] {
	const changes: string[] = []
	for (const [verb, values] of [
		["Add", delta.add],
		["Remove", delta.remove],
	] as const) {
		if (values.length === 1) changes.push(`${verb} ${singular} “${values[0]}”`)
		if (values.length > 1) changes.push(`${verb} ${values.length} ${plural}`)
	}
	return changes
}

export function summarizeCommunityUpdate(update: IconUpdate): string {
	const changes: string[] = []
	for (const [action, verb] of [
		["add", "Add"],
		["replace", "Replace"],
		["remove", "Remove"],
	] as const) {
		const variants = update.variants.filter((change) => change.action === action)
		if (variants.length > 1) changes.push(`${verb} ${variants.length} variants`)
		if (variants.length === 1) {
			const { key } = variants[0]
			if (key === "base") changes.push(`${verb} Base artwork`)
			else changes.push(`${verb} ${variantKind(key).label} variant`)
		}
	}
	changes.push(...listChangeSummary(update.aliases, "alias", "aliases"), ...listChangeSummary(update.categories, "category", "categories"))
	return changes.join(" · ")
}

function transformGalleryToUpdate(item: CommunityGallery, update: IconUpdate): CommunityUpdate {
	const { target } = update
	return {
		kind: "update",
		name: target.name,
		slug: item.id,
		status: item.status,
		targetId: target.id,
		hasAssets: Boolean(item.assets?.length),
		summary: summarizeCommunityUpdate(update),
		data: {
			aliases: [...new Set([...(target.metadata.aliases ?? []), ...update.aliases.add])],
			categories: [...new Set([...(target.metadata.categories ?? []), ...update.categories.add])],
			update: submissionActivity(item),
		},
	}
}

let hasLoggedCommunityFetchFailure = false

export function resetCommunityFetchFailureForTests(): void {
	hasLoggedCommunityFetchFailure = false
}

function logCommunityFetchFailure(error: unknown): void {
	if (hasLoggedCommunityFetchFailure) return
	hasLoggedCommunityFetchFailure = true
	const message = error instanceof Error ? error.message : String(error)
	console.warn(`Community submissions unavailable (${message}); continuing without community icons.`)
}

async function loadCommunityGallery(): Promise<CommunityGalleryEntry[]> {
	const records = await createServerPB().collection("community_gallery").getFullList<CommunityGallery>({
		sort: "-updated",
	})
	const entries: CommunityGalleryEntry[] = []
	for (const record of records) {
		if (record.icon_update) entries.push(transformGalleryToUpdate(record, record.icon_update))
		else if (record.assets?.length) entries.push(transformGalleryToIcon(record))
	}
	return entries
}

function hasAssets(entry: CommunityGalleryEntry): boolean {
	return entry.kind === "icon" || entry.hasAssets
}

/** Fetch asset-bearing community submissions without caching. */
export async function fetchCommunitySubmissions(): Promise<CommunityGalleryEntry[]> {
	try {
		return (await loadCommunityGallery()).filter(hasAssets)
	} catch (error) {
		logCommunityFetchFailure(error)
		return []
	}
}

const getCachedCommunityGallery = unstable_cache(loadCommunityGallery, ["community-submissions-list-v4"], {
	revalidate: 900,
	tags: ["community-gallery"],
})

/**
 * Cached public gallery, revalidated every 15 minutes or on demand with the community-gallery tag.
 * Failures are never cached: the previous list keeps being served, or an empty list is returned for this request only.
 */
export async function getCommunityGallery(): Promise<CommunityGalleryEntry[]> {
	try {
		return await getCachedCommunityGallery()
	} catch (error) {
		unstable_rethrow(error)
		logCommunityFetchFailure(error)
		return []
	}
}

/** Preserve asset-based membership for the community sitemap and detail prerendering. */
export async function getCommunitySubmissions(): Promise<CommunityGalleryEntry[]> {
	return (await getCommunityGallery()).filter(hasAssets)
}

/** Keep historical name-based URLs pointing to the original submission. */
export async function getCommunityGalleryRecordByName(name: string): Promise<CommunityGallery | null> {
	try {
		const pb = createServerPB()
		return await pb.collection("community_gallery").getFirstListItem<CommunityGallery>(pb.filter("name = {:name}", { name }), {
			sort: "created,id",
		})
	} catch {
		return null
	}
}

export function getCommunityGalleryRecord(id: string): Promise<CommunityGallery | null> {
	return unstable_cache(
		async () => {
			try {
				return await createServerPB().collection("community_gallery").getOne<CommunityGallery>(id)
			} catch (error) {
				if (error instanceof ClientResponseError && error.status === 404) return null
				throw error
			}
		},
		[`community-gallery-record-id-${id}`],
		{ revalidate: 900, tags: ["community-gallery", "community-gallery-record"] },
	)()
}
