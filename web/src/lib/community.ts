import { unstable_cache } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { ClientResponseError } from "pocketbase"
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

async function loadCommunitySubmissions(): Promise<IconWithName[]> {
	const records = await createServerPB().collection("community_gallery").getFullList<CommunityGallery>({
		sort: "-updated",
	})
	return records.filter((item) => item.assets && item.assets.length > 0).map(transformGalleryToIcon)
}

/**
 * Fetch community gallery items without caching. Uses the community_gallery view collection for public-facing data.
 */
export async function fetchCommunitySubmissions(): Promise<IconWithName[]> {
	try {
		return await loadCommunitySubmissions()
	} catch (error) {
		logCommunityFetchFailure(error)
		return []
	}
}

const getCachedCommunitySubmissions = unstable_cache(loadCommunitySubmissions, ["community-submissions-list-v3"], {
	revalidate: 900,
	tags: ["community-gallery"],
})

/**
 * Cached community gallery items, revalidated every 15 minutes or on demand with revalidateTag("community-gallery").
 * Failures are never cached: the previous list keeps being served, or an empty list is returned for this request only.
 */
export async function getCommunitySubmissions(): Promise<IconWithName[]> {
	try {
		return await getCachedCommunitySubmissions()
	} catch (error) {
		unstable_rethrow(error)
		logCommunityFetchFailure(error)
		return []
	}
}

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
			} catch (error) {
				if (error instanceof ClientResponseError && error.status === 404) return null
				throw error
			}
		},
		[`community-gallery-record-id-${id}`],
		{ revalidate: 900, tags: ["community-gallery", "community-gallery-record"] },
	)()
}
