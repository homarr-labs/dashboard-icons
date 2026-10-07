import "server-only"

import { unstable_cache } from "next/cache"
import { TAKEDOWNS_URL } from "@/constants"

export interface PublicTakedown {
	icon: string
	reason: string
	requester_name: string
	description: string
	takedown_id: string
	date: string
}

const TAKEDOWN_FETCH_TIMEOUT_MS = 10_000

/**
 * Fetch the public takedown record for an icon from the repository's
 * takedowns.json ledger. Returns null when the icon was not taken down.
 */
async function fetchPublicTakedown(icon: string): Promise<PublicTakedown | null> {
	try {
		const response = await fetch(TAKEDOWNS_URL, {
			signal: AbortSignal.timeout(TAKEDOWN_FETCH_TIMEOUT_MS),
			cache: "no-store",
		})
		if (!response.ok) return null
		const catalogue: Record<string, PublicTakedown> = await response.json()
		const entry = catalogue[icon]
		if (!entry) return null
		return {
			icon,
			reason: entry.reason || "Takedown request",
			requester_name: entry.requester_name || "",
			description: entry.description || "",
			takedown_id: entry.takedown_id || "",
			date: entry.date || "",
		}
	} catch {
		return null
	}
}

/**
 * Cached per-icon takedown lookup. Revalidates every 60 seconds and can be
 * invalidated immediately with revalidateTag("takedowns").
 */
export function getPublicTakedown(icon: string): Promise<PublicTakedown | null> {
	return unstable_cache(async () => fetchPublicTakedown(icon), [`public-takedown-${icon}`], {
		revalidate: 60,
		tags: ["takedowns"],
	})()
}
