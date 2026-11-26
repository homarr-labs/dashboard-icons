import { getIconImageUrl } from "@/lib/icon-url"
import { filterAndSortIcons, normalizeForSearch } from "@/lib/icons/search"
import type { IconSearchEntry } from "@/types/icons"

export const MAX_SERVICE_ROWS = 100
export const MAX_SERVICE_NAME_LENGTH = 160

const MAX_PASTE_LENGTH = 32_000
const REPLACEMENT_LIMIT = 8
const RESOLUTION_SLICE_MS = 12

export type ServiceListCandidate = {
	icon: IconSearchEntry
	slug: string
	url: string
}

export type ServiceListRow = {
	id: number
	name: string
	candidate: ServiceListCandidate | null
	status: "pending" | "confirmed" | "skipped"
	statusBeforeSkip?: "pending" | "confirmed"
}

export type ServiceListAction = { type: "confirm" | "skip" | "undo-skip" | "reopen" } | { type: "select"; candidate: ServiceListCandidate }

function toCandidate(icon: IconSearchEntry): ServiceListCandidate | null {
	const slug = icon.slug ?? icon.name
	const url = getIconImageUrl(icon, slug)
	if (!/^https?:\/\//.test(url)) return null
	return { icon, slug, url }
}

function buildLookup(icons: IconSearchEntry[]) {
	const slugs = new Map<string, ServiceListCandidate>()
	const names = new Map<string, ServiceListCandidate>()
	const candidates = icons.flatMap((icon) => toCandidate(icon) ?? [])

	const remember = (key: string, candidate: ServiceListCandidate) => {
		if (key && !names.has(key)) names.set(key, candidate)
	}

	for (const candidate of candidates) {
		const slug = candidate.slug.toLowerCase()
		if (!slugs.has(slug)) slugs.set(slug, candidate)
		remember(normalizeForSearch(slug), candidate)
	}
	for (const candidate of candidates) {
		remember(normalizeForSearch(candidate.icon.name), candidate)
	}
	for (const candidate of candidates) {
		for (const alias of candidate.icon.data.aliases) {
			remember(normalizeForSearch(alias), candidate)
		}
	}
	return { slugs, names }
}

function suggestCandidate(name: string, lookup: ReturnType<typeof buildLookup>): ServiceListCandidate | null {
	const query = name.trim()
	const key = normalizeForSearch(query)
	const exact = lookup.slugs.get(query.toLowerCase()) ?? lookup.names.get(key)
	if (exact) return exact
	if (key.length < 4) return null

	// Restrict automatic suggestions to exact names, aliases, and strong name prefixes.
	// Reviewers can use the full search to find less obvious replacements.
	const nearby = new Set<IconSearchEntry>()
	for (const [name, candidate] of lookup.names) {
		if (name.startsWith(key) && name.length <= key.length + 8) nearby.add(candidate.icon)
	}
	const [best] = filterAndSortIcons({ icons: [...nearby], query, limit: 1 })
	if (best) return toCandidate(best)
	return null
}

export async function createReviewRows(input: string, icons: IconSearchEntry[], signal?: AbortSignal): Promise<ServiceListRow[]> {
	signal?.throwIfAborted()
	if (input.length > MAX_PASTE_LENGTH) throw new Error("The pasted list is too large. Paste a smaller list.")

	const names = input.split(/\r\n|\n|\r/).filter((name) => name.trim())
	if (names.length === 0) throw new Error("Enter at least one service name.")
	if (names.length > MAX_SERVICE_ROWS) throw new Error(`Paste up to ${MAX_SERVICE_ROWS} service names at a time.`)
	const longName = names.findIndex((name) => name.length > MAX_SERVICE_NAME_LENGTH)
	if (longName !== -1) {
		throw new Error(`Service ${longName + 1} must be ${MAX_SERVICE_NAME_LENGTH} characters or fewer.`)
	}

	const lookup = buildLookup(icons)
	const suggestions = new Map<string, ServiceListCandidate | null>()
	const rows: ServiceListRow[] = []
	let sliceStart = performance.now()
	for (const name of names) {
		if (performance.now() - sliceStart > RESOLUTION_SLICE_MS) {
			await new Promise<void>((resolve) => setTimeout(resolve, 0))
			signal?.throwIfAborted()
			sliceStart = performance.now()
		}
		const key = name.trim().toLowerCase()
		if (!suggestions.has(key)) suggestions.set(key, suggestCandidate(name, lookup))
		rows.push({ id: rows.length, name, candidate: suggestions.get(key) ?? null, status: "pending" })
	}
	return rows
}

export function searchReplacementIcons(icons: IconSearchEntry[], input: string): ServiceListCandidate[] {
	const query = input.trim()
	const key = normalizeForSearch(query)
	if (!key || query.length > MAX_SERVICE_NAME_LENGTH) return []

	const exact = icons.filter((icon) => normalizeForSearch(icon.slug ?? icon.name) === key)
	const ranked = filterAndSortIcons({ icons, query, limit: REPLACEMENT_LIMIT })
	return [...new Set([...exact, ...ranked])].flatMap((icon) => toCandidate(icon) ?? []).slice(0, REPLACEMENT_LIMIT)
}

export function updateReviewRow(row: ServiceListRow, action: ServiceListAction): ServiceListRow {
	switch (action.type) {
		case "confirm":
			if (row.status === "pending" && row.candidate) return { ...row, status: "confirmed" }
			break
		case "skip":
			if (row.status !== "skipped") return { ...row, status: "skipped", statusBeforeSkip: row.status }
			break
		case "undo-skip":
			if (row.status === "skipped") return { ...row, status: row.statusBeforeSkip ?? "pending", statusBeforeSkip: undefined }
			break
		case "reopen":
			if (row.status === "confirmed") return { ...row, status: "pending" }
			break
		case "select":
			if (row.status !== "skipped") return { ...row, candidate: action.candidate, status: "pending" }
			break
	}
	return row
}

function tsvName(name: string): string {
	if (name.includes("\t") || name.includes('"')) return `"${name.replaceAll('"', '""')}"`
	return name
}

export function buildReviewTsv(rows: ServiceListRow[]): string {
	const lines: string[] = []
	for (const row of rows) {
		if (row.status === "confirmed" && row.candidate) lines.push(`${tsvName(row.name)}\t${row.candidate.url}`)
	}
	return lines.join("\n")
}
