"use server"

import { revalidatePath, revalidateTag } from "next/cache"

/**
 * Revalidate the community page cache
 * Can be called from server actions after submission approval/rejection
 */
export async function revalidateCommunityPage() {
	revalidatePath("/community")
	revalidateTag("community-gallery")
}

/**
 * Revalidate all submission-related caches
 */
export async function revalidateSubmissions() {
	revalidateTag("community-gallery")
	revalidatePath("/community")
	revalidatePath("/dashboard")
}
