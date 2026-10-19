import type { ExternalSourceId } from "@/constants"
import type { IconFormat, IconTheme } from "@/lib/icons/urls"
import type { IconVariantMatch } from "@/lib/icons/variants"

export type CatalogSource = "native" | ExternalSourceId

export type CatalogItem = {
	name: string
	title: string
	source: CatalogSource
	preview_url: string
}

export type CatalogHit = CatalogItem & { score: number; matched_variant?: IconVariantMatch }

export type CatalogUrls = Partial<Record<IconFormat, Record<string, string>>>

export type CatalogLicense = {
	name: string
	url: string | null
	attribution: string | null
	source_url: string | null
	guidelines_url: string | null
	provider: string
	provider_url: string
}

export type CatalogIcon = CatalogItem & {
	aliases: string[]
	categories: string[]
	author: string | null
	updated_at: string
	brand_color: string | null
	license: CatalogLicense | null
	page_url: string
	urls: CatalogUrls
}

export type CatalogDegraded = { degraded_sources?: CatalogSource[] }

export type CatalogResolution = { resolved_from?: string }

export type CatalogNotFound = CatalogDegraded & {
	found: false
	did_you_mean: CatalogHit[]
}

export type CatalogLookup = (CatalogResolution & { found: true; icon: CatalogIcon }) | CatalogNotFound

export type CatalogSvgUnavailableReason = "no_svg" | "no_variant" | "fetch_failed"

type CatalogSvgIdentity = CatalogResolution & {
	found: true
	name: string
	source: CatalogSource
	theme: IconTheme
}

export type CatalogSvgResult =
	| (CatalogSvgIdentity & { svg: string; url: string })
	| (CatalogSvgIdentity & { svg: null; url: string | null; reason: CatalogSvgUnavailableReason })
	| CatalogNotFound

export type CatalogSearchResult = CatalogDegraded & {
	results: CatalogHit[]
	total: number
}

export type CatalogServiceMatch = {
	service: string
	best: CatalogHit | null
	alternatives: CatalogHit[]
	reason?: "fuzzy_limit"
}

export type CatalogMatchResult = CatalogDegraded & {
	matches: CatalogServiceMatch[]
}

export type CatalogCategory = {
	name: string
	count: number
}

export type CatalogCategoriesResult = CatalogDegraded & {
	categories: CatalogCategory[]
}

export type CatalogBrowseSort = "newest" | "alphabetical"

export type CatalogBrowseResult = CatalogDegraded & {
	items: CatalogItem[]
	total: number
	next_cursor: string | null
}
