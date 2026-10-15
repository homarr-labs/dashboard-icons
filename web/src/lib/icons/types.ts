import type { ExternalSourceId } from "@/constants"
import type { IconFormat, IconTheme } from "@/lib/icons/urls"
import type { Icon } from "@/types/icons"

export type SearchResult = {
	name: string
	aliases: string[]
	categories: string[]
	score: number
}

export type IconDetail = {
	name: string
	base: Icon["base"]
	aliases: string[]
	categories: string[]
	colors?: Icon["colors"]
	update: Icon["update"]
	urls: {
		svg: string
		png: string
		webp: string
		light?: string
		dark?: string
	}
}

export type Suggestion = {
	name: string
	score: number
	url: string
}

export type IconUrlResult = {
	url: string
	name: string
	format: "svg" | "png" | "webp"
	theme: "default" | "light" | "dark"
}

export type CatalogSource = "native" | ExternalSourceId

export type CatalogItem = {
	name: string
	title: string
	source: CatalogSource
	previewUrl: string
}

export type CatalogHit = CatalogItem & { score: number }

export type CatalogUrls = Partial<Record<IconFormat, Partial<Record<IconTheme, string>>>>

export type CatalogLicense = {
	name: string
	url: string | null
	attribution: string | null
	sourceUrl: string | null
	guidelinesUrl: string | null
	provider: string
	providerUrl: string
}

export type CatalogIcon = CatalogItem & {
	aliases: string[]
	categories: string[]
	author: string | null
	updatedAt: string
	brandColor: string | null
	license: CatalogLicense | null
	pageUrl: string
	urls: CatalogUrls
}

export type CatalogNotFound = {
	found: false
	didYouMean: CatalogHit[]
	degradedSources: CatalogSource[]
}

export type CatalogLookup = { found: true; icon: CatalogIcon } | CatalogNotFound

export type CatalogSvgUnavailableReason = "no_svg" | "no_variant" | "fetch_failed"

type CatalogSvgIdentity = {
	found: true
	name: string
	source: CatalogSource
	theme: IconTheme
}

export type CatalogSvgResult =
	| (CatalogSvgIdentity & { svg: string; url: string })
	| (CatalogSvgIdentity & { svg: null; url: string | null; reason: CatalogSvgUnavailableReason })
	| CatalogNotFound

export type CatalogSearchResult = {
	results: CatalogHit[]
	total: number
	degradedSources: CatalogSource[]
}

export type CatalogServiceMatch = {
	service: string
	best: CatalogHit | null
	alternatives: CatalogHit[]
}

export type CatalogMatchResult = {
	matches: CatalogServiceMatch[]
	degradedSources: CatalogSource[]
}

export type CatalogCategory = {
	name: string
	count: number
}

export type CatalogCategoriesResult = {
	categories: CatalogCategory[]
	degradedSources: CatalogSource[]
}

export type CatalogBrowseSort = "newest" | "alphabetical"

export type CatalogBrowseResult = {
	items: CatalogItem[]
	total: number
	nextCursor: string | null
	degradedSources: CatalogSource[]
}
