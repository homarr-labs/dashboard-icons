import type { Metadata } from "next"
import { WEB_URL } from "@/constants"

export const DEFAULT_OG_PATH = "/og/default"

const FILTER_PARAMS = ["q", "sort", "source", "category"] as const

export function buildDefaultOgImages(alt: string) {
	return [
		{
			url: DEFAULT_OG_PATH,
			width: 1200,
			height: 630,
			alt,
			type: "image/png",
		},
	]
}

export function buildDefaultTwitterImages() {
	return [DEFAULT_OG_PATH]
}

export function getFilteredBrowseMetadata(
	searchParams: Record<string, string | string[] | undefined>,
	basePath: "/icons" | "/community",
): Pick<Metadata, "robots" | "alternates"> {
	const hasFilters = FILTER_PARAMS.some((param) => searchParams[param])

	const filteredMetadata: Pick<Metadata, "robots" | "alternates"> = {
		robots: { index: false, follow: true },
		alternates: { canonical: `${WEB_URL}${basePath}` },
	}

	const defaultMetadata: Pick<Metadata, "robots" | "alternates"> = {
		alternates: { canonical: `${WEB_URL}${basePath}` },
	}

	const metadataByFilterState: Record<"filtered" | "default", Pick<Metadata, "robots" | "alternates">> = {
		filtered: filteredMetadata,
		default: defaultMetadata,
	}

	return metadataByFilterState[hasFilters ? "filtered" : "default"]
}
