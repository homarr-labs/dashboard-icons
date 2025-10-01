import { unstable_cache } from "next/cache"
import PocketBase from "pocketbase"
import type { CommunityGallery } from "@/lib/pb"
import type { IconWithName } from "@/types/icons"

/**
 * Server-side utility functions for community gallery (public submissions view)
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
 */
function transformGalleryToIcon(item: CommunityGallery): any {
	const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"

	const fileUrl = item.assets?.[0] ? `${pbUrl}/api/files/community_gallery/${item.id}/${item.assets[0]}` : ""

	const transformed = {
		name: item.name,
		status: item.status,
		data: {
			base: fileUrl || "svg",
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
 * Filters out items without assets
 */
export async function fetchCommunitySubmissions(): Promise<IconWithName[]> {
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
 * Revalidates every 600 seconds (10 minutes)
 */
export const getCommunitySubmissions = unstable_cache(fetchCommunitySubmissions, ["community-gallery"], {
	revalidate: 600,
	tags: ["community-gallery"],
})
