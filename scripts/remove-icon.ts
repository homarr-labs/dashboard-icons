#!/usr/bin/env bun

// Removes an icon from the collection after a takedown request (e.g. DMCA).
// Replaces every asset with a neutral placeholder so existing direct links
// remain valid, removes the icon from metadata.json / tree.json and meta/,
// and records the removal in takedowns.json (the public removal ledger).

import { rm } from "node:fs/promises"
import path from "node:path"

const PB_URL = process.env.PB_URL
const PB_ADMIN_TOKEN = process.env.PB_ADMIN_TOKEN
const ROOT_DIR = process.cwd()
const METADATA_PATH = path.resolve(ROOT_DIR, "metadata.json")
const TREE_PATH = path.resolve(ROOT_DIR, "tree.json")
const TAKEDOWNS_PATH = path.resolve(ROOT_DIR, "takedowns.json")
const PLACEHOLDER_DIR = path.resolve(ROOT_DIR, "assets", "placeholder")
const FORMAT_DIRS = ["svg", "png", "webp"]

interface TakedownRecord {
	id: string
	icon: string
	reason?: string
	requester_name?: string
	description?: string
	status: string
}

interface MetadataEntry {
	base?: string
	aliases?: string[]
	categories?: string[]
	colors?: { light?: string; dark?: string }
	wordmark?: { light?: string; dark?: string }
}

interface Args {
	takedownId: string
	dryRun: boolean
	commitMessagePath?: string
}

function parseArgs(argv: string[]): Args {
	let takedownId: string | undefined
	let dryRun = false
	let commitMessagePath: string | undefined
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === "--takedown-id" && argv[i + 1]) {
			takedownId = argv[++i]
		} else if (arg === "--dry-run") {
			dryRun = true
		} else if (arg === "--commit-message" && argv[i + 1]) {
			commitMessagePath = argv[++i]
		}
	}
	if (!takedownId) throw new Error("Missing required --takedown-id")
	return { takedownId, dryRun, commitMessagePath }
}

function requireEnv(name: string, value: string | undefined): string {
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value.replace(/\/+$/, "")
}

async function fetchTakedown(pbUrl: string, id: string): Promise<TakedownRecord> {
	const url = `${pbUrl}/api/collections/takedowns/records/${encodeURIComponent(id)}`
	console.log(`[remove-icon] Fetching takedown from ${url}`)
	const res = await fetch(url, { headers: { Authorization: PB_ADMIN_TOKEN ?? "" } })
	if (!res.ok) {
		const body = await res.text()
		console.error(`[remove-icon] fetch takedown failed: status=${res.status} body=${body}`)
		throw new Error(`Failed to fetch takedown ${id}: ${res.status} ${body}`)
	}
	return (await res.json()) as TakedownRecord
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
	const file = Bun.file(filePath)
	if (!(await file.exists())) return fallback
	const raw = await file.text()
	if (!raw.trim()) return fallback
	return JSON.parse(raw) as T
}

async function writeJson(filePath: string, data: unknown) {
	await Bun.write(filePath, `${JSON.stringify(data, null, 4)}\n`)
}

async function exists(filePath: string): Promise<boolean> {
	return Bun.file(filePath).exists()
}

async function copyPlaceholder(destPath: string, ext: string) {
	const source = path.join(PLACEHOLDER_DIR, `removed.${ext}`)
	if (!(await exists(source))) {
		console.warn(`[remove-icon] Placeholder template missing: ${source}`)
		return
	}
	await Bun.write(destPath, await Bun.file(source).arrayBuffer())
}

function buildAssetBases(icon: string, entry: MetadataEntry | undefined): string[] {
	const names = new Set<string>([icon])
	if (entry) {
		for (const value of [entry.colors?.light, entry.colors?.dark, entry.wordmark?.light, entry.wordmark?.dark]) {
			if (value) names.add(value)
		}
	}
	return [...names]
}

async function removeIcon(takedown: TakedownRecord, dryRun: boolean) {
	const icon = takedown.icon
	if (!/^[a-z0-9][a-z0-9-]*$/.test(icon)) throw new Error(`Invalid icon name: ${icon}`)
	console.log(`[remove-icon] Removing "${icon}" dryRun=${dryRun}`)

	const metadata = await readJson<Record<string, MetadataEntry>>(METADATA_PATH, {})
	const entry = metadata[icon]

	// 1. Replace every asset (base + variants, all formats) with a placeholder.
	for (const base of buildAssetBases(icon, entry)) {
		for (const dir of FORMAT_DIRS) {
			const target = path.join(ROOT_DIR, dir, `${base}.${dir}`)
			if (!(await exists(target))) continue
			if (dryRun) {
				console.log(`[dry-run] Would replace ${target} with placeholder`)
				continue
			}
			await copyPlaceholder(target, dir)
			console.log(`Replaced ${target} with placeholder`)
		}
	}

	// 2. Drop the icon from the metadata catalogue.
	if (!metadata[icon]) {
		console.log(`[remove-icon] "${icon}" not present in metadata.json`)
	} else if (!dryRun) {
		delete metadata[icon]
		await writeJson(METADATA_PATH, metadata)
		console.log(`Removed "${icon}" from metadata.json`)
	}

	// 3. Drop the per-icon meta file and its tree.json entry.
	const metaFile = path.join(ROOT_DIR, "meta", `${icon}.json`)
	if (await exists(metaFile)) {
		if (!dryRun) {
			await rm(metaFile)
			console.log(`Deleted ${metaFile}`)
		} else {
			console.log(`[dry-run] Would delete ${metaFile}`)
		}
	}
	const tree = await readJson<Record<string, string[]>>(TREE_PATH, {})
	if (Array.isArray(tree.meta) && tree.meta.includes(`${icon}.json`)) {
		if (!dryRun) {
			tree.meta = tree.meta.filter((name) => name !== `${icon}.json`)
			await writeJson(TREE_PATH, tree)
			console.log(`Removed "${icon}.json" from tree.json`)
		} else {
			console.log(`[dry-run] Would remove "${icon}.json" from tree.json`)
		}
	}

	// 4. Record the removal in the public takedown ledger.
	const ledger = await readJson<Record<string, unknown>>(TAKEDOWNS_PATH, {})
	ledger[icon] = {
		icon,
		reason: takedown.reason || "Takedown request",
		requester_name: takedown.requester_name || "",
		description: takedown.description || "",
		takedown_id: takedown.id,
		date: new Date().toISOString(),
	}
	if (!dryRun) {
		await writeJson(TAKEDOWNS_PATH, ledger)
		console.log(`Recorded takedown of "${icon}" in takedowns.json`)
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const pbUrl = requireEnv("PB_URL", PB_URL)
	requireEnv("PB_ADMIN_TOKEN", PB_ADMIN_TOKEN)

	console.log(`[remove-icon] Starting takedownId=${args.takedownId} dryRun=${args.dryRun} rootDir=${ROOT_DIR}`)
	const takedown = await fetchTakedown(pbUrl, args.takedownId)

	await removeIcon(takedown, args.dryRun)

	if (args.commitMessagePath) {
		const subject = `remove icon "${takedown.icon.replace(/[\r\n]+/g, " ").trim()}" due to takedown request (takedown ${takedown.id})`
		await Bun.write(args.commitMessagePath, `${subject}\n`)
	}
	console.log("Removal completed.")
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
