// PROTOTYPE pass 2: one Submission = one Icon; 6 well-known slots + custom variants; Modify = delta on an existing icon; mocks, filename parsing, validation, nudges, payloads.
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"

export const CATEGORIES = SUBMISSION_CATEGORIES
export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const STUB_USER = { id: "proto-user", username: "prototype-user" }

export type Mode = "one" | "modify" | "many"
export type Bg = "checker" | "dark" | "light"

export const SLOTS = [
	{ key: "base", title: "Base", hint: "Full-colour icon. Required.", bg: "checker" },
	{ key: "light", title: "Light", hint: "Light-coloured, for dark backgrounds", bg: "dark" },
	{ key: "dark", title: "Dark", hint: "Dark-coloured, for light backgrounds", bg: "light" },
	{ key: "wordmark", title: "Wordmark", hint: "Colour logo with the name", bg: "checker" },
	{ key: "wordmark-light", title: "Wordmark light", hint: "Light wordmark, for dark backgrounds", bg: "dark" },
	{ key: "wordmark-dark", title: "Wordmark dark", hint: "Dark wordmark, for light backgrounds", bg: "light" },
] as const satisfies readonly { key: string; title: string; hint: string; bg: Bg }[]
export type SlotKey = (typeof SLOTS)[number]["key"]
export const SLOT_KEYS: string[] = SLOTS.map((s) => s.key)

export const CUSTOM_SUGGESTIONS = ["4k", "animated", "animated-dark", "mono", "outline", "3d", "alt", "flat", "square", "beta"]
const RESERVED = [
	"base",
	"icon",
	"light",
	"dark",
	"white",
	"black",
	"wordmark",
	"wordmark-light",
	"wordmark-dark",
	"text",
	"logo",
	"colour",
	"color",
]

export function isWellKnown(key: string) {
	return SLOT_KEYS.includes(key)
}
export function slotTitle(key: string) {
	return SLOTS.find((s) => s.key === key)?.title ?? key
}
export function bgForKey(key: string): Bg {
	const slot = SLOTS.find((s) => s.key === key)
	if (slot) return slot.bg
	if (key.endsWith("-dark")) return "light"
	if (key.endsWith("-light")) return "dark"
	return "checker"
}
export function bgLabel(bg: Bg) {
	if (bg === "dark") return "on dark background"
	if (bg === "light") return "on light background"
	return "any background"
}

export type ExistingVariant = { key: string; url: string; filename: string }
export type ExistingIcon = {
	slug: string
	source: "collection" | "submission"
	status?: "pending" | "rejected"
	by?: string
	mine?: boolean
	submissionId?: string
	rejection?: string
	aliases: string[]
	categories: string[]
	variants: ExistingVariant[]
}

function glyph(label: string, fill: string, ink: string, shape: "square" | "diamond" = "square") {
	const body =
		shape === "diamond"
			? `<rect x="14" y="14" width="36" height="36" rx="8" fill="${fill}" transform="rotate(45 32 32)"/>`
			: `<rect x="6" y="6" width="52" height="52" rx="14" fill="${fill}"/>`
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}<text x="32" y="39" font-family="system-ui,sans-serif" font-size="${label.length > 3 ? 12 : 17}" font-weight="700" text-anchor="middle" fill="${ink}">${label}</text></svg>`
}
function dataUrl(svg: string) {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
const TONE = { base: ["#7c3aed", "#fff"], light: ["#f4f4f5", "#18181b"], dark: ["#18181b", "#f4f4f5"] }
function toneOf(key: string) {
	if (key === "light" || key.endsWith("-light")) return TONE.light
	if (key === "dark" || key.endsWith("-dark")) return TONE.dark
	return TONE.base
}
function existingVariants(slug: string, label: string, hue: string, keys: string[]): ExistingVariant[] {
	return keys.map((key) => {
		const [fill, ink] = key === "base" || key === "wordmark" ? [hue, "#fff"] : toneOf(key)
		const text = key.startsWith("wordmark") ? `${label}·` : key === "4k" ? "4K" : label
		return { key, filename: `${slug}${key === "base" ? "" : `-${key}`}.svg`, url: dataUrl(glyph(text, fill, ink)) }
	})
}

export const EXISTING: ExistingIcon[] = [
	{
		slug: "github",
		source: "collection",
		aliases: ["gh"],
		categories: ["development"],
		variants: existingVariants("github", "GH", "#24292f", ["base", "light", "dark", "wordmark"]),
	},
	{
		slug: "plex",
		source: "collection",
		aliases: [],
		categories: ["media"],
		variants: existingVariants("plex", "PX", "#e5a00d", ["base", "light", "dark"]),
	},
	{
		slug: "sonarr",
		source: "collection",
		aliases: ["sonarr v4"],
		categories: ["media"],
		variants: existingVariants("sonarr", "SO", "#35c5f4", ["base", "light", "dark"]),
	},
	{
		slug: "proton",
		source: "collection",
		aliases: [],
		categories: ["security"],
		variants: existingVariants("proton", "PR", "#6d4aff", ["base"]),
	},
	{
		slug: "proton-mail",
		source: "collection",
		aliases: [],
		categories: ["social"],
		variants: existingVariants("proton-mail", "PM", "#6d4aff", ["base", "light"]),
	},
	{
		slug: "self-host",
		source: "submission",
		status: "pending",
		by: "@selfhoster42",
		submissionId: "k3x9p2",
		aliases: [],
		categories: ["tools"],
		variants: existingVariants("self-host", "SH", "#0ea5e9", ["base"]),
	},
	{
		slug: "jellyseerr",
		source: "submission",
		status: "pending",
		by: "@prototype-user",
		mine: true,
		submissionId: "m1n3p0",
		aliases: [],
		categories: ["media"],
		variants: existingVariants("jellyseerr", "JS", "#7c3aed", ["base", "dark"]),
	},
	{
		slug: "immich-kiosk",
		source: "submission",
		status: "rejected",
		by: "@prototype-user",
		mine: true,
		submissionId: "r7j2q8",
		rejection: "Base has an opaque white background. Please upload a transparent SVG and add a light variant.",
		aliases: ["kiosk"],
		categories: ["media"],
		variants: existingVariants("immich-kiosk", "IK", "#4250af", ["base"]),
	},
]

export function findExisting(slug: string) {
	return EXISTING.find((e) => e.slug === slug) ?? null
}
export function existingLabel(e: ExistingIcon) {
	if (e.source === "collection") return "in collection"
	if (e.mine && e.status === "rejected") return "your rejected submission"
	if (e.mine) return "your pending submission"
	return `pending · ${e.by}`
}

let seq = 0
export const uid = (p: string) => `${p}${++seq}`

export function sanitizeSlug(input: string) {
	return input
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
}
export function stemOf(name: string) {
	return name.replace(/\.[^.]+$/, "")
}
export function extOf(name: string) {
	return name.split(".").pop()?.toLowerCase() || "svg"
}
export function targetFilename(slug: string, key: string, ext = "svg") {
	return `${slug || "<slug>"}${key === "base" ? "" : `-${key}`}.${ext}`
}

const WELL_KNOWN_SUFFIX: [string, string, string?][] = [
	["wordmark-light", "wordmark-light"],
	["wordmark-white", "wordmark-light", "white"],
	["wordmark-dark", "wordmark-dark"],
	["wordmark-black", "wordmark-dark", "black"],
	["wordmark", "wordmark"],
	["text", "wordmark", "text"],
	["logo", "wordmark", "logo"],
	["light", "light"],
	["white", "light", "white"],
	["dark", "dark"],
	["black", "dark", "black"],
]

export type Parsed = { slug: string; key: string; custom: boolean; mappedFrom?: string }

export function parseStem(raw: string): Parsed {
	const stem = sanitizeSlug(raw)
	for (const s of [...CUSTOM_SUGGESTIONS].sort((a, b) => b.length - a.length)) {
		if (stem.endsWith(`-${s}`) && stem.length > s.length + 1) return { slug: stem.slice(0, -s.length - 1), key: s, custom: true }
	}
	for (const [suffix, key, mappedFrom] of WELL_KNOWN_SUFFIX) {
		if (stem.endsWith(`-${suffix}`) && stem.length > suffix.length + 1)
			return { slug: stem.slice(0, -suffix.length - 1), key, custom: false, mappedFrom }
	}
	return { slug: stem, key: "base", custom: false }
}

export function validateCustomName(slug: string, name: string, taken: string[] = []): string | null {
	if (!name) return "Give the variant a name."
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return "Use lowercase letters, digits and single hyphens (kebab-case)."
	if (name.length > 32) return "32 characters max."
	if (RESERVED.includes(name)) return `"${name}" is a built-in variant. Use its slot instead.`
	if (taken.includes(name)) return `${slug} already has a "${name}" variant.`
	const collision = findExisting(`${slug}-${name}`)
	if (slug && collision) return `${slug}-${name} is already an icon (${existingLabel(collision)}). Pick another name.`
	return null
}

export type DraftFile = { id: string; key: string; custom: boolean; file: File; url: string; mappedFrom?: string }
export type DraftSubmission = { id: string; slug: string; aliases: string[]; categories: string[]; description: string; files: DraftFile[] }
export type Subs = DraftSubmission[]

export function makeFile(file: File, key: string, custom: boolean, mappedFrom?: string): DraftFile {
	return { id: uid("f"), key, custom, file, url: URL.createObjectURL(file), mappedFrom }
}
export function newSubmission(slug = "", files: DraftFile[] = []): DraftSubmission {
	return { id: uid("s"), slug, aliases: [], categories: [], description: "", files }
}
export function acceptFiles(files: File[]) {
	return files.filter((f) => /\.(svg|png)$/i.test(f.name) && f.size <= MAX_FILE_SIZE)
}

export function addFilesAuto(subs: Subs, files: File[]): Subs {
	const out = subs.map((s) => ({ ...s, files: [...s.files] }))
	for (const f of acceptFiles(files)) {
		const p = parseStem(stemOf(f.name))
		let sub = out.find((s) => s.slug === p.slug)
		if (!sub) {
			sub = newSubmission(p.slug)
			out.push(sub)
		}
		sub.files.push(makeFile(f, p.key, p.custom, p.mappedFrom))
	}
	return out
}
export function addFilesFlat(subs: Subs, files: File[]): Subs {
	return [...subs, ...acceptFiles(files).map((f) => newSubmission(sanitizeSlug(stemOf(f.name)), [makeFile(f, "base", false)]))]
}
export function addFilesTo(subs: Subs, subId: string, files: File[]): Subs {
	return mapSub(subs, subId, (s) => ({
		...s,
		files: [
			...s.files,
			...acceptFiles(files).map((f) => {
				const p = parseStem(stemOf(f.name))
				return makeFile(f, p.key, p.custom, p.mappedFrom)
			}),
		],
	}))
}

function mapSub(subs: Subs, id: string, fn: (s: DraftSubmission) => DraftSubmission): Subs {
	return subs.map((s) => (s.id === id ? fn(s) : s))
}
export function findFile(subs: Subs, fileId: string) {
	for (const s of subs) {
		const f = s.files.find((x) => x.id === fileId)
		if (f) return { sub: s, f }
	}
	return null
}
export function setSlot(subs: Subs, subId: string, key: string, file: File, custom = !isWellKnown(key)): Subs {
	return mapSub(subs, subId, (s) => ({ ...s, files: [...s.files.filter((f) => f.key !== key), makeFile(file, key, custom)] }))
}
export function removeFile(subs: Subs, fileId: string): Subs {
	return subs.map((s) => ({ ...s, files: s.files.filter((f) => f.id !== fileId) }))
}
export function setFileKey(subs: Subs, fileId: string, key: string): Subs {
	return subs.map((s) => ({
		...s,
		files: s.files.map((f) => (f.id === fileId ? { ...f, key, custom: !isWellKnown(key), mappedFrom: undefined } : f)),
	}))
}
export function moveFile(subs: Subs, fileId: string, toSubId: string, key?: string): Subs {
	const found = findFile(subs, fileId)
	if (!found) return subs
	const nextKey = key ?? found.f.key
	const moved = { ...found.f, key: nextKey, custom: !isWellKnown(nextKey) }
	const without = removeFile(subs, fileId)
	return mapSub(without, toSubId, (s) => ({ ...s, files: [...s.files.filter((f) => f.key !== nextKey), moved] }))
}
export function fileToNewSubmission(subs: Subs, fileId: string): Subs {
	const found = findFile(subs, fileId)
	if (!found) return subs
	return [...removeFile(subs, fileId), newSubmission(sanitizeSlug(stemOf(found.f.file.name)), [{ ...found.f, key: "base", custom: false }])]
}
export function combinedKey(key: string, inner: string) {
	if (inner === "base") return key
	return `${key}-${inner}`
}
export function moveRowInto(subs: Subs, fromId: string, intoId: string, key: string): Subs {
	const from = subs.find((s) => s.id === fromId)
	if (!from) return subs
	let next = subs.filter((s) => s.id !== fromId)
	for (const f of from.files) {
		const k = combinedKey(key, f.key)
		next = mapSub(next, intoId, (s) => ({ ...s, files: [...s.files, { ...f, key: k, custom: !isWellKnown(k) }] }))
	}
	return next
}
export function renameSub(subs: Subs, id: string, slug: string): Subs {
	return mapSub(subs, id, (s) => ({ ...s, slug: sanitizeSlug(slug) }))
}
export function setMeta(subs: Subs, id: string, patch: Partial<Pick<DraftSubmission, "aliases" | "categories" | "description">>): Subs {
	return mapSub(subs, id, (s) => ({ ...s, ...patch }))
}
export function removeSub(subs: Subs, id: string): Subs {
	return subs.filter((s) => s.id !== id)
}

export type ModifyOp = { type: "add" | "replace"; key: string; custom: boolean; file: File; url: string } | { type: "remove"; key: string }
export type ModifyDraft = { slug: string | null; ops: Record<string, ModifyOp>; aliases: string[]; categories: string[]; note: string }

export const emptyModify = (): ModifyDraft => ({ slug: null, ops: {}, aliases: [], categories: [], note: "" })

export function startModify(slug: string, carry: DraftFile[] = []): ModifyDraft {
	const e = findExisting(slug)
	let md: ModifyDraft = { slug, ops: {}, aliases: e?.aliases ?? [], categories: e?.categories ?? [], note: "" }
	for (const f of carry) md = putVariant(md, f.key, f.file)
	return md
}
export function putVariant(md: ModifyDraft, key: string, file: File): ModifyDraft {
	const exists = findExisting(md.slug ?? "")?.variants.some((v) => v.key === key)
	return {
		...md,
		ops: { ...md.ops, [key]: { type: exists ? "replace" : "add", key, custom: !isWellKnown(key), file, url: URL.createObjectURL(file) } },
	}
}
export function removeVariantOp(md: ModifyDraft, key: string): ModifyDraft {
	const exists = findExisting(md.slug ?? "")?.variants.some((v) => v.key === key)
	const ops = { ...md.ops }
	if (exists) ops[key] = { type: "remove", key }
	else delete ops[key]
	return { ...md, ops }
}
export function undoOp(md: ModifyDraft, key: string): ModifyDraft {
	const ops = { ...md.ops }
	delete ops[key]
	return { ...md, ops }
}
export function modifyRows(md: ModifyDraft) {
	const e = findExisting(md.slug ?? "")
	const keys = [...new Set([...(e?.variants.map((v) => v.key) ?? []), ...Object.keys(md.ops)])]
	keys.sort((a, b) => order(a) - order(b))
	return keys.map((key) => ({ key, current: e?.variants.find((v) => v.key === key) ?? null, op: md.ops[key] ?? null }))
}
function order(key: string) {
	const i = SLOT_KEYS.indexOf(key)
	return i === -1 ? 100 : i
}

export type Action = { kind: "subs"; fn: (s: Subs) => Subs } | { kind: "modify"; slug: string; carry: DraftFile[] }
export type Nudge = {
	id: string
	subId?: string
	level: "error" | "warn" | "info"
	text: string
	actions: { label: string; action: Action }[]
}

export function submissionNudges(subs: Subs): Nudge[] {
	const out: Nudge[] = []
	for (const s of subs) {
		const name = s.slug || "this icon"
		if (!s.slug)
			out.push({ id: `${s.id}-noslug`, subId: s.id, level: "error", text: "Give the icon a slug (lowercase-kebab).", actions: [] })
		if (!s.files.some((f) => f.key === "base"))
			out.push({ id: `${s.id}-nobase`, subId: s.id, level: "error", text: `${name} needs a Base file.`, actions: [] })
		const byKey = new Map<string, DraftFile[]>()
		for (const f of s.files) byKey.set(f.key, [...(byKey.get(f.key) ?? []), f])
		for (const [key, files] of byKey) {
			if (files.length < 2) continue
			out.push({
				id: `${s.id}-dup-${key}`,
				subId: s.id,
				level: "error",
				text: `${files.map((f) => f.file.name).join(" and ")} all map to ${targetFilename(s.slug, key)}. Keep one.`,
				actions: files.map((keep) => ({
					label: `Keep ${keep.file.name}`,
					action: { kind: "subs", fn: (x: Subs) => files.filter((f) => f.id !== keep.id).reduce((acc, f) => removeFile(acc, f.id), x) },
				})),
			})
		}
		for (const f of s.files.filter((x) => x.custom)) {
			const err = validateCustomName(
				s.slug,
				f.key,
				s.files.filter((o) => o.id !== f.id && o.key !== f.key).map((o) => o.key),
			)
			if (err)
				out.push({ id: `${s.id}-custom-${f.id}`, subId: s.id, level: "error", text: `Custom variant "${f.key}": ${err}`, actions: [] })
		}
		const existing = findExisting(s.slug)
		if (existing?.source === "collection")
			out.push({
				id: `${s.id}-exists`,
				subId: s.id,
				level: "error",
				text: `${s.slug} already exists in the collection. New files for it are an update.`,
				actions: [{ label: `Modify ${s.slug} instead`, action: { kind: "modify", slug: s.slug, carry: s.files } }],
			})
		if (existing?.mine)
			out.push({
				id: `${s.id}-mine`,
				subId: s.id,
				level: "warn",
				text: `You already have a ${existing.status} submission for ${s.slug}. Edit it instead?`,
				actions: [{ label: `Edit my ${s.slug} submission`, action: { kind: "modify", slug: s.slug, carry: s.files } }],
			})
		if (existing && existing.source === "submission" && !existing.mine)
			out.push({
				id: `${s.id}-pending`,
				subId: s.id,
				level: "warn",
				text: `${s.slug} is pending in ${existing.by}'s submission #${existing.submissionId}. Propose your files to it instead of a duplicate?`,
				actions: [{ label: `Propose to #${existing.submissionId}`, action: { kind: "modify", slug: s.slug, carry: s.files } }],
			})
		const p = parseStem(s.slug)
		if (p.slug !== s.slug) {
			const sibling = subs.find((o) => o.id !== s.id && o.slug === p.slug)
			const ext = findExisting(p.slug)
			if (sibling)
				out.push({
					id: `${s.id}-variantof`,
					subId: s.id,
					level: "warn",
					text: `${s.slug} looks like a variant of ${p.slug}. Add it as ${p.slug}'s ${slotTitle(p.key).toLowerCase()}${p.custom ? " (custom)" : ""}?`,
					actions: [
						{
							label: `Move onto ${p.slug} as ${p.key}`,
							action: { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, sibling.id, p.key) },
						},
					],
				})
			else if (ext)
				out.push({
					id: `${s.id}-variantof`,
					subId: s.id,
					level: "warn",
					text: `${s.slug} looks like a variant of ${p.slug} (${existingLabel(ext)}). Add it as ${p.slug}'s ${p.key}?`,
					actions: [
						{
							label: `Modify ${p.slug}: add ${p.key}`,
							action: { kind: "modify", slug: p.slug, carry: s.files.map((f) => ({ ...f, key: combinedKey(p.key, f.key) })) },
						},
					],
				})
		}
		if (p.slug === s.slug && !existing) {
			const sibling = subs.find((o) => o.id !== s.id && o.slug && s.slug.startsWith(`${o.slug}-`))
			const ext = EXISTING.find((e) => s.slug.startsWith(`${e.slug}-`) && !findExisting(s.slug))
			const host = sibling?.slug ?? ext?.slug
			if (host) {
				const rest = s.slug.slice(host.length + 1)
				let action: Action = {
					kind: "modify",
					slug: host,
					carry: s.files.map((f) => ({ ...f, key: combinedKey(rest, f.key), custom: true })),
				}
				let label = `Modify ${host}: add custom "${rest}"`
				if (sibling) {
					action = { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, sibling.id, rest) }
					label = `Move onto ${host} as "${rest}"`
				}
				out.push({
					id: `${s.id}-prefix`,
					subId: s.id,
					level: "info",
					text: `Is ${s.slug} the same product as ${host}? Same product = same icon, so it would be ${host}'s custom "${rest}" variant.`,
					actions: [{ label, action }],
				})
			}
		}
		const twins = subs.filter((o) => o.slug && o.slug === s.slug)
		if (twins.length > 1 && twins[0].id !== s.id)
			out.push({
				id: `${s.id}-twin`,
				subId: s.id,
				level: "error",
				text: `Two submissions are named ${s.slug}. One icon = one submission.`,
				actions: [{ label: "Combine them", action: { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, twins[0].id, "base") } }],
			})
	}
	return out
}

export function modifyNudges(md: ModifyDraft): Nudge[] {
	const e = findExisting(md.slug ?? "")
	if (!e) return []
	const out: Nudge[] = []
	if (md.ops.base?.type === "remove")
		out.push({ id: "rm-base", level: "error", text: "The Base can't be removed. Replace it instead.", actions: [] })
	if (e.source === "submission" && !e.mine)
		out.push({
			id: "other",
			level: "info",
			text: `You're proposing changes to ${e.by}'s pending submission #${e.submissionId}.`,
			actions: [],
		})
	if (e.mine && e.status === "pending")
		out.push({ id: "mine", level: "info", text: "This is your own pending submission: your edits update it directly.", actions: [] })
	if (e.mine && e.status === "rejected")
		out.push({ id: "rejected", level: "warn", text: `Rejected: “${e.rejection}” Fix it and resubmit the same submission.`, actions: [] })
	for (const op of Object.values(md.ops)) {
		if (op.type === "remove" || !op.custom) continue
		const err = validateCustomName(
			e.slug,
			op.key,
			e.variants.filter((v) => v.key !== op.key).map((v) => v.key),
		)
		if (err && !err.includes("already has"))
			out.push({ id: `c-${op.key}`, level: "error", text: `Custom variant "${op.key}": ${err}`, actions: [] })
	}
	if (Object.values(md.ops).some((o) => o.type === "remove"))
		out.push({ id: "removal", level: "warn", text: "Removals are flagged for the reviewer and need a reason in the note.", actions: [] })
	return out
}

export function newPayload(subs: Subs) {
	return subs.map((s, i) => ({
		submission: i + 1,
		kind: "new",
		slug: s.slug,
		aliases: s.aliases,
		categories: s.categories,
		description: s.description,
		variants: s.files.map((f) => ({
			variant: f.key,
			custom: f.custom,
			background: bgLabel(bgForKey(f.key)),
			source: f.file.name,
			target: targetFilename(s.slug, f.key, extOf(f.file.name)),
		})),
	}))
}

function diffList(before: string[], after: string[]) {
	return { added: after.filter((x) => !before.includes(x)), removed: before.filter((x) => !after.includes(x)) }
}

export function modifyPayload(md: ModifyDraft) {
	const e = findExisting(md.slug ?? "")
	if (!e) return null
	let kind = "update-proposal"
	if (e.mine && e.status === "rejected") kind = "resubmit"
	else if (e.mine) kind = "edit-own-pending"
	const ops = Object.values(md.ops)
	return {
		kind,
		target: { slug: e.slug, source: e.source, submission_id: e.submissionId },
		variants: {
			added: ops.flatMap((o) =>
				o.type === "add"
					? [{ variant: o.key, custom: o.custom, source: o.file.name, target: targetFilename(e.slug, o.key, extOf(o.file.name)) }]
					: [],
			),
			replaced: ops.flatMap((o) =>
				o.type === "replace" ? [{ variant: o.key, source: o.file.name, target: targetFilename(e.slug, o.key, extOf(o.file.name)) }] : [],
			),
			removed: ops.flatMap((o) => (o.type === "remove" ? [{ variant: o.key, target: targetFilename(e.slug, o.key) }] : [])),
		},
		metadata: { aliases: diffList(e.aliases, md.aliases), categories: diffList(e.categories, md.categories) },
		note: md.note,
	}
}

export function diffLines(md: ModifyDraft) {
	const e = findExisting(md.slug ?? "")
	if (!e) return []
	const lines: { sign: "+" | "~" | "−"; text: string }[] = []
	for (const o of Object.values(md.ops)) {
		if (o.type === "add")
			lines.push({ sign: "+", text: `${targetFilename(e.slug, o.key, extOf(o.file.name))}${o.custom ? " (custom)" : ""}` })
		if (o.type === "replace")
			lines.push({ sign: "~", text: `${targetFilename(e.slug, o.key, extOf(o.file.name))} replaced by ${o.file.name}` })
		if (o.type === "remove") lines.push({ sign: "−", text: `${targetFilename(e.slug, o.key)} removed` })
	}
	const a = diffList(e.aliases, md.aliases)
	const c = diffList(e.categories, md.categories)
	for (const x of a.added) lines.push({ sign: "+", text: `alias “${x}”` })
	for (const x of a.removed) lines.push({ sign: "−", text: `alias “${x}”` })
	for (const x of c.added) lines.push({ sign: "+", text: `category ${x}` })
	for (const x of c.removed) lines.push({ sign: "−", text: `category ${x}` })
	return lines
}

function svgFile(name: string, label: string, fill: string, ink: string, shape: "square" | "diamond" = "square") {
	return new File([glyph(label, fill, ink, shape)], name, { type: "image/svg+xml" })
}

export function selfHostFiles() {
	return [
		svgFile("self-host.svg", "SH", "#0ea5e9", "#ffffff"),
		svgFile("self-host-light.svg", "SH", "#f4f4f5", "#18181b"),
		svgFile("self-host-dark.svg", "SH", "#18181b", "#f4f4f5"),
		svgFile("self-host-white.svg", "SH", "#ffffff", "#27272a"),
		svgFile("self-host-black.svg", "SH", "#000000", "#e4e4e7"),
		svgFile("self-host-animated.svg", "SH", "#0ea5e9", "#ffffff", "diamond"),
		svgFile("self-host-animated-dark.svg", "SH", "#18181b", "#f4f4f5", "diamond"),
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
export function sonarr4kFile() {
	return svgFile("sonarr-4k.svg", "4K", "#35c5f4", "#ffffff")
}
export function demoFile(name: string) {
	const p = parseStem(stemOf(name))
	const [fill, ink] = toneOf(p.key)
	return svgFile(name, p.slug.slice(0, 2).toUpperCase(), fill === TONE.base[0] ? "#16a34a" : fill, ink)
}
