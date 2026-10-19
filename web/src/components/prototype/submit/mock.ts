// PROTOTYPE reference model: one Submission = one Icon; Submit (new icons) and Edit (update proposal, or in-place edit of your own submission); mocks, parsing, validation, nudges, payloads.
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"

export const CATEGORIES = SUBMISSION_CATEGORIES
export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const STUB_USER = { id: "proto-user", username: "prototype-user" }

export type Mode = "submit" | "edit"
export type Bg = "checker" | "dark" | "light"

export const SLOTS = [
	{ key: "base", title: "Base", hint: "Full colour. Required.", bg: "checker" },
	{ key: "light", title: "Light", hint: "Light artwork for dark backgrounds", bg: "dark" },
	{ key: "dark", title: "Dark", hint: "Dark artwork for light backgrounds", bg: "light" },
	{ key: "wordmark", title: "Wordmark", hint: "Logo with the name, full colour", bg: "checker" },
	{ key: "wordmark-light", title: "Wordmark light", hint: "Light wordmark for dark backgrounds", bg: "dark" },
	{ key: "wordmark-dark", title: "Wordmark dark", hint: "Dark wordmark for light backgrounds", bg: "light" },
] as const satisfies readonly { key: string; title: string; hint: string; bg: Bg }[]
export const SLOT_KEYS: string[] = SLOTS.map((s) => s.key)

export const CUSTOM_SUGGESTIONS = ["4k", "animated", "animated-dark", "mono", "outline", "3d", "alt", "flat", "square", "beta"]
const RESERVED = ["base", "icon", "light", "dark", "white", "black", "wordmark", "wordmark-light", "wordmark-dark", "text"]

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
	if (bg === "dark") return "Shown on a dark background"
	if (bg === "light") return "Shown on a light background"
	return "Shown on a transparent background"
}

export type ExistingVariant = { key: string; url: string; filename: string }
export type ExistingIcon = {
	slug: string
	source: "collection" | "submission"
	status?: "pending" | "rejected"
	by?: string
	mine?: boolean
	submissionId?: string
	round?: number
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
const TONE = { light: ["#f4f4f5", "#18181b"], dark: ["#18181b", "#f4f4f5"] }
function toneOf(key: string, hue: string) {
	if (key === "light" || key.endsWith("-light")) return TONE.light
	if (key === "dark" || key.endsWith("-dark")) return TONE.dark
	return [hue, "#ffffff"]
}
function existingVariants(slug: string, label: string, hue: string, keys: string[]): ExistingVariant[] {
	return keys.map((key) => {
		const [fill, ink] = toneOf(key, hue)
		return { key, filename: `${slug}${key === "base" ? "" : `-${key}`}.svg`, url: dataUrl(glyph(label, fill, ink)) }
	})
}

function initialExisting(): ExistingIcon[] {
	return [
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
			round: 1,
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
			round: 1,
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
			round: 1,
			rejection: "The Base has an opaque white background. Upload a transparent SVG and add a Light variant for dark dashboards.",
			aliases: ["kiosk"],
			categories: ["media"],
			variants: existingVariants("immich-kiosk", "IK", "#4250af", ["base"]),
		},
	]
}

export const EXISTING: ExistingIcon[] = initialExisting()

export function resetMocks() {
	EXISTING.splice(0, EXISTING.length, ...initialExisting())
}

export function findExisting(slug: string) {
	return EXISTING.find((e) => e.slug === slug) ?? null
}
export function existingLabel(e: ExistingIcon) {
	if (e.source === "collection") return "In the collection"
	if (e.mine && e.status === "rejected") return "Your submission · rejected, can be fixed"
	if (e.mine) return `Your submission · awaiting review${(e.round ?? 1) > 1 ? ` (round ${e.round})` : ""}`
	return `Awaiting review · submitted by ${e.by}`
}
export function myRejected() {
	return EXISTING.filter((e) => e.mine && e.status === "rejected")
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
	return `${slug || "your-icon"}${key === "base" ? "" : `-${key}`}.${ext}`
}

const WELL_KNOWN_SUFFIX: [string, string, string?][] = [
	["wordmark-light", "wordmark-light"],
	["wordmark-dark", "wordmark-dark"],
	["wordmark", "wordmark"],
	["text", "wordmark", "text"],
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
	if (!name) return "Name the variant, for example animated or 4k."
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return "Use lowercase letters, digits and single hyphens."
	if (name.length > 32) return "Keep it to 32 characters or fewer."
	if (RESERVED.includes(name)) return `"${name}" is a built-in variant. Use its slot instead.`
	if (taken.includes(name)) return `${slug || "This icon"} already has a "${name}" variant.`
	const collision = findExisting(`${slug}-${name}`)
	if (slug && collision) return `${slug}-${name} is already a separate icon. Pick another name.`
	return null
}

export type DraftFile = { id: string; key: string; custom: boolean; file: File; url: string; mappedFrom?: string }
export type DraftSubmission = { id: string; slug: string; aliases: string[]; categories: string[]; files: DraftFile[] }
export type Subs = DraftSubmission[]

export function makeFile(file: File, key: string, custom: boolean, mappedFrom?: string): DraftFile {
	return { id: uid("f"), key, custom, file, url: URL.createObjectURL(file), mappedFrom }
}
export function newSubmission(slug = "", files: DraftFile[] = []): DraftSubmission {
	return { id: uid("s"), slug, aliases: [], categories: [], files }
}
export function acceptFiles(files: File[]) {
	return files.filter((f) => /\.(svg|png)$/i.test(f.name) && f.size <= MAX_FILE_SIZE)
}

export function addFilesAuto(subs: Subs, files: File[]): Subs {
	const out = subs.map((s) => ({ ...s, files: [...s.files] }))
	for (const f of acceptFiles(files)) {
		const p = parseStem(stemOf(f.name))
		let sub = out.find((s) => s.slug === p.slug) ?? out.find((s) => !s.slug && s.files.length === 0)
		if (!sub) {
			sub = newSubmission(p.slug)
			out.push(sub)
		}
		sub.slug = p.slug
		sub.files.push(makeFile(f, p.key, p.custom, p.mappedFrom))
	}
	return out
}
export function addFilesTo(subs: Subs, subId: string, files: File[]): Subs {
	return mapSub(subs, subId, (s) => {
		let slug = s.slug
		const added = acceptFiles(files).map((f) => {
			const p = parseStem(stemOf(f.name))
			if (!slug) slug = p.slug
			return makeFile(f, p.key, p.custom, p.mappedFrom)
		})
		return { ...s, slug, files: [...s.files, ...added] }
	})
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
export function moveFile(subs: Subs, fileId: string, toSubId: string, key?: string): Subs {
	const found = findFile(subs, fileId)
	if (!found) return subs
	const nextKey = key ?? found.f.key
	const moved = { ...found.f, key: nextKey, custom: !isWellKnown(nextKey), mappedFrom: undefined }
	const without = removeFile(subs, fileId)
	return mapSub(without, toSubId, (s) => ({ ...s, files: [...s.files.filter((f) => f.key !== nextKey), moved] }))
}
export function moveRowInto(subs: Subs, fromId: string, intoId: string, key: string): Subs {
	const from = subs.find((s) => s.id === fromId)
	if (!from) return subs
	let next = subs.filter((s) => s.id !== fromId)
	for (const f of from.files) {
		const k = f.key === "base" ? key : `${key}-${f.key}`
		next = mapSub(next, intoId, (s) => ({ ...s, files: [...s.files, { ...f, key: k, custom: !isWellKnown(k) }] }))
	}
	return next
}
export function renameSub(subs: Subs, id: string, slug: string): Subs {
	return mapSub(subs, id, (s) => ({ ...s, slug: sanitizeSlug(slug) }))
}
export function setMeta(subs: Subs, id: string, patch: Partial<Pick<DraftSubmission, "aliases" | "categories">>): Subs {
	return mapSub(subs, id, (s) => ({ ...s, ...patch }))
}
export function removeSub(subs: Subs, id: string): Subs {
	return subs.filter((s) => s.id !== id)
}

export type EditOp =
	| { type: "add" | "replace"; key: string; custom: boolean; file: File; url: string }
	| { type: "remove"; key: string; note: string }
export type EditDraft = { slug: string | null; ops: Record<string, EditOp>; aliases: string[]; categories: string[]; note: string }

export const emptyEdit = (): EditDraft => ({ slug: null, ops: {}, aliases: [], categories: [], note: "" })

export function startEdit(slug: string, carry: DraftFile[] = []): EditDraft {
	const e = findExisting(slug)
	let md: EditDraft = { slug, ops: {}, aliases: e?.aliases ?? [], categories: e?.categories ?? [], note: "" }
	for (const f of carry) md = putVariant(md, f.key, f.file)
	return md
}
export function putVariant(md: EditDraft, key: string, file: File): EditDraft {
	const exists = findExisting(md.slug ?? "")?.variants.some((v) => v.key === key)
	return {
		...md,
		ops: { ...md.ops, [key]: { type: exists ? "replace" : "add", key, custom: !isWellKnown(key), file, url: URL.createObjectURL(file) } },
	}
}
export function removeVariantOp(md: EditDraft, key: string): EditDraft {
	const exists = findExisting(md.slug ?? "")?.variants.some((v) => v.key === key)
	const ops = { ...md.ops }
	if (exists) ops[key] = { type: "remove", key, note: "" }
	else delete ops[key]
	return { ...md, ops }
}
export function setRemovalNote(md: EditDraft, key: string, note: string): EditDraft {
	const op = md.ops[key]
	if (op?.type !== "remove") return md
	return { ...md, ops: { ...md.ops, [key]: { ...op, note } } }
}
export function undoOp(md: EditDraft, key: string): EditDraft {
	const ops = { ...md.ops }
	delete ops[key]
	return { ...md, ops }
}
export function editRows(md: EditDraft) {
	const e = findExisting(md.slug ?? "")
	const keys = [...new Set([...(e?.variants.map((v) => v.key) ?? []), ...Object.keys(md.ops)])]
	keys.sort((a, b) => order(a) - order(b))
	return keys.map((key) => ({ key, current: e?.variants.find((v) => v.key === key) ?? null, op: md.ops[key] ?? null }))
}
function order(key: string) {
	const i = SLOT_KEYS.indexOf(key)
	return i === -1 ? 100 : i
}
export function isInPlace(e: ExistingIcon | null) {
	return Boolean(e?.mine)
}

export type Action = { kind: "subs"; fn: (s: Subs) => Subs } | { kind: "edit"; slug: string; carry: DraftFile[] }
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
		if (!s.slug && s.files.length === 0) continue
		if (!s.slug)
			out.push({
				id: `${s.id}-noslug`,
				subId: s.id,
				level: "error",
				text: "Add a slug, for example my-app. Lowercase letters, digits and hyphens.",
				actions: [],
			})
		if (!s.files.some((f) => f.key === "base"))
			out.push({ id: `${s.id}-nobase`, subId: s.id, level: "error", text: "Add a Base file. Every icon needs one.", actions: [] })
		const byKey = new Map<string, DraftFile[]>()
		for (const f of s.files) byKey.set(f.key, [...(byKey.get(f.key) ?? []), f])
		for (const [key, files] of byKey) {
			if (files.length < 2) continue
			out.push({
				id: `${s.id}-dup-${key}`,
				subId: s.id,
				level: "error",
				text: `${files.map((f) => f.file.name).join(" and ")} would both become ${targetFilename(s.slug, key)}. Keep one.`,
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
				text: `${s.slug} is already in the collection. To change it, edit it instead.`,
				actions: [{ label: `Edit ${s.slug}`, action: { kind: "edit", slug: s.slug, carry: s.files } }],
			})
		if (existing?.mine)
			out.push({
				id: `${s.id}-mine`,
				subId: s.id,
				level: "warn",
				text: `You already have a submission for ${s.slug}. Edit it instead of sending a second one?`,
				actions: [{ label: "Edit my submission", action: { kind: "edit", slug: s.slug, carry: s.files } }],
			})
		if (existing && existing.source === "submission" && !existing.mine)
			out.push({
				id: `${s.id}-pending`,
				subId: s.id,
				level: "warn",
				text: `${s.slug} is awaiting review in ${existing.by}'s submission. Propose your files to it rather than sending a duplicate.`,
				actions: [{ label: "Propose to their submission", action: { kind: "edit", slug: s.slug, carry: s.files } }],
			})
		const p = parseStem(s.slug)
		if (p.slug !== s.slug) {
			const sibling = subs.find((o) => o.id !== s.id && o.slug === p.slug)
			const ext = findExisting(p.slug)
			const label = p.custom ? `custom variant "${p.key}"` : `${slotTitle(p.key)} variant`
			if (sibling)
				out.push({
					id: `${s.id}-variantof`,
					subId: s.id,
					level: "warn",
					text: `${s.slug} looks like the ${label} of ${p.slug}.`,
					actions: [
						{ label: `Move to ${p.slug} as ${p.key}`, action: { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, sibling.id, p.key) } },
					],
				})
			else if (ext)
				out.push({
					id: `${s.id}-variantof`,
					subId: s.id,
					level: "warn",
					text: `${s.slug} looks like the ${label} of ${p.slug}, which already exists.`,
					actions: [
						{
							label: `Edit ${p.slug}: add ${p.key}`,
							action: {
								kind: "edit",
								slug: p.slug,
								carry: s.files.map((f) => ({ ...f, key: f.key === "base" ? p.key : `${p.key}-${f.key}` })),
							},
						},
					],
				})
		}
		if (p.slug === s.slug && !existing && s.slug) {
			const sibling = subs.find((o) => o.id !== s.id && o.slug && s.slug.startsWith(`${o.slug}-`))
			const ext = EXISTING.find((e) => s.slug.startsWith(`${e.slug}-`))
			const host = sibling?.slug ?? ext?.slug
			if (host) {
				const rest = s.slug.slice(host.length + 1)
				let action: Action = {
					kind: "edit",
					slug: host,
					carry: s.files.map((f) => ({ ...f, key: f.key === "base" ? rest : `${rest}-${f.key}`, custom: true })),
				}
				let label = `Edit ${host}: add ${rest}`
				if (sibling) {
					action = { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, sibling.id, rest) }
					label = `Move to ${host} as ${rest}`
				}
				out.push({
					id: `${s.id}-prefix`,
					subId: s.id,
					level: "info",
					text: `Is ${s.slug} the same product as ${host}? If so, it belongs on ${host} as a custom variant named "${rest}".`,
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
				text: `Another card is also named ${s.slug}. One icon is one submission.`,
				actions: [{ label: "Combine the cards", action: { kind: "subs", fn: (x: Subs) => moveRowInto(x, s.id, twins[0].id, "base") } }],
			})
	}
	return out
}

export function editNudges(md: EditDraft): Nudge[] {
	const e = findExisting(md.slug ?? "")
	if (!e) return []
	const out: Nudge[] = []
	if (md.ops.base?.type === "remove")
		out.push({ id: "rm-base", level: "error", text: "The Base can't be removed. Replace it instead.", actions: [] })
	if (e.source === "submission" && !e.mine)
		out.push({
			id: "other",
			level: "info",
			text: `This icon is awaiting review in ${e.by}'s submission. Your changes go to them and the reviewer as a proposal.`,
			actions: [],
		})
	for (const op of Object.values(md.ops)) {
		if (op.type === "remove" || !op.custom) continue
		const err = validateCustomName(
			e.slug,
			op.key,
			e.variants.filter((v) => v.key !== op.key).map((v) => v.key),
		)
		if (err) out.push({ id: `c-${op.key}`, level: "error", text: `Custom variant "${op.key}": ${err}`, actions: [] })
	}
	return out
}

export function newPayload(subs: Subs) {
	return subs.map((s) => ({
		kind: "new",
		status: "pending",
		round: 1,
		slug: s.slug,
		aliases: s.aliases,
		categories: s.categories,
		variants: s.files.map((f) => ({
			variant: f.key,
			custom: f.custom,
			source: f.file.name,
			target: targetFilename(s.slug, f.key, extOf(f.file.name)),
		})),
	}))
}

function diffList(before: string[], after: string[]) {
	return { added: after.filter((x) => !before.includes(x)), removed: before.filter((x) => !after.includes(x)) }
}

export function editPayload(md: EditDraft) {
	const e = findExisting(md.slug ?? "")
	if (!e) return null
	const ops = Object.values(md.ops)
	if (isInPlace(e)) {
		const variants = editRows(md).flatMap((r) => {
			if (r.op?.type === "remove") return []
			if (r.op)
				return [
					{ variant: r.key, custom: r.op.custom, source: r.op.file.name, target: targetFilename(e.slug, r.key, extOf(r.op.file.name)) },
				]
			if (r.current) return [{ variant: r.key, custom: !isWellKnown(r.key), source: "(unchanged)", target: r.current.filename }]
			return []
		})
		let round = e.round ?? 1
		if (e.status === "rejected") round += 1
		return {
			kind: e.status === "rejected" ? "resubmit" : "edit-in-place",
			submission_id: e.submissionId,
			status_before: e.status,
			status_after: "pending",
			round,
			slug: e.slug,
			aliases: md.aliases,
			categories: md.categories,
			variants,
			note: md.note,
		}
	}
	return {
		kind: "update-proposal",
		status: "pending",
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
			removed: ops.flatMap((o) =>
				o.type === "remove" ? [{ variant: o.key, target: targetFilename(e.slug, o.key), note: o.note, flagged_for_review: true }] : [],
			),
		},
		metadata: { aliases: diffList(e.aliases, md.aliases), categories: diffList(e.categories, md.categories) },
		note: md.note,
	}
}

export function diffLines(md: EditDraft) {
	const e = findExisting(md.slug ?? "")
	if (!e) return []
	const lines: { sign: "+" | "~" | "−"; text: string }[] = []
	for (const r of editRows(md)) {
		const o = r.op
		if (!o) continue
		if (o.type === "add") lines.push({ sign: "+", text: targetFilename(e.slug, o.key, extOf(o.file.name)) })
		if (o.type === "replace") lines.push({ sign: "~", text: `${targetFilename(e.slug, o.key, extOf(o.file.name))} replaced` })
		if (o.type === "remove") lines.push({ sign: "−", text: `${targetFilename(e.slug, o.key)} removed${o.note ? `: ${o.note}` : ""}` })
	}
	const a = diffList(e.aliases, md.aliases)
	const c = diffList(e.categories, md.categories)
	for (const x of a.added) lines.push({ sign: "+", text: `alias "${x}"` })
	for (const x of a.removed) lines.push({ sign: "−", text: `alias "${x}"` })
	for (const x of c.added) lines.push({ sign: "+", text: `category ${x}` })
	for (const x of c.removed) lines.push({ sign: "−", text: `category ${x}` })
	return lines
}

export function applyResubmit(slug: string) {
	const e = findExisting(slug)
	if (!e?.mine) return null
	if (e.status === "rejected") e.round = (e.round ?? 1) + 1
	e.status = "pending"
	e.rejection = undefined
	return e
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
export function plexAmpFile() {
	return svgFile("plex-amp.svg", "AMP", "#e5a00d", "#ffffff")
}
export function transparentKioskFile() {
	return svgFile("immich-kiosk.svg", "IK", "#4250af", "#ffffff")
}
export function kioskLightFile() {
	return svgFile("immich-kiosk-light.svg", "IK", "#f4f4f5", "#18181b")
}
