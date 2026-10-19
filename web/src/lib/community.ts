import { unstable_cache } from "next/cache"
import type { CommunityGallery } from "@/lib/pb"
import { createServerPB, getPocketBaseUrl } from "@/lib/pb"
import { resolveSubmissionAssets, variantExtras } from "@/lib/submission-variants"
import type { IconWithName } from "@/types/icons"

/**
 * Transform a CommunityGallery item to IconWithName format for use with IconSearch
 * For community icons, base is the full HTTP URL to the main icon asset
 * Additional assets are stored but not exposed in the standard Icon format
 */
function transformGalleryToIcon(item: CommunityGallery): any {
	const pbUrl = getPocketBaseUrl()

	const mainIcon = item.assets?.[0] ? `${pbUrl}/api/files/community_gallery/${item.id}/${item.assets[0]}` : ""

	const mainAssetExt = item.assets?.[0]?.split(".").pop()?.toLowerCase() || "svg"
	const baseFormat = mainAssetExt === "svg" ? "svg" : mainAssetExt === "png" ? "png" : "webp"

	const resolved = resolveSubmissionAssets(item.extras, item.assets, item.name)
	const { colors, wordmark, variants } = variantExtras(
		Object.fromEntries(resolved.assets.flatMap(({ file, variant }) => (variant ? [[variant, file]] : []))),
	)

	const transformed = {
		name: item.name,
		slug: item.id,
		status: item.status,
		data: {
			base: mainIcon || "svg",
			baseFormat,
			mainIconUrl: mainIcon,
			assetUrls: item.assets?.map((asset) => `${pbUrl}/api/files/community_gallery/${item.id}/${asset}`) || [],
			aliases: item.extras?.aliases || [],
			categories: item.extras?.categories || [],
			update: {
				timestamp: item.updated,
				author: {
					id: 0,
					name: item.created_by || "Community",
					login: item.created_by || undefined,
					github_id: item.created_by_github_id,
				},
			},
			colors: colors,
			wordmark: wordmark,
			variants,
		},
	}

	return transformed
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
/**
 * Fetch community gallery items (not added to collection)
 * Uses the community_gallery view collection for public-facing data
 * This is the raw fetch function without caching
 */
export async function fetchCommunitySubmissions(): Promise<IconWithName[]> {
	try {
		const pb = createServerPB()

		const records = await pb.collection("community_gallery").getFullList<CommunityGallery>({
			sort: "-updated",
		})

		return records.filter((item) => item.assets && item.assets.length > 0).map(transformGalleryToIcon)
	} catch (error) {
		logCommunityFetchFailure(error)
		return []
	}
}

/**
 * Cached version of fetchCommunitySubmissions
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 900 seconds (15 minutes)
 * Can be invalidated on-demand using revalidateTag("community-gallery")
 */
export const getCommunitySubmissions = unstable_cache(fetchCommunitySubmissions, ["community-submissions-list-v3"], {
	revalidate: 900,
	tags: ["community-gallery"],
})

/** Fetch a proposal by record ID, independently of its icon name. */
export async function getCommunitySubmission(id: string): Promise<IconWithName | null> {
	const record = await getCommunityGalleryRecord(id)
	return record ? transformGalleryToIcon(record) : null
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
			} catch {
				return null
			}
		},
		[`community-gallery-record-id-${id}`],
		{ revalidate: 900, tags: ["community-gallery", "community-gallery-record"] },
	)()
}
