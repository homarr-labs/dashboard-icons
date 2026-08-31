import fs from "node:fs"
import path from "node:path"
import PocketBase from "pocketbase"
import { isBlacklistedIcon } from "./icon-blacklist"

type SelfhstIndexRow = {
	Name?: string
	Reference?: string
	SVG?: string
	PNG?: string
	WebP?: string
	Light?: string
	Dark?: string
	Category?: string
	Tags?: string
	CreatedAt?: string
}

type SelfhstConsolidatedRow = [
	name?: string,
	reference?: string,
	svg?: string,
	png?: string,
	webp?: string,
	light?: string,
	dark?: string,
	category?: string,
	tags?: string,
]

const SOURCE = "selfhst"
const ATTRIBUTION = "Icons by selfh.st/icons (CC BY 4.0)"
const LICENSE = "CC BY 4.0"
const SOURCE_URL = "https://selfh.st/icons/"
const CDN_BASE = "https://cdn.jsdelivr.net/gh/selfhst/icons"

function readJson<T>(relativePath: string): T {
	const filePath = path.join(process.cwd(), relativePath)
	return JSON.parse(fs.readFileSync(filePath, "utf8")) as T
}

function isYes(value: unknown): boolean {
	if (typeof value !== "string") return false
	return ["yes", "y", "true", "1"].includes(value.trim().toLowerCase())
}

function normalizeCategory(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function splitList(value: unknown): string[] {
	if (typeof value !== "string") return []
	return value
		.split(/[;,]/)
		.map((item) => item.trim())
		.filter(Boolean)
}

function normalizeDate(value: unknown): string | null {
	if (typeof value !== "string" || !value.trim()) return null
	const normalized = value.trim().replace(" ", "T")
	const date = new Date(normalized)
	if (Number.isNaN(date.getTime())) return null
	return date.toISOString()
}

function template(format: string, suffix = ""): string {
	return `${CDN_BASE}/${format}/{slug}${suffix}.${format}`
}

function buildUrlTemplates(formats: string[], variants: { light: boolean; dark: boolean }) {
	const entries: [string, string][] = formats.map((format) => [format, template(format)])

	for (const format of formats) {
		if (variants.light) entries.push([`${format}_light`, template(format, "-light")])
		if (variants.dark) entries.push([`${format}_dark`, template(format, "-dark")])
	}

	return Object.fromEntries(entries)
}

function toRecord(row: SelfhstIndexRow) {
	const slug = row.Reference?.trim()
	if (!slug) return null

	const formats = [
		...(isYes(row.SVG) ? ["svg"] : []),
		...(isYes(row.PNG) ? ["png"] : []),
		...(isYes(row.WebP) ? ["webp"] : []),
	]
	const variants = {
		light: isYes(row.Light),
		dark: isYes(row.Dark),
	}
	const categories = Array.from(
		new Set([row.Category, ...splitList(row.Tags)].filter((value): value is string => Boolean(value)).map(normalizeCategory).filter(Boolean)),
	)

	return {
		source: SOURCE,
		slug,
		name: row.Name?.trim() || slug,
		aliases: [],
		categories,
		formats,
		variants,
		url_templates: buildUrlTemplates(formats, variants),
		license: LICENSE,
		attribution: ATTRIBUTION,
		source_url: SOURCE_URL,
		updated_at_source: normalizeDate(row.CreatedAt),
	}
}

function consolidatedToIndexRow(row: SelfhstConsolidatedRow, createdAt?: string): SelfhstIndexRow {
	return {
		Name: row[0],
		Reference: row[1],
		SVG: row[2],
		PNG: row[3],
		WebP: row[4],
		Light: row[5],
		Dark: row[6],
		Category: row[7],
		Tags: row[8],
		CreatedAt: createdAt,
	}
}

async function main() {
	const adminEmail = process.env.PB_ADMIN
	const adminPassword = process.env.PB_ADMIN_PASS
	if (!adminEmail || !adminPassword) {
		throw new Error("PB_ADMIN and PB_ADMIN_PASS are required")
	}

	const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.PB_URL || "http://127.0.0.1:8090"
	const pb = new PocketBase(pbUrl)
	await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)

	const indexRows = readJson<SelfhstIndexRow[]>("data/sources/selfhst/index.json")
	const consolidatedRows = readJson<SelfhstConsolidatedRow[]>("data/sources/selfhst/index-consolidated.json")
	const createdAtBySlug = new Map(indexRows.map((row) => [row.Reference, row.CreatedAt]))

	// Pre-fetch all existing records for this source to avoid N+1 lookups
	const existingRecords = await pb.collection("external_icons").getFullList({
		filter: pb.filter("source = {:source}", { source: SOURCE }),
		fields: "id,slug",
		requestKey: null,
	})
	let created = 0
	let updated = 0
	let skipped = 0
	let removed = 0
	const existingBySlug = new Map<string, string>()

	for (const record of existingRecords) {
		const slug = String(record.slug)
		if (isBlacklistedIcon(slug)) {
			await pb.collection("external_icons").delete(record.id)
			removed++
			continue
		}
		existingBySlug.set(slug, String(record.id))
	}

	for (const row of consolidatedRows) {
		const record = toRecord(consolidatedToIndexRow(row, createdAtBySlug.get(row[1])))
		if (!record || isBlacklistedIcon(record.slug)) {
			skipped++
			continue
		}

		const existingId = existingBySlug.get(record.slug)
		if (existingId) {
			await pb.collection("external_icons").update(existingId, record)
			updated++
		} else {
			await pb.collection("external_icons").create(record)
			created++
		}
	}

	console.log(`selfh.st import complete: ${created} created, ${updated} updated, ${removed} removed, ${skipped} skipped`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
