import type { ExternalSourceId } from "@/constants"

export type IconAuthor = {
	id: number | string
	github_id?: string
	name?: string
	login?: string
}

export type IconUpdate = {
	timestamp: string
	author: IconAuthor
}

export type IconColors = {
	dark?: string
	light?: string
}

export type IconWordmarkColors = {
	dark?: string
	light?: string
}

export type Icon = {
	base: string | "svg" | "png" | "webp"
	aliases: string[]
	categories: string[]
	update: IconUpdate
	colors?: IconColors
	wordmark?: IconWordmarkColors
}

export type IconFile = {
	[key: string]: Icon
}

export type IconWithName = {
	name: string
	data: Icon
	source?: "native" | ExternalSourceId
	slug?: string
	external?: ExternalIcon
}

export type ExternalIconUrlData = Pick<ExternalIcon, "source" | "slug" | "formats" | "url_templates" | "brand_color">

export type IconSearchEntry = {
	name: string
	data: Pick<Icon, "base" | "aliases" | "categories"> & Partial<Pick<Icon, "update">>
	source?: "native" | ExternalSourceId
	slug?: string
	external?: ExternalIconUrlData
}

export type IconSearchProps = {
	icons: IconRecord[]
	initialQuery?: string
}

export type ExternalIconUrlTemplates = {
	svg?: string
	svg_light?: string
	svg_dark?: string
	png?: string
	webp?: string
	avif?: string
	ico?: string
	[key: string]: string | undefined
}

export type ExternalIcon = {
	id: string
	source: ExternalSourceId
	slug: string
	name: string
	aliases: string[]
	categories: string[]
	formats: string[]
	variants: {
		light?: boolean
		dark?: boolean
	}
	url_templates: ExternalIconUrlTemplates
	license: string
	license_url?: string
	attribution: string
	source_url: string
	guidelines_url?: string
	brand_color?: string
	stable_svg_url?: string
	upstream_version?: string
	upstream_data?: Record<string, unknown>
	updated_at_source?: string
	created?: string
	updated?: string
}

export type NativeIconRecord = IconWithName & {
	source: "native"
	slug: string
}

export type ExternalIconRecord = IconWithName & {
	source: ExternalSourceId
	slug: string
	external: ExternalIcon
}

export type IconRecord = NativeIconRecord | ExternalIconRecord

export type AuthorData = {
	id: number | string
	name?: string
	login: string
	avatar_url: string
	html_url: string
}
