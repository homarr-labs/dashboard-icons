"use client"

import { useQuery } from "@tanstack/react-query"
import type { IconSearchEntry } from "@/types/icons"

const ICON_CATALOG_QUERY_KEY = ["icon-catalog"] as const
const ICON_CATALOG_STALE_TIME = 15 * 60 * 1000

async function fetchIconCatalog(signal: AbortSignal): Promise<IconSearchEntry[]> {
	const response = await fetch("/api/icons/search", {
		credentials: "omit",
		signal,
	})

	if (!response.ok) {
		throw new Error(`Icon catalog request failed with ${response.status}`)
	}

	const catalog: unknown = await response.json()
	if (!Array.isArray(catalog)) {
		throw new Error("Icon catalog response was not an array")
	}

	return catalog as IconSearchEntry[]
}

export function useIconCatalog() {
	return useQuery({
		queryKey: ICON_CATALOG_QUERY_KEY,
		queryFn: ({ signal }) => fetchIconCatalog(signal),
		staleTime: ICON_CATALOG_STALE_TIME,
	})
}
