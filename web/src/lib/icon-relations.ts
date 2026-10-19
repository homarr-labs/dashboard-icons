import "server-only"

import { getAllIcons } from "@/lib/api"
import { getExternalIconPagePath } from "@/lib/external-icon-urls"
import { getExternalIcons } from "@/lib/external-icons"
import type { ExternalIconRecord, IconFile, IconRecord } from "@/types/icons"

const BRAND_PREFIXES = [
	"adguard-home",
	"adobe",
	"amazon",
	"amcrest",
	"apache",
	"app-store",
	"apple",
	"asrock-rack",
	"asus",
	"atlassian",
	"avm-fritzbox",
	"aws",
	"azure",
	"bluesky",
	"brave",
	"calibre",
	"chrome",
	"cross-seed",
	"crowdsec",
	"discord",
	"docker",
	"elastic",
	"erste",
	"esphome",
	"facebook",
	"fedora",
	"filebrowser",
	"firefox",
	"foxit",
	"fritzbox",
	"garmin",
	"gitea",
	"godaddy",
	"google",
	"hetzner",
	"home-assistant",
	"icinga",
	"immich",
	"intellij",
	"ivanti",
	"jellyfin",
	"jetkvm",
	"jitsi",
	"kasm",
	"keenetic",
	"keyoxide",
	"konica-minolta",
	"kotlin",
	"libreoffice",
	"linux",
	"logitech",
	"matrix",
	"microsoft",
	"mobilizon",
	"mullvad",
	"mylar",
	"netbox",
	"netgear",
	"nextcloud",
	"nextjs",
	"nodejs",
	"notion",
	"nut",
	"odysee",
	"omni-tools",
	"opera",
	"oracle",
	"packetfence",
	"paperless",
	"pi-hole",
	"playstation",
	"plex",
	"portainer",
	"prometheus",
	"proton",
	"qnap",
	"resiliosync",
	"safari",
	"shoko",
	"stalwart",
	"statping",
	"stump",
	"synology",
	"telegram",
	"telekom",
	"trmnl",
	"truenas",
	"typescript",
	"ubiquiti",
	"ubuntu-linux",
	"ugreen",
	"unifi",
	"urbackup",
	"vmware",
	"wikijs",
	"xbox",
	"yacd",
	"yahoo",
	"youtube",
	"zoho",
	"zoom",
]
const VERSION_SUFFIX = /-(4k|dv|2d|3d)$/
const MAX_RELATED_BY_NAME = 12

type RelationIndex = {
	primary: Map<string, Set<IconRecord>>
	versions: Map<string, IconRecord[]>
	brands: Map<string, IconRecord[]>
}

export type IconRelations = {
	sameBrand: IconRecord[]
	versions: IconRecord[]
	relatedByName: IconRecord[]
}

let cachedIndex: { native: IconFile; external: ExternalIconRecord[]; index: RelationIndex } | undefined

function normalizeName(name: string): string {
	return name
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\s._-]+/g, "")
}

export function getIconPagePath(icon: Pick<IconRecord, "source" | "slug">): string {
	const { source, slug } = icon
	if (source !== "native") return getExternalIconPagePath({ source, slug })
	return `/icons/${slug}`
}

export function getVersionParent(slug: string, native: IconFile): string | undefined {
	if (!VERSION_SUFFIX.test(slug)) return undefined
	const parent = slug.replace(VERSION_SUFFIX, "")
	if (native[parent]) return parent
	return undefined
}

function brandPrefix(slug: string): string | undefined {
	return BRAND_PREFIXES.find((prefix) => slug === prefix || slug.startsWith(`${prefix}-`))
}

function addKey(map: Map<string, Set<IconRecord>>, key: string, icon: IconRecord): void {
	if (!key) return
	const records = map.get(key) ?? new Set<IconRecord>()
	records.add(icon)
	map.set(key, records)
}

function buildIndex(native: IconFile, external: ExternalIconRecord[]): RelationIndex {
	const index: RelationIndex = { primary: new Map(), versions: new Map(), brands: new Map() }
	const icons: IconRecord[] = [
		...Object.entries(native).map(([slug, data]) => ({ source: "native" as const, slug, name: slug, data })),
		...external,
	]
	for (const icon of icons) {
		addKey(index.primary, normalizeName(icon.slug), icon)
		addKey(index.primary, normalizeName(icon.name), icon)
		if (icon.source === "native") {
			const parent = getVersionParent(icon.slug, native) ?? icon.slug
			const versions = index.versions.get(parent) ?? []
			versions.push(icon)
			index.versions.set(parent, versions)
		}
		const brand = brandPrefix(icon.slug)
		if (brand) {
			const brands = index.brands.get(brand) ?? []
			brands.push(icon)
			index.brands.set(brand, brands)
		}
	}
	return index
}

async function getRelationIndex(): Promise<{ index: RelationIndex; native: IconFile }> {
	const [native, external] = await Promise.all([getAllIcons(), getExternalIcons()])
	if (!cachedIndex || cachedIndex.native !== native || cachedIndex.external !== external) {
		cachedIndex = { native, external, index: buildIndex(native, external) }
	}
	return { index: cachedIndex.index, native }
}

export async function getIconRelations(icon: IconRecord): Promise<IconRelations> {
	const { index, native } = await getRelationIndex()
	const matches = new Set<IconRecord>()
	for (const key of new Set([normalizeName(icon.slug), normalizeName(icon.name)])) {
		for (const match of index.primary.get(key) ?? []) matches.add(match)
	}
	const sameBrand = [...matches]
		.filter((match) => match.source !== icon.source)
		.sort((a, b) => {
			if (a.source === "native" && b.source !== "native") return -1
			if (b.source === "native" && a.source !== "native") return 1
			return getIconPagePath(a).localeCompare(getIconPagePath(b))
		})
	let versions: IconRecord[] = []
	if (icon.source === "native") {
		const parent = getVersionParent(icon.slug, native) ?? icon.slug
		versions = (index.versions.get(parent) ?? [])
			.filter((match) => match.slug !== icon.slug)
			.sort((a, b) => {
				if (a.slug === parent) return -1
				if (b.slug === parent) return 1
				return a.slug.localeCompare(b.slug)
			})
	}
	const excluded = new Set([getIconPagePath(icon), ...sameBrand.map(getIconPagePath), ...versions.map(getIconPagePath)])
	const brand = brandPrefix(icon.slug)
	let relatedByName: IconRecord[] = []
	if (!icon.data.categories.length && brand) {
		relatedByName = (index.brands.get(brand) ?? [])
			.filter((match) => !excluded.has(getIconPagePath(match)))
			.sort((a, b) => getIconPagePath(a).localeCompare(getIconPagePath(b)))
			.slice(0, MAX_RELATED_BY_NAME)
	}
	return { sameBrand, versions, relatedByName }
}
