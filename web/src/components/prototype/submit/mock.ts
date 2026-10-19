// PROTOTYPE: in-memory Submission → Icons → Variants model, filename grouping, nudges and demo files shared by /submit?variant=A..D.
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"

export type Tone = "colour" | "light" | "dark"
export const TONES: Tone[] = ["colour", "light", "dark"]
export const WELL_KNOWN_FORMS = ["icon", "wordmark"]
export const SUGGESTED_CUSTOM_FORMS = ["animated", "mono", "outline", "3d"]
export const CATEGORIES = SUBMISSION_CATEGORIES
export const MAX_FILE_SIZE = 5 * 1024 * 1024

export type DraftVariant = { id: string; form: string; tone: Tone; file: File; url: string }
export type IconMeta = { aliases: string[]; categories: string[]; description: string }
export type DraftIcon = { id: string; slug: string; inheritMeta: boolean; meta: IconMeta; variants: DraftVariant[] }
export type Draft = { icons: DraftIcon[]; shared: IconMeta }

export type Existing = { kind: "collection" } | { kind: "pending"; submissionId: string; by: string }
const EXISTING: Record<string, Existing> = {
	github: { kind: "collection" },
	plex: { kind: "collection" },
	proxmox: { kind: "collection" },
	pdf: { kind: "collection" },
	"self-host": { kind: "pending", submissionId: "k3x9p2", by: "@selfhoster42" },
}
export const STUB_USER = { id: "proto-user", username: "prototype-user", email: "proto@example.invalid" }

export function lookupExisting(slug: string): Existing | null {
	return EXISTING[slug] ?? null
}

export function existingSlugs() {
	return Object.keys(EXISTING)
}

let seq = 0
export const uid = (p: string) => `${p}${++seq}`

export const emptyMeta = (): IconMeta => ({ aliases: [], categories: [], description: "" })
export const emptyDraft = (): Draft => ({ icons: [], shared: emptyMeta() })

export function sanitizeSlug(input: string) {
	return input
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
}

const TONE_TOKENS: Record<string, Tone> = { light: "light", white: "light", dark: "dark", black: "dark" }
const FORM_TOKENS: Record<string, string> = { wordmark: "wordmark", text: "wordmark", logo: "wordmark" }

export type Parsed = { slug: string; form: string; tone: Tone; tokens: string[] }

export function parseStem(stem: string): Parsed {
	const parts = sanitizeSlug(stem).split("-").filter(Boolean)
	let tone: Tone = "colour"
	let form = "icon"
	const tokens: string[] = []
	while (parts.length > 1) {
		const last = parts[parts.length - 1]
		if (tone === "colour" && TONE_TOKENS[last]) {
			tone = TONE_TOKENS[last]
		} else if (form === "icon" && FORM_TOKENS[last]) {
			form = FORM_TOKENS[last]
		} else if (form === "icon" && SUGGESTED_CUSTOM_FORMS.includes(last)) {
			form = last
		} else break
		tokens.unshift(last)
		parts.pop()
	}
	return { slug: parts.join("-"), form, tone, tokens }
}

export function stemOf(name: string) {
	return name.replace(/\.[^.]+$/, "")
}
export function extOf(name: string) {
	return name.split(".").pop()?.toLowerCase() || "svg"
}

export function variantKey(form: string, tone: Tone) {
	return [form !== "icon" && form, tone !== "colour" && tone].filter(Boolean).join("-") || "base"
}

export function targetFilename(slug: string, v: Pick<DraftVariant, "form" | "tone" | "file">) {
	const key = variantKey(v.form, v.tone)
	return `${slug || "unnamed"}${key === "base" ? "" : `-${key}`}.${extOf(v.file.name)}`
}

export function toneLabel(tone: Tone) {
	if (tone === "light") return "Light · for dark backgrounds"
	if (tone === "dark") return "Dark · for light backgrounds"
	return "Colour · any background"
}
export function toneShort(tone: Tone) {
	if (tone === "light") return "on dark bg"
	if (tone === "dark") return "on light bg"
	return "colour"
}
export function formLabel(f: string) {
	if (f === "icon") return "Icon"
	if (f === "wordmark") return "Wordmark"
	return f.charAt(0).toUpperCase() + f.slice(1)
}
export function variantLabel(v: Pick<DraftVariant, "form" | "tone">) {
	if (variantKey(v.form, v.tone) === "base") return "Base"
	if (v.form === "icon") return formLabel(v.tone)
	return [formLabel(v.form), v.tone !== "colour" && v.tone].filter(Boolean).join(" ")
}

export function makeVariant(file: File, f: string, tone: Tone): DraftVariant {
	return { id: uid("v"), form: f, tone, file, url: URL.createObjectURL(file) }
}

export function makeIcon(slug: string, variants: DraftVariant[] = []): DraftIcon {
	return { id: uid("i"), slug, inheritMeta: true, meta: emptyMeta(), variants }
}

export function acceptFiles(files: File[]) {
	return files.filter((f) => /\.(svg|png)$/i.test(f.name) && f.size <= MAX_FILE_SIZE)
}

export function addFiles(d: Draft, files: File[], group = true): Draft {
	const icons = d.icons.map((i) => ({ ...i, variants: [...i.variants] }))
	for (const file of acceptFiles(files)) {
		const stem = stemOf(file.name)
		const p = group ? parseStem(stem) : { slug: sanitizeSlug(stem), form: "icon", tone: "colour" as Tone, tokens: [] }
		let icon = icons.find((i) => i.slug === p.slug)
		if (!icon) {
			icon = makeIcon(p.slug)
			icons.push(icon)
		}
		icon.variants.push(makeVariant(file, p.form, p.tone))
	}
	return { ...d, icons }
}

export function addFilesToIcon(d: Draft, iconId: string, files: File[]): Draft {
	return mapIcon(d, iconId, (i) => ({
		...i,
		variants: [
			...i.variants,
			...acceptFiles(files).map((f) => {
				const p = parseStem(stemOf(f.name))
				return makeVariant(f, p.form, p.tone)
			}),
		],
	}))
}

function mapIcon(d: Draft, iconId: string, fn: (i: DraftIcon) => DraftIcon): Draft {
	return { ...d, icons: d.icons.map((i) => (i.id === iconId ? fn(i) : i)) }
}

export function findVariant(d: Draft, vid: string) {
	for (const icon of d.icons) {
		const v = icon.variants.find((x) => x.id === vid)
		if (v) return { icon, v }
	}
	return null
}

export function setVariantKind(d: Draft, vid: string, f: string, tone: Tone): Draft {
	return { ...d, icons: d.icons.map((i) => ({ ...i, variants: i.variants.map((v) => (v.id === vid ? { ...v, form: f, tone } : v)) })) }
}

export function removeVariant(d: Draft, vid: string): Draft {
	return { ...d, icons: d.icons.map((i) => ({ ...i, variants: i.variants.filter((v) => v.id !== vid) })) }
}

export function moveVariant(d: Draft, vid: string, toIconId: string, f?: string, tone?: Tone): Draft {
	const found = findVariant(d, vid)
	if (!found) return d
	const moved = { ...found.v, form: f ?? found.v.form, tone: tone ?? found.v.tone }
	const without = removeVariant(d, vid)
	const replaced = {
		...without,
		icons: without.icons.map((i) =>
			i.id === toIconId ? { ...i, variants: i.variants.filter((v) => !(v.form === moved.form && v.tone === moved.tone)) } : i,
		),
	}
	return mapIcon(replaced, toIconId, (i) => ({ ...i, variants: [...i.variants, moved] }))
}

export function variantToNewIcon(d: Draft, vid: string): Draft {
	const found = findVariant(d, vid)
	if (!found) return d
	const without = removeVariant(d, vid)
	const slug = sanitizeSlug(stemOf(found.v.file.name))
	return { ...without, icons: [...without.icons, makeIcon(slug, [{ ...found.v, form: "icon", tone: "colour" }])] }
}

export function setSlotFile(d: Draft, iconId: string, f: string, tone: Tone, file: File): Draft {
	return mapIcon(d, iconId, (i) => ({
		...i,
		variants: [...i.variants.filter((v) => !(v.form === f && v.tone === tone)), makeVariant(file, f, tone)],
	}))
}

export function addIcon(d: Draft, slug = ""): Draft {
	return { ...d, icons: [...d.icons, makeIcon(slug)] }
}
export function removeIcon(d: Draft, iconId: string): Draft {
	return { ...d, icons: d.icons.filter((i) => i.id !== iconId) }
}
export function renameIcon(d: Draft, iconId: string, slug: string): Draft {
	return mapIcon(d, iconId, (i) => ({ ...i, slug: sanitizeSlug(slug) }))
}
export function setIconMeta(d: Draft, iconId: string, patch: Partial<IconMeta>, inheritMeta?: boolean): Draft {
	return mapIcon(d, iconId, (i) => ({ ...i, meta: { ...i.meta, ...patch }, inheritMeta: inheritMeta ?? i.inheritMeta }))
}
export function setShared(d: Draft, patch: Partial<IconMeta>): Draft {
	return { ...d, shared: { ...d.shared, ...patch } }
}
export function effectiveMeta(d: Draft, icon: DraftIcon): IconMeta {
	if (!icon.inheritMeta) return icon.meta
	return {
		aliases: icon.meta.aliases,
		categories: [...new Set([...d.shared.categories, ...icon.meta.categories])],
		description: icon.meta.description || d.shared.description,
	}
}

export function mergeIcon(d: Draft, fromId: string, intoId: string, f: string, tone: Tone): Draft {
	const from = d.icons.find((i) => i.id === fromId)
	if (!from) return d
	let next = removeIcon(d, fromId)
	for (const v of from.variants) {
		const nf = v.form === "icon" ? f : v.form
		const nt = v.tone === "colour" ? tone : v.tone
		next = mapIcon(next, intoId, (i) => ({ ...i, variants: [...i.variants, { ...v, form: nf, tone: nt }] }))
	}
	return next
}

export function splitForm(d: Draft, iconId: string, f: string): Draft {
	const icon = d.icons.find((i) => i.id === iconId)
	if (!icon) return d
	const moving = icon.variants.filter((v) => v.form === f)
	const kept = mapIcon(d, iconId, (i) => ({ ...i, variants: i.variants.filter((v) => v.form !== f) }))
	return {
		...kept,
		icons: [
			...kept.icons,
			makeIcon(
				`${icon.slug}-${f}`,
				moving.map((v) => ({ ...v, form: "icon" })),
			),
		],
	}
}

export function formsOf(icon: DraftIcon) {
	const forms = new Set(["icon", ...icon.variants.map((v) => v.form)])
	return [...forms]
}

export type NudgeLevel = "error" | "warn" | "info"
export type Nudge = {
	id: string
	iconId: string
	level: NudgeLevel
	text: string
	actions: { label: string; apply: (d: Draft) => Draft }[]
}

export function nudges(d: Draft): Nudge[] {
	const out: Nudge[] = []
	const bySlug = new Map(d.icons.map((i) => [i.slug, i]))
	for (const icon of d.icons) {
		const label = icon.slug || "Unnamed icon"
		if (!icon.slug)
			out.push({ id: `${icon.id}-noname`, iconId: icon.id, level: "error", text: "Give this icon a name (its slug).", actions: [] })
		if (!icon.variants.some((v) => v.form === "icon" && v.tone === "colour"))
			out.push({
				id: `${icon.id}-nobase`,
				iconId: icon.id,
				level: "error",
				text: `${label} has no Base (colour icon) — every icon needs one.`,
				actions: [],
			})
		const seen = new Map<string, DraftVariant>()
		for (const v of icon.variants) {
			const key = variantKey(v.form, v.tone)
			const prev = seen.get(key)
			if (prev) {
				out.push({
					id: `${icon.id}-dup-${v.id}`,
					iconId: icon.id,
					level: "error",
					text: `${prev.file.name} and ${v.file.name} both become ${targetFilename(icon.slug, v)}. Keep one.`,
					actions: [
						{ label: `Keep ${prev.file.name}`, apply: (x) => removeVariant(x, v.id) },
						{ label: `Keep ${v.file.name}`, apply: (x) => removeVariant(x, prev.id) },
					],
				})
			} else seen.set(key, v)
		}
		const existing = lookupExisting(icon.slug)
		if (existing?.kind === "collection")
			out.push({
				id: `${icon.id}-exists`,
				iconId: icon.id,
				level: "info",
				text: `${icon.slug} already exists in the collection → this Icon becomes an update proposal.`,
				actions: [],
			})
		if (existing?.kind === "pending")
			out.push({
				id: `${icon.id}-pending`,
				iconId: icon.id,
				level: "warn",
				text: `${icon.slug} is pending in another submission (#${existing.submissionId} by ${existing.by}) → your files are proposed as an update to it.`,
				actions: [],
			})
		const parsed = parseStem(icon.slug)
		const host = parsed.slug !== icon.slug && bySlug.get(parsed.slug)
		if (host && host.id !== icon.id) {
			out.push({
				id: `${icon.id}-merge`,
				iconId: icon.id,
				level: "warn",
				text: `${icon.slug} looks like the ${variantLabel(parsed).toLowerCase()} variant of ${host.slug}. Merge?`,
				actions: [{ label: `Merge into ${host.slug}`, apply: (x) => mergeIcon(x, icon.id, host.id, parsed.form, parsed.tone) }],
			})
		} else {
			const prefixHost = d.icons.find((o) => o.id !== icon.id && o.slug && icon.slug.startsWith(`${o.slug}-`))
			if (prefixHost) {
				const rest = icon.slug.slice(prefixHost.slug.length + 1)
				out.push({
					id: `${icon.id}-prefix`,
					iconId: icon.id,
					level: "info",
					text: `${icon.slug} starts with ${prefixHost.slug}. A custom "${rest}" variant of it, or a separate icon?`,
					actions: [{ label: `Make it ${prefixHost.slug} · ${rest}`, apply: (x) => mergeIcon(x, icon.id, prefixHost.id, rest, "colour") }],
				})
			}
		}
		const twins = d.icons.filter((o) => o.slug && o.slug === icon.slug)
		if (twins.length > 1 && twins[0].id !== icon.id)
			out.push({
				id: `${icon.id}-twin`,
				iconId: icon.id,
				level: "error",
				text: `Two icons are named ${icon.slug}.`,
				actions: [{ label: "Merge them", apply: (x) => mergeIcon(x, icon.id, twins[0].id, "icon", "colour") }],
			})
	}
	return out
}

export function buildPayload(d: Draft) {
	return {
		submitter: STUB_USER.username,
		shared: d.shared,
		icons: d.icons.map((icon) => {
			const existing = lookupExisting(icon.slug)
			let intent: "new" | "update-collection" | "update-submission" = "new"
			if (existing?.kind === "collection") intent = "update-collection"
			if (existing?.kind === "pending") intent = "update-submission"
			return {
				slug: icon.slug,
				intent,
				target_submission: existing?.kind === "pending" ? existing.submissionId : undefined,
				metadata: effectiveMeta(d, icon),
				meta_source: icon.inheritMeta ? "shared+own" : "own",
				variants: icon.variants.map((v) => ({
					role: variantKey(v.form, v.tone),
					form: v.form,
					tone: v.tone,
					background: v.tone === "light" ? "dark" : v.tone === "dark" ? "light" : "any",
					source: v.file.name,
					target: targetFilename(icon.slug, v),
					bytes: v.file.size,
				})),
			}
		}),
	}
}

function glyph(label: string, fill: string, ink: string, animated: boolean) {
	const spin = animated
		? `<animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="3s" repeatCount="indefinite"/>`
		: ""
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g>${spin}<rect x="6" y="6" width="52" height="52" rx="14" fill="${fill}"/></g><text x="32" y="39" font-family="system-ui,sans-serif" font-size="${label.length > 3 ? 13 : 18}" font-weight="700" text-anchor="middle" fill="${ink}">${label}</text></svg>`
}

function svgFile(name: string, label: string, fill: string, ink: string, animated = false) {
	return new File([glyph(label, fill, ink, animated)], name, { type: "image/svg+xml" })
}

export function selfHostFiles() {
	const colour = ["#7c3aed", "#ffffff"]
	const light = ["#f4f4f5", "#18181b"]
	const dark = ["#18181b", "#f4f4f5"]
	return [
		svgFile("self-host.svg", "SH", colour[0], colour[1]),
		svgFile("self-host-light.svg", "SH", light[0], light[1]),
		svgFile("self-host-dark.svg", "SH", dark[0], dark[1]),
		svgFile("self-host-white.svg", "SH", "#ffffff", "#27272a"),
		svgFile("self-host-black.svg", "SH", "#000000", "#e4e4e7"),
		svgFile("self-host-animated.svg", "SH", colour[0], colour[1], true),
		svgFile("self-host-animated-dark.svg", "SH", dark[0], dark[1], true),
	]
}

const FILE_TYPES: [string, string, string][] = [
	["exe", "EXE", "#2563eb"],
	["msi", "MSI", "#0891b2"],
	["txt", "TXT", "#64748b"],
	["md", "MD", "#111827"],
	["pdf", "PDF", "#dc2626"],
	["csv", "CSV", "#16a34a"],
	["zip-archive", "ZIP", "#ca8a04"],
	["video", "VID", "#9333ea"],
	["music", "MUS", "#db2777"],
	["picture", "IMG", "#0d9488"],
	["bat-file", "BAT", "#4b5563"],
	["shell-file", "SH", "#15803d"],
]

export function fileTypeFiles() {
	return FILE_TYPES.map(([slug, label, fill]) => svgFile(`${slug}.svg`, label, fill, "#ffffff"))
}
