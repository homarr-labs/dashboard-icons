"use server"

import { revalidatePath, updateTag } from "next/cache"
import { clearMetadataCache } from "@/lib/icons/service"

/**
 * Purge the icon catalogue cache and revalidate public pages after a takedown
 * finishes so removed icons disappear promptly instead of after the ISR window.
 */
export async function revalidateTakedownIcon(icon: string) {
	try {
		clearMetadataCache()
		updateTag("takedowns")
		updateTag("native-icons")
		revalidatePath(`/icons/${icon}`, "page")
		revalidatePath("/icons")
		return { success: true }
	} catch (error) {
		console.error("Error revalidating takedown:", error)
		return { success: false, error: "Failed to revalidate" }
	}
}
