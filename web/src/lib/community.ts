import { unstable_cache } from "next/cache"
import type { CommunityGallery } from "@/lib/pb"
import { createServerPB, getPocketBaseUrl } from "@/lib/pb"
import type { IconWithName } from "@/types/icons"

/**
 * Helper to find the best matching asset filename for a given original filename
 * PocketBase sanitizes filenames and appends a random suffix.
 * This function attempts to map the stored original filename (in extras) to the actual sanitized filename (in assets).
 */
function findBestMatchingAsset(originalName: string, assets: string[]): string {
	if (!originalName || !assets || assets.length === 0) return originalName

	// 1. Exact match
	if (assets.includes(originalName)) return originalName

	// 2. Normalized match
	// Normalize: remove non-alphanumeric, lowercase
	const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase()

	// Remove extension for comparison
	const originalBase = originalName.substring(0, originalName.lastIndexOf(".")) || originalName
	const normalizedOriginal = normalize(originalBase)

	// Check against assets
	for (const asset of assets) {
		const assetBase = asset.substring(0, asset.lastIndexOf(".")) || asset
		const normalizedAsset = normalize(assetBase)

		// Check if normalized asset STARTS with normalized original
		// PocketBase usually appends `_` + random chars, which normalize removes or appends to end
		// "langsmith (2)" -> "langsmith2"
		// "langsmith_2_8tf..." -> "langsmith28tf..."
		if (normalizedAsset.startsWith(normalizedOriginal)) {
			return asset
		}
	}

	return originalName // Fallback to original if no match found
}

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

	// Process and fix file mappings in extras
	const colors = item.extras?.colors ? { ...item.extras.colors } : undefined
	if (colors && item.assets) {
		Object.keys(colors).forEach((key) => {
			const k = key as keyof typeof colors
			if (colors[k]) {
				colors[k] = findBestMatchingAsset(colors[k]!, item.assets || [])
			}
		})
	}

	const wordmark = item.extras?.wordmark ? { ...item.extras.wordmark } : undefined
	if (wordmark && item.assets) {
		Object.keys(wordmark).forEach((key) => {
			const k = key as keyof typeof wordmark
			if (wordmark[k]) {
				wordmark[k] = findBestMatchingAsset(wordmark[k]!, item.assets || [])
			}
		})
	}

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
					login: item.created_by || undefined,
					github_id: item.created_by_github_id,
				},
			},
			colors: colors,
			wordmark: wordmark,
		},
	}

	return transformed
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
		console.error("Error fetching community submissions:", error)
		return []
	}
}

/**
 * Cached version of fetchCommunitySubmissions
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 900 seconds (15 minutes)
 * Can be invalidated on-demand using revalidateTag("community-gallery")
 */
export const getCommunitySubmissions = unstable_cache(fetchCommunitySubmissions, ["community-submissions-list-v2"], {
	revalidate: 900,
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
		const transformed = transformGalleryToIcon(record)
		return transformed
	} catch (error) {
		console.error(`Error fetching community submission ${name}:`, error)
		return null
	}
}

/**
 * Cached version of fetchCommunitySubmissionByName
 * Uses unstable_cache with tags for on-demand revalidation
 * Revalidates every 900 seconds (15 minutes)
 * Cache key: community-submission-{name}
 */
export function getCommunitySubmissionByName(name: string): Promise<IconWithName | null> {
	return unstable_cache(async () => fetchCommunitySubmissionByName(name), [`community-submission-${name}-v2`], {
		revalidate: 900,
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
 * Revalidates every 900 seconds (15 minutes)
 * Cache key: community-gallery-record-{name}
 */
export function getCommunityGalleryRecord(name: string): Promise<CommunityGallery | null> {
	return unstable_cache(async () => fetchCommunityGalleryRecord(name), [`community-gallery-record-${name}`], {
		revalidate: 900,
		tags: ["community-gallery", "community-gallery-record"],
	})()
}
