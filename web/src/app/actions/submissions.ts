"use server"

import { revalidateCommunityPage, revalidateSubmissions } from "@/lib/revalidate"

/**
 * Server actions for submission management
 * These can be called from client components to trigger cache revalidation
 */

/**
 * Revalidate the community page after a submission status change
 * Call this after approving, rejecting, or adding a submission to the collection
 */
export async function revalidateCommunitySubmissions() {
	try {
		await revalidateCommunityPage()
		return { success: true }
	} catch (error) {
		console.error("Error revalidating community page:", error)
		return { success: false, error: "Failed to revalidate" }
	}
}

/**
 * Revalidate all submission-related pages
 * Use this for actions that affect both the dashboard and community pages
 */
export async function revalidateAllSubmissions() {
	try {
		await revalidateSubmissions()
		return { success: true }
	} catch (error) {
		console.error("Error revalidating submissions:", error)
		return { success: false, error: "Failed to revalidate" }
	}
}
