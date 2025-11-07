import { unstable_cache } from "next/cache"
import PocketBase from "pocketbase"
import type { CommunityGallery } from "@/lib/pb"
import type { IconWithName } from "@/types/icons"

/**
 * Server-side utility functions for community gallery (public submissions view)
 * Uses unstable_cache with tags for on-demand revalidation
 */

/**
 * Create a new PocketBase instance for server-side operations
 * Note: Do not use the client-side pb instance (with auth store) on the server
 */
function createServerPB() {
	return new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090")
}

/**
 * Transform a CommunityGallery item to IconWithName format for use with IconSearch
 * For community icons, base is the full HTTP URL to the main icon asset
 * Additional assets are stored but not exposed in the standard Icon format
 */
function transformGalleryToIcon(item: CommunityGallery): any {
	const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"

	const mainIcon = item.assets?.[0] ? `${pbUrl}/api/files/community_gallery/${item.id}/${item.assets[0]}` : ""

	const mainAssetExt = item.assets?.[0]?.split(".").pop()?.toLowerCase() || "svg"
	const baseFormat = mainAssetExt === "svg" ? "svg" : mainAssetExt === "png" ? "png" : "webp"

	const transformed = {
		name: item.name,
		status: item.status,
		data: {
			base: mainIcon || "svg",
			baseFormat,
			mainIconUrl: mainIcon,
			assetUrls: item.assets?.map((asset) => `${pbUrl}/api/files/community_gallery/${item.id}/${asset}`) || [],
			aliases: item.extras?.aliases || [],
			categories: item.extras?.categories || [],
			update: {
				timestamp: item.created,
				author: {
					id: 0,
					name: item.created_by || "Community",
				},
			},
			colors: item.extras?.colors,
			wordmark: item.extras?.wordmark,
		},
	}

	return transformed
}

/**
 * Fetch community gallery items (not added to collection)
 * Uses the community_gallery view collection for public-facing data
 * This is the raw fetch function without caching
 */
async function fetchCommunitySubmissions(): Promise<IconWithName[]> {
	try {
		const pb = createServerPB()

		const records = await pb.collection("community_gallery").getFullList<CommunityGallery>({
			filter: 'status != "added_to_collection"',
			sort: "-created",
		})

		return records.filter((item) => item.assets && item.assets.length > 0).map(transformGalleryToIcon)
	} catch (error) {
		console.error("Error fetching community submissions:", error)
		return []
	}
}

/**
 * Cached version of fetchCommunitySubmissions
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 21600 seconds (6 hours) to match page revalidate time
 * Can be invalidated on-demand using revalidateTag("community-gallery")
 */
export const getCommunitySubmissions = unstable_cache(fetchCommunitySubmissions, ["community-submissions-list"], {
	revalidate: 21600,
	tags: ["community-gallery"],
})

/**
 * Fetch a single community submission by name (raw function)
 * Returns null if not found
 */
async function fetchCommunitySubmissionByName(name: string): Promise<IconWithName | null> {
	try {
		const pb = createServerPB()

		const record = await pb.collection("community_gallery").getFirstListItem<CommunityGallery>(`name="${name}"`)
		return transformGalleryToIcon(record)
	} catch (error) {
		console.error(`Error fetching community submission ${name}:`, error)
		return null
	}
}

/**
 * Cached version of fetchCommunitySubmissionByName
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 21600 seconds (6 hours)
 * Cache key: community-submission-{name}
 */
export function getCommunitySubmissionByName(name: string): Promise<IconWithName | null> {
	return unstable_cache(async () => fetchCommunitySubmissionByName(name), [`community-submission-${name}`], {
		revalidate: 21600,
		tags: ["community-gallery", "community-submission"],
	})()
}

/**
 * Fetch raw CommunityGallery record by name (raw function, for status checks)
 */
async function fetchCommunityGalleryRecord(name: string): Promise<CommunityGallery | null> {
	try {
		const pb = createServerPB()

		const record = await pb.collection("community_gallery").getFirstListItem<CommunityGallery>(`name="${name}"`)
		return record
	} catch (error) {
		console.error(`Error fetching community gallery record ${name}:`, error)
		return null
	}
}

/**
 * Cached version of fetchCommunityGalleryRecord
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 21600 seconds (6 hours)
 * Cache key: community-gallery-record-{name}
 */
export function getCommunityGalleryRecord(name: string): Promise<CommunityGallery | null> {
	return unstable_cache(async () => fetchCommunityGalleryRecord(name), [`community-gallery-record-${name}`], {
		revalidate: 21600,
		tags: ["community-gallery", "community-gallery-record"],
	})()
}
