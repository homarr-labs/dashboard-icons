import { cache } from "react"
import { EXTERNAL_SOURCE_IDS, type ExternalSourceId, getExternalSource } from "@/constants"
import { createServerPB } from "@/lib/pb"
import type { ExternalIcon, ExternalIconRecord, IconRecord, NativeIconRecord } from "@/types/icons"
import { getIconsArray } from "./api"

const EXTERNAL_REVALIDATE_SECONDS = 900
const EXTERNAL_TTL_MS = EXTERNAL_REVALIDATE_SECONDS * 1000

let _memCache: { data: ExternalIconRecord[]; ts: number } | null = null

type ListExternalIconsOptions = {
	q?: string
	category?: string
	page?: number
	perPage?: number
}

function toExternalIconRecord(icon: ExternalIcon, { lite = false } = {}): ExternalIconRecord {
	const sourceConfig = getExternalSource(icon.source)
	const timestamp = icon.updated_at_source || icon.updated || icon.created || new Date(0).toISOString()
	const formats = icon.formats ?? []
	const aliases = icon.aliases ?? []
	const categories = icon.categories ?? []
	const colors =
		icon.variants?.light || icon.variants?.dark
			? {
					light: icon.variants?.light ? `${icon.slug}-light` : undefined,
					dark: icon.variants?.dark ? `${icon.slug}-dark` : undefined,
				}
			: undefined

	const externalData: ExternalIcon = lite
		? {
				id: icon.id,
				source: icon.source,
				slug: icon.slug,
				name: icon.name,
				aliases,
				categories,
				formats,
				variants: icon.variants ?? {},
				url_templates: icon.url_templates ?? {},
				license: icon.license ?? "",
				attribution: icon.attribution ?? "",
				source_url: icon.source_url ?? "",
			}
		: { ...icon, formats, aliases, categories }

	return {
		source: icon.source,
		slug: icon.slug,
		name: icon.name,
		external: externalData,
		data: {
			base: formats.includes("svg") ? "svg" : formats.includes("png") ? "png" : "webp",
			aliases,
			categories,
			update: {
				timestamp,
				author: {
					id: sourceConfig.id,
					name: sourceConfig.authorName,
					login: sourceConfig.authorLogin,
				},
			},
			colors,
		},
	}
}

async function fetchExternalIconsForSource(sourceId: ExternalSourceId): Promise<ExternalIconRecord[]> {
	const pb = createServerPB()
	const sourceConfig = getExternalSource(sourceId)
	const records = await pb.collection("external_icons").getFullList<ExternalIcon>({
		filter: pb.filter("source = {:source}", { source: sourceConfig.pbFilter }),
		fields:
			"id,source,slug,name,aliases,categories,formats,variants,url_templates,license,attribution,source_url,updated_at_source,created,updated",
		batch: 500,
		sort: "name",
		requestKey: null,
	})

	return records.map((r) => toExternalIconRecord(r, { lite: true }))
}

async function fetchAllExternalIcons(): Promise<ExternalIconRecord[]> {
	const results = await Promise.all(EXTERNAL_SOURCE_IDS.map(fetchExternalIconsForSource))
	return results.flat()
}

async function fetchExternalIconsWithTTL(): Promise<ExternalIconRecord[]> {
	if (_memCache && Date.now() - _memCache.ts < EXTERNAL_TTL_MS) {
		return _memCache.data
	}
	const data = await fetchAllExternalIcons()
	_memCache = { data, ts: Date.now() }
	return data
}

export const getExternalIcons = cache(async (): Promise<ExternalIconRecord[]> => {
	try {
		return await fetchExternalIconsWithTTL()
	} catch (error) {
		console.error("Error fetching external icons:", error)
		return []
	}
})

export async function getExternalIconBySlug(slug: string): Promise<ExternalIconRecord | null> {
	try {
		const pb = createServerPB()
		const record = await pb.collection("external_icons").getFirstListItem<ExternalIcon>(pb.filter("slug = {:slug}", { slug }), {
			requestKey: null,
		})
		return toExternalIconRecord(record)
	} catch (error) {
		console.error(`Error fetching external icon ${slug}:`, error)
		return null
	}
}

export const getExternalIcon = getExternalIconBySlug

export async function listExternalIcons({ q = "", category, page = 1, perPage = 60 }: ListExternalIconsOptions = {}) {
	const icons = await getExternalIcons()
	const query = q.trim().toLowerCase()
	const normalizedCategory = category?.trim().toLowerCase()

	const filtered = icons.filter((icon) => {
		const matchesQuery =
			!query ||
			icon.external.name.toLowerCase().includes(query) ||
			icon.slug.toLowerCase().includes(query) ||
			icon.data.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
			icon.data.categories.some((cat) => cat.toLowerCase().includes(query))
		const matchesCategory = !normalizedCategory || icon.data.categories.some((cat) => cat.toLowerCase() === normalizedCategory)
		return matchesQuery && matchesCategory
	})

	const start = Math.max(page - 1, 0) * perPage
	return {
		items: filtered.slice(start, start + perPage),
		page,
		perPage,
		totalItems: filtered.length,
		totalPages: Math.max(Math.ceil(filtered.length / perPage), 1),
	}
}

export async function searchAllSources(q = ""): Promise<IconRecord[]> {
	const [nativeIcons, externalIcons] = await Promise.all([getIconsArray(), getExternalIcons()])
	const merged = new Map<string, IconRecord>()

	for (const icon of nativeIcons) {
		const nativeIcon: NativeIconRecord = {
			...icon,
			source: "native",
			slug: icon.slug || icon.name,
		}
		merged.set(nativeIcon.name.toLowerCase(), nativeIcon)
	}

	for (const icon of externalIcons) {
		const key = icon.external.name.toLowerCase()
		if (!merged.has(key)) {
			merged.set(key, icon)
		}
	}

	const query = q.trim().toLowerCase()
	if (!query) return Array.from(merged.values())

	return Array.from(merged.values()).filter(
		(icon) =>
			icon.name.toLowerCase().includes(query) ||
			icon.slug.toLowerCase().includes(query) ||
			icon.data.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
			icon.data.categories.some((category) => category.toLowerCase().includes(query)),
	)
}
