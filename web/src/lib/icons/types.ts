import type { ExternalSourceId } from "@/constants"
import type { Icon } from "@/types/icons"

export type IconSource = "native" | ExternalSourceId

export type SearchResult = {
	name: string
	source: IconSource
	aliases: string[]
	categories: string[]
	score: number
}

export type IconDetail = {
	name: string
	source: IconSource
	title?: string
	base: Icon["base"]
	aliases: string[]
	categories: string[]
	colors?: Icon["colors"]
	update: Icon["update"]
	// Third-party sources may not ship every format.
	urls: {
		svg?: string
		png?: string
		webp?: string
		light?: string
		dark?: string
	}
	license?: string
	attribution?: string
	source_url?: string
}

export type Suggestion = {
	name: string
	source: IconSource
	score: number
	url: string
}

export type IconUrlResult = {
	url: string
	name: string
	source: IconSource
	format: "svg" | "png" | "webp"
	theme: "default" | "light" | "dark"
}
