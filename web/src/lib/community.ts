import { unstable_cache } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { ClientResponseError } from "pocketbase"
import type { IconUpdate, ListDelta } from "@/lib/icon-update"
import { type CommunityGallery, createServerPB, getPocketBaseUrl } from "@/lib/pb"
import { resolveSubmissionAssets, SUBMISSION_VARIANTS, variantExtras, variantKind } from "@/lib/submission-variants"
import type { Icon } from "@/types/icons"

type CommunitySubmission = {
	iconSlug: string
	submissionId: string
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
	targetSubmissionId?: string
	hasComparison: boolean
	summary: string
	data: Pick<Icon, "aliases" | "categories" | "update">
}

export type CommunityGalleryEntry = CommunityIcon | CommunityUpdate

type CommunitySubmissionIndexEntry = { submissionId: string; updated: string }

type CommunityListings = {
	gallery: CommunityGalleryEntry[]
	assetBearing: CommunitySubmissionIndexEntry[]
}

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
		iconSlug: item.name,
		submissionId: item.id,
		status: item.status,
		data: {
			base: mainIconUrl || "svg",
			baseFormat,
			mainIconUrl,
			assetUrls,
			aliases: stringListOrEmpty(item.extras?.aliases),
			categories: stringListOrEmpty(item.extras?.categories),
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

function summarizeCommunityUpdate(update: IconUpdate): string {
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

function isStringList(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function stringListOrEmpty(value: unknown): string[] {
	if (isStringList(value)) return value
	return []
}

function isListDelta(value?: ListDelta): boolean {
	return isStringList(value?.add) && isStringList(value?.remove)
}

function isStringRecord(value: unknown): boolean {
	return Boolean(
		value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((item) => typeof item === "string"),
	)
}

// Stored JSON may predate the current comparison format.
function hasComparisonData(update?: IconUpdate | null): update is IconUpdate {
	if (update?.version !== 1 || !Array.isArray(update.variants) || !isListDelta(update.aliases) || !isListDelta(update.categories))
		return false
	const target = update.target
	if (!target || typeof target.name !== "string" || typeof target.id !== "string" || !isStringRecord(target.files)) return false
	if (target.kind !== "published" && target.kind !== "submission") return false
	if (!isStringList(target.metadata?.aliases) || !isStringList(target.metadata?.categories)) return false
	if (target.source && !isStringRecord(target.source.blobs)) return false
	return update.variants.every((change) => {
		if (typeof change?.key !== "string") return false
		if (!SUBMISSION_VARIANTS.some((key) => key === change.key) && !change.key.startsWith("custom:")) return false
		if (change.action === "remove") return change.note === undefined || typeof change.note === "string"
		return (change.action === "add" || change.action === "replace") && typeof change.file === "string"
	})
}

export function getCommunityUpdateDetails(item: CommunityGallery) {
	if (!item.icon_update && !item.target_submission) return null
	if (hasComparisonData(item.icon_update)) {
		const update = item.icon_update
		return {
			iconSlug: update.target.name,
			targetSubmissionId: update.target.id || undefined,
			summary: summarizeCommunityUpdate(update),
			update,
		}
	}
	return {
		iconSlug: item.name,
		targetSubmissionId: item.target_submission,
		summary: "The changes in this proposal are unavailable.",
		update: null,
	}
}

function transformGalleryToUpdate(
	item: CommunityGallery,
	details: NonNullable<ReturnType<typeof getCommunityUpdateDetails>>,
): CommunityUpdate {
	const { update } = details
	let aliases = item.extras?.aliases
	let categories = item.extras?.categories
	if (update) {
		aliases = [...new Set([...update.target.metadata.aliases, ...update.aliases.add])]
		categories = [...new Set([...update.target.metadata.categories, ...update.categories.add])]
	}
	return {
		kind: "update",
		iconSlug: details.iconSlug,
		submissionId: item.id,
		status: item.status,
		targetSubmissionId: details.targetSubmissionId,
		hasComparison: Boolean(update),
		summary: details.summary,
		data: {
			aliases: stringListOrEmpty(aliases),
			categories: stringListOrEmpty(categories),
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

async function loadCommunityListings(): Promise<CommunityListings> {
	const records = await createServerPB().collection("community_gallery").getFullList<CommunityGallery>({
		sort: "-updated",
	})
	const gallery: CommunityGalleryEntry[] = []
	const assetBearing: CommunitySubmissionIndexEntry[] = []
	for (const record of records) {
		if (record.assets?.length) assetBearing.push({ submissionId: record.id, updated: record.updated })

		const update = getCommunityUpdateDetails(record)
		if (update) gallery.push(transformGalleryToUpdate(record, update))
		else if (record.assets?.length) gallery.push(transformGalleryToIcon(record))
	}
	return { gallery, assetBearing }
}

/** Fetch asset-bearing community submissions without caching. */
export async function fetchCommunitySubmissions(): Promise<CommunitySubmissionIndexEntry[]> {
	try {
		return (await loadCommunityListings()).assetBearing
	} catch (error) {
		logCommunityFetchFailure(error)
		return []
	}
}

const getCachedCommunityListings = unstable_cache(loadCommunityListings, ["community-submissions-list-v5"], {
	revalidate: 900,
	tags: ["community-gallery"],
})

/**
 * Cached public gallery, revalidated every 15 minutes or on demand with the community-gallery tag.
 * Failures are never cached: the previous list keeps being served, or an empty list is returned for this request only.
 */
async function getCommunityListings(): Promise<CommunityListings> {
	try {
		return await getCachedCommunityListings()
	} catch (error) {
		unstable_rethrow(error)
		logCommunityFetchFailure(error)
		return { gallery: [], assetBearing: [] }
	}
}

export async function getCommunityGallery(): Promise<CommunityGalleryEntry[]> {
	return (await getCommunityListings()).gallery
}

/** Preserve asset-based membership for the community sitemap and detail prerendering. */
export async function getCommunitySubmissions(): Promise<CommunitySubmissionIndexEntry[]> {
	return (await getCommunityListings()).assetBearing
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
