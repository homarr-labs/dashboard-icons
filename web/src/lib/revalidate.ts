"use server"

import { revalidatePath, updateTag } from "next/cache"

/**
 * Revalidate the community page cache
 * Can be called from server actions after submission approval/rejection
 * Uses updateTag for immediate updates (read-your-writes semantics)
 */
export async function revalidateCommunityPage() {
	revalidatePath("/community")
	updateTag("community-gallery")
}

/**
 * Revalidate a specific community icon page
 * Use this when a specific submission's status changes
 * Uses updateTag for immediate updates (read-your-writes semantics)
 */
export async function revalidateCommunityIcon(iconName: string) {
	revalidatePath(`/community/${iconName}`)
	updateTag("community-gallery")
	updateTag("community-submission")
	updateTag("community-gallery-record")
}

/**
 * Revalidate all submission-related caches
 * Uses updateTag for immediate updates (read-your-writes semantics)
 */
export async function revalidateSubmissions() {
	updateTag("community-gallery")
	updateTag("community-submission")
	updateTag("community-gallery-record")
	revalidatePath("/community")
	revalidatePath("/dashboard")
}
