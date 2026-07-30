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
