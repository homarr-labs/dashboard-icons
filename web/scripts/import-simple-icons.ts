import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import PocketBase from "pocketbase"

const SOURCE = "simpleicons"
const DISCLAIMER_URL = "https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md"
const DEFAULT_MANIFEST = "data/sources/simpleicons/simple-icons.json"
const IMPORT_SCHEMA_VERSION = 2

type DuplicateAlias = {
	title?: string
	hex?: string
	loc?: Record<string, string>
}

type SimpleIconAliases = {
	aka?: string[]
	dup?: Array<string | DuplicateAlias>
	loc?: Record<string, string>
	old?: string[]
}

export type SimpleIconData = {
	title: string
	slug: string
	hex: string
	source: string
	guidelines?: string
	license?: { type?: string; url?: string }
	aliases?: SimpleIconAliases
}

type BuildOptions = {
	version?: string
	publishedAt?: string | null
}

function normalizeAlias(value: string): string {
	return value.trim()
}

function collectAliases(icon: SimpleIconData): string[] {
	const aliases = icon.aliases
	if (!aliases) return []

	const values = [
		...(aliases.aka ?? []),
		...Object.values(aliases.loc ?? {}),
		...(aliases.old ?? []),
		...(aliases.dup ?? []).flatMap((duplicate) => {
			if (typeof duplicate === "string") return [duplicate]
			return [duplicate.title, ...Object.values(duplicate.loc ?? {})].filter((value): value is string => Boolean(value))
		}),
	]
	const excluded = new Set([icon.title.toLocaleLowerCase(), icon.slug.toLocaleLowerCase()])
	const seen = new Set<string>()

	return values
		.map(normalizeAlias)
		.filter(Boolean)
		.filter((value) => {
			const key = value.toLocaleLowerCase()
			if (excluded.has(key) || seen.has(key)) return false
			seen.add(key)
			return true
		})
}

function validateIcon(icon: SimpleIconData): void {
	if (!icon.title?.trim() || !icon.slug?.trim() || !icon.source?.trim()) {
		throw new Error(`Invalid Simple Icons entry: ${JSON.stringify(icon)}`)
	}
	if (!/^[0-9A-F]{6}$/i.test(icon.hex)) {
		throw new Error(`Invalid brand color for ${icon.slug}: ${icon.hex}`)
	}
}

export function buildSimpleIconRecords(
	upstreamIcons: SimpleIconData[],
	excludedSlugs: Set<string>,
	options: BuildOptions = {},
) {
	const normalizedExcluded = new Set(Array.from(excludedSlugs, (slug) => slug.toLocaleLowerCase()))
	const seen = new Set<string>()
	const version = options.version ?? "latest"

	return upstreamIcons.flatMap((icon) => {
		validateIcon(icon)
		const slug = icon.slug.toLocaleLowerCase()
		if (normalizedExcluded.has(slug) || seen.has(slug)) return []
		seen.add(slug)
		const license = icon.license?.type || ""
		const attribution = license
			? `${icon.title.trim()} icon by Simple Icons (${license}). Brand marks remain subject to their owners' terms.`
			: `${icon.title.trim()} icon via Simple Icons. Brand marks remain subject to their owners' terms.`

		return [{
			source: SOURCE,
			slug,
			name: icon.title.trim(),
			aliases: collectAliases(icon),
			categories: [],
			formats: ["svg", "png"],
			variants: { light: true, dark: true },
			url_templates: {
				svg: "https://cdn.simpleicons.org/{slug}/{hex}",
				svg_auto: "https://cdn.simpleicons.org/{slug}/000000/FFFFFF",
				svg_light: "https://cdn.simpleicons.org/{slug}/000000",
				svg_dark: "https://cdn.simpleicons.org/{slug}/FFFFFF",
				png: "/api/icons/external/simpleicons/{slug}/brand.png",
				png_light: "/api/icons/external/simpleicons/{slug}/light.png",
				png_dark: "/api/icons/external/simpleicons/{slug}/dark.png",
			},
			brand_color: icon.hex.toUpperCase(),
			license,
			license_url: icon.license?.url || "",
			attribution,
			source_url: icon.source,
			guidelines_url: icon.guidelines || "",
			stable_svg_url: `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`,
			upstream_version: version,
			upstream_data: {
				import_schema_version: IMPORT_SCHEMA_VERSION,
				aliases: icon.aliases ?? {},
				disclaimer_url: DISCLAIMER_URL,
			},
			updated_at_source: options.publishedAt ?? null,
		}]
	})
}

function parseArgs() {
	return process.argv.slice(2).reduce(
		(flags, arg) => {
			if (arg === "--dry-run") flags.dryRun = true
			if (arg === "--purge") flags.purge = true
			if (arg.startsWith("--manifest=")) flags.manifest = arg.slice("--manifest=".length)
			if (arg.startsWith("--version=")) flags.version = arg.slice("--version=".length)
			if (arg.startsWith("--published-at=")) flags.publishedAt = arg.slice("--published-at=".length)
			return flags
		},
		{ dryRun: false, purge: false, manifest: DEFAULT_MANIFEST, version: process.env.SIMPLE_ICONS_VERSION ?? "latest", publishedAt: process.env.SIMPLE_ICONS_PUBLISHED_AT ?? null } as {
			dryRun: boolean
			purge: boolean
			manifest: string
			version: string
			publishedAt: string | null
		},
	)
}

function readManifest(manifestPath: string): SimpleIconData[] {
	const absolutePath = path.resolve(process.cwd(), manifestPath)
	const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as unknown
	if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Simple Icons manifest must be a non-empty array")
	return parsed as SimpleIconData[]
}

function readNativeSlugs(): Set<string> {
	const metadataPath = path.resolve(process.cwd(), "../metadata.json")
	const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as Record<string, unknown>
	return new Set(Object.keys(metadata).map((slug) => slug.toLocaleLowerCase()))
}

async function main() {
	const flags = parseArgs()
	const adminEmail = process.env.PB_ADMIN
	const adminPassword = process.env.PB_ADMIN_PASS
	if (!adminEmail || !adminPassword) throw new Error("PB_ADMIN and PB_ADMIN_PASS are required")

	const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.PB_URL || "http://127.0.0.1:8090"
	const pb = new PocketBase(pbUrl)
	await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)

	const current = await pb.collection("external_icons").getFullList({
		fields: "id,source,slug,upstream_version,upstream_data,updated_at_source",
		requestKey: null,
	})
	const currentSimpleIcons = current.filter((record) => record.source === SOURCE)

	if (flags.purge) {
		for (const record of currentSimpleIcons) {
			if (!flags.dryRun) await pb.collection("external_icons").delete(record.id)
		}
		console.log(`${flags.dryRun ? "Would remove" : "Removed"} ${currentSimpleIcons.length} Simple Icons records`)
		return
	}

	const excludedSlugs = readNativeSlugs()
	for (const record of current) {
		if (record.source !== SOURCE) excludedSlugs.add(String(record.slug).toLocaleLowerCase())
	}

	const upstream = readManifest(flags.manifest)
	const records = buildSimpleIconRecords(upstream, excludedSlugs, { version: flags.version, publishedAt: flags.publishedAt })
	const existingBySlug = new Map(currentSimpleIcons.map((record) => [String(record.slug), String(record.id)]))
	const targetSlugs = new Set(records.map((record) => record.slug))
	const expectedPublishedAt = flags.publishedAt ? new Date(flags.publishedAt).getTime() : null
	const isAlreadyCurrent =
		currentSimpleIcons.length === records.length &&
		currentSimpleIcons.every(
			(record) =>
				record.upstream_version === flags.version &&
				record.upstream_data?.import_schema_version === IMPORT_SCHEMA_VERSION &&
				targetSlugs.has(String(record.slug)) &&
				(expectedPublishedAt === null || new Date(String(record.updated_at_source)).getTime() === expectedPublishedAt),
		)
	if (isAlreadyCurrent) {
		console.log(`Simple Icons ${flags.version} is already current: ${records.length} records, ${upstream.length - records.length} duplicates skipped`)
		return
	}
	const importedSlugs = new Set<string>()
	let created = 0
	let updated = 0
	let removed = 0

	for (const record of records) {
		importedSlugs.add(record.slug)
		const existingId = existingBySlug.get(record.slug)
		if (!flags.dryRun) {
			if (existingId) await pb.collection("external_icons").update(existingId, record)
			else await pb.collection("external_icons").create(record)
		}
		existingId ? updated++ : created++
	}

	for (const [slug, id] of existingBySlug) {
		if (importedSlugs.has(slug)) continue
		if (!flags.dryRun) await pb.collection("external_icons").delete(id)
		removed++
	}

	const skippedDuplicates = upstream.length - records.length
	console.log(
		`Simple Icons ${flags.version} sync: ${created} created, ${updated} updated, ${removed} removed, ${skippedDuplicates} duplicates skipped${flags.dryRun ? " (dry run)" : ""}`,
	)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ""
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error)
		process.exit(1)
	})
}
