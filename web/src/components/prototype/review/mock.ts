// PROTOTYPE (throwaway): in-memory multi-icon submissions, variant model (form × tone) and sibling/collision/merge heuristics for the review variants.
export type Tone = "colour" | "light" | "dark"
export type CheckId = "opaque-background" | "low-resolution" | "raster" | "duplicate"
export interface Check {
	id: CheckId
	label: string
	severity: "warn" | "block"
}
export interface Asset {
	url: string
	format: "svg" | "png"
	size: string
	checks: Check[]
}
export interface IconVariant {
	id: string
	form: string
	tone: Tone
	asset: Asset
}
export interface ProposedIcon {
	id: string
	slug: string
	mode: "new" | "update"
	target?: { source: "collection" | "community"; slug: string; published: IconVariant[] }
	aliases: string[]
	categories: string[]
	variants: IconVariant[]
}
export interface Revision {
	round: number
	reviewer: string
	at: string
	feedback: string
	previous: IconVariant[]
	changes: string[]
}
export interface MockSubmission {
	id: string
	contributor: string
	created: string
	note: string
	round: number
	history?: Revision
	icons: ProposedIcon[]
	mergedFrom?: string[]
}

const now = Date.now()
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString()
export const svgUrl = (markup: string) =>
	`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`
const svg = (markup: string, checks: Check[] = [], format: Asset["format"] = "svg", size = "vector"): Asset => ({
	url: svgUrl(markup),
	format,
	size,
	checks,
})

const opaque: Check = { id: "opaque-background", label: "Opaque background", severity: "block" }
const lowRes: Check = { id: "low-resolution", label: "Low resolution (24×24)", severity: "block" }
const raster: Check = { id: "raster", label: "Raster image, SVG preferred", severity: "warn" }

function server(fill: string, accent: string, animated = false) {
	const pulse = animated ? '<animate attributeName="opacity" values="1;0.15;1" dur="1.1s" repeatCount="indefinite"/>' : ""
	return `<svg viewBox="0 0 64 64"><rect x="10" y="9" width="44" height="15" rx="4" fill="${fill}"/><rect x="10" y="28" width="44" height="15" rx="4" fill="${fill}"/><path d="M32 47v7M20 56h24" stroke="${fill}" stroke-width="4" stroke-linecap="round"/><circle cx="45" cy="16.5" r="3" fill="${accent}">${pulse}</circle><circle cx="45" cy="35.5" r="3" fill="${accent}">${pulse}</circle><rect x="16" y="15" width="16" height="3" rx="1.5" fill="${accent}" opacity=".6"/><rect x="16" y="34" width="16" height="3" rx="1.5" fill="${accent}" opacity=".6"/></svg>`
}
function doc(label: string, color: string) {
	return `<svg viewBox="0 0 64 64"><path d="M17 5h22l12 12v41a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="#e4e4e7"/><path d="M39 5v12h12z" fill="#a1a1aa"/><rect x="7" y="33" width="42" height="17" rx="3" fill="${color}"/><text x="28" y="45.5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${label.length > 3 ? 8.5 : 11}" font-weight="800" fill="#fff" text-anchor="middle">${label}</text></svg>`
}
function pixelDoc(color: string) {
	return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges"><path d="M3 1h5v1h1v1h1v8H3z" fill="#d4d4d8"/><path d="M8 1v2h2" fill="#a1a1aa"/><rect x="2" y="6" width="7" height="3" fill="${color}"/><rect x="3" y="7" width="1" height="1" fill="#fff"/><rect x="5" y="7" width="1" height="1" fill="#fff"/><rect x="7" y="7" width="1" height="1" fill="#fff"/></svg>`
}
function shield(fill: string, inner: string, refreshed = false) {
	if (refreshed)
		return `<svg viewBox="0 0 64 64"><path d="M32 5l22 8v16c0 15-9.5 25-22 30C19.5 54 10 44 10 29V13z" fill="${fill}"/><path d="M32 12l15 5.5V29c0 10.5-6.5 18-15 22z" fill="${inner}" opacity=".35"/><circle cx="32" cy="29" r="6" fill="${inner}"/><rect x="29.5" y="31" width="5" height="11" rx="2" fill="${inner}"/></svg>`
	return `<svg viewBox="0 0 64 64"><path d="M32 6l20 7v15c0 14-9 24-20 29C21 52 12 42 12 28V13z" fill="${fill}"/><rect x="24" y="26" width="16" height="13" rx="2" fill="${inner}"/><path d="M27 26v-4a5 5 0 0 1 10 0v4" stroke="${inner}" stroke-width="3" fill="none"/></svg>`
}
function books(withBackground: boolean) {
	const bg = withBackground ? '<rect width="64" height="64" fill="#ffffff"/>' : ""
	return `<svg viewBox="0 0 64 64">${bg}<rect x="12" y="14" width="9" height="38" rx="1.5" fill="#0d9488"/><rect x="23" y="10" width="9" height="42" rx="1.5" fill="#f59e0b"/><rect x="35" y="16" width="8" height="36" rx="1.5" fill="#6366f1" transform="rotate(-12 39 34)"/><rect x="8" y="52" width="48" height="4" rx="2" fill="#57534e"/></svg>`
}
function pulsarMark(color: string) {
	return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="8" fill="${color}"/><circle cx="32" cy="32" r="17" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="20 7"/><circle cx="32" cy="32" r="26" fill="none" stroke="${color}" stroke-width="2.5" opacity=".5"/></svg>`
}
function pulsarWordmark(color: string, text: string) {
	return `<svg viewBox="0 0 168 48"><circle cx="24" cy="24" r="6" fill="${color}"/><circle cx="24" cy="24" r="13" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="15 5"/><text x="46" y="33" font-family="ui-sans-serif,system-ui,sans-serif" font-size="26" font-weight="700" letter-spacing="-1" fill="${text}">pulsar</text></svg>`
}
function kiosk(fill: string, screen: string) {
	return `<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="34" rx="4" fill="${fill}"/><rect x="13" y="13" width="38" height="24" rx="2" fill="${screen}"/><rect x="18" y="18" width="12" height="7" rx="1" fill="${fill}" opacity=".7"/><rect x="33" y="18" width="13" height="14" rx="1" fill="${fill}" opacity=".45"/><path d="M26 42l-4 14h20l-4-14" fill="${fill}"/></svg>`
}
function basket(fill: string, accent: string, withBackground: boolean) {
	const bg = withBackground ? '<rect width="64" height="64" rx="12" fill="#fef3c7"/>' : ""
	return `<svg viewBox="0 0 64 64">${bg}<path d="M10 26h44l-5 26a4 4 0 0 1-4 3H19a4 4 0 0 1-4-3z" fill="${fill}"/><path d="M20 26l8-14M44 26l-8-14" stroke="${fill}" stroke-width="4" stroke-linecap="round"/><path d="M24 34v13M32 34v13M40 34v13" stroke="${accent}" stroke-width="3" stroke-linecap="round"/></svg>`
}
function heartbeat(fill: string, line: string, animated = false) {
	const anim = animated ? '<animate attributeName="stroke-dashoffset" values="90;0" dur="1.4s" repeatCount="indefinite"/>' : ""
	return `<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="44" rx="10" fill="${fill}"/><path d="M12 34h10l5-12 7 22 6-14 4 4h8" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="90" stroke-dashoffset="0">${anim}</path></svg>`
}

let counter = 0
const v = (form: string, tone: Tone, asset: Asset): IconVariant => ({ id: `v${++counter}`, form, tone, asset })
const icon = (id: string, slug: string, variants: IconVariant[], extra: Partial<ProposedIcon> = {}): ProposedIcon => ({
	id,
	slug,
	mode: "new",
	aliases: [],
	categories: [],
	variants,
	...extra,
})

const selfHostColours: Record<string, [string, string]> = {
	"": ["#2563eb", "#22c55e"],
	light: ["#f4f4f5", "#86efac"],
	dark: ["#18181b", "#15803d"],
	white: ["#ffffff", "#bbf7d0"],
	black: ["#000000", "#166534"],
}
const selfHostRecords: MockSubmission[] = [
	["self-host", "", false, 0],
	["self-host-light", "light", false, 0.6],
	["self-host-dark", "dark", false, 1.1],
	["self-host-white", "white", false, 1.9],
	["self-host-black", "black", false, 2.4],
	["self-host-animated", "", true, 3.2],
	["self-host-animated-dark", "dark", true, 3.9],
].map(([slug, tone, animated, offset], index) => {
	const [fill, accent] = selfHostColours[tone as string]
	return {
		id: `sub-lune-${index + 1}`,
		contributor: "lune",
		created: ago(42 - (offset as number)),
		note: index === 0 ? "Logo for my self-hosting blog / homelab. Uploaded the other versions separately." : "",
		round: 1,
		icons: [
			icon(`ic-lune-${index + 1}`, slug as string, [v("icon", "colour", svg(server(fill, accent, animated as boolean)))], {
				categories: ["Self-Hosting"],
				aliases: index === 0 ? ["selfhost", "homelab"] : [],
			}),
		],
	}
})

const fileTypes: [string, string, string][] = [
	["exe", "EXE", "#2563eb"],
	["msi", "MSI", "#0891b2"],
	["txt", "TXT", "#52525b"],
	["md", "MD", "#18181b"],
	["pdf", "PDF", "#dc2626"],
	["csv", "CSV", "#16a34a"],
	["zip-archive", "ZIP", "#ca8a04"],
	["video", "MP4", "#7c3aed"],
	["music", "MP3", "#db2777"],
	["picture", "JPG", "#0d9488"],
	["bat-file", "BAT", "#ea580c"],
	["shell-file", "SH", "#4d7c0f"],
]
const fileTypeSubmission: MockSubmission = {
	id: "sub-pkrz",
	contributor: "pkrz",
	created: ago(180),
	note: "File-type icon set for file browsers (Filebrowser, Nextcloud, Copyparty dashboards). All base only.",
	round: 1,
	icons: fileTypes.map(([slug, label, color]) => {
		if (slug === "music")
			return icon(`ic-pkrz-${slug}`, slug, [v("icon", "colour", svg(pixelDoc(color), [lowRes, raster], "png", "24×24"))], {
				categories: ["File Types"],
				aliases: ["mp3", "audio"],
			})
		return icon(`ic-pkrz-${slug}`, slug, [v("icon", "colour", svg(doc(label, color)))], {
			categories: ["File Types"],
			aliases: [label.toLowerCase()],
		})
	}),
}

const vaultkeeperPublished = [v("icon", "colour", svg(shield("#175ddc", "#ffffff")))]
const updateSubmission: MockSubmission = {
	id: "sub-mara",
	contributor: "mara",
	created: ago(60 * 26),
	note: "Vaultkeeper rebranded in v3 (new shield). Updating the base and adding light/dark versions.",
	round: 1,
	icons: [
		icon(
			"ic-mara-vaultkeeper",
			"vaultkeeper",
			[
				v("icon", "colour", svg(shield("#175ddc", "#ffffff", true))),
				v("icon", "light", svg(shield("#f4f4f5", "#18181b", true))),
				v("icon", "dark", svg(shield("#0f172a", "#e2e8f0", true))),
			],
			{
				mode: "update",
				target: { source: "collection", slug: "vaultkeeper", published: vaultkeeperPublished },
				categories: ["Security", "Password Managers"],
				aliases: ["vaultkeeper-server"],
			},
		),
	],
}

const opaqueSubmission: MockSubmission = {
	id: "sub-jdoe",
	contributor: "jdoe",
	created: ago(60 * 5),
	note: "Bookshelf reading tracker",
	round: 1,
	icons: [
		icon("ic-jdoe-bookshelf", "bookshelf", [v("icon", "colour", svg(books(true), [opaque, raster], "png", "512×512"))], {
			categories: ["Books", "Media"],
		}),
	],
}

const wordmarkSubmission: MockSubmission = {
	id: "sub-tomasz",
	contributor: "tomasz",
	created: ago(60 * 9),
	note: "Pulsar (monitoring). Includes the wordmark for wide tiles.",
	round: 1,
	icons: [
		icon(
			"ic-tomasz-pulsar",
			"pulsar",
			[
				v("icon", "colour", svg(pulsarMark("#8b5cf6"))),
				v("wordmark", "colour", svg(pulsarWordmark("#8b5cf6", "#8b5cf6"))),
				v("wordmark", "light", svg(pulsarWordmark("#ede9fe", "#fafafa"))),
				v("wordmark", "dark", svg(pulsarWordmark("#4c1d95", "#18181b"))),
			],
			{ categories: ["Monitoring"], aliases: ["pulsar-monitor"] },
		),
	],
}

const kioskDevon: MockSubmission = {
	id: "sub-devon",
	contributor: "devon",
	created: ago(60 * 52),
	note: "Kiosk Panel – wall-mounted dashboard frontend.",
	round: 1,
	icons: [icon("ic-devon-kiosk", "kiosk-panel", [v("icon", "colour", svg(kiosk("#0ea5e9", "#e0f2fe")))], { categories: ["Dashboards"] })],
}
const kioskKiki: MockSubmission = {
	id: "sub-kiki",
	contributor: "kiki",
	created: ago(35),
	note: "kiosk-panel icon + dark",
	round: 1,
	icons: [
		icon(
			"ic-kiki-kiosk",
			"kiosk-panel",
			[v("icon", "colour", svg(kiosk("#f97316", "#ffedd5"))), v("icon", "dark", svg(kiosk("#27272a", "#d4d4d8")))],
			{ categories: ["Dashboards"] },
		),
	],
}

const grocyBefore = [v("icon", "colour", svg(basket("#16a34a", "#bbf7d0", true), [opaque]))]
const resubmitted: MockSubmission = {
	id: "sub-ana",
	contributor: "ana",
	created: ago(60 * 3),
	note: "Removed the background and added the dark version as asked.",
	round: 2,
	history: {
		round: 1,
		reviewer: "ajnart",
		at: ago(60 * 30),
		feedback: "Please remove the background and use transparency. A dark variant would also help on light dashboards.",
		previous: grocyBefore,
		changes: ["Base replaced (background removed)", "Dark variant added"],
	},
	icons: [
		icon(
			"ic-ana-grocy",
			"grocy-lite",
			[v("icon", "colour", svg(basket("#16a34a", "#bbf7d0", false))), v("icon", "dark", svg(basket("#14532d", "#4ade80", false)))],
			{ categories: ["Home", "Inventory"], aliases: ["grocy"] },
		),
	],
}

const goodSubmission: MockSubmission = {
	id: "sub-rio",
	contributor: "rio",
	created: ago(60 * 7),
	note: "Uptime Deck. Animated version is a custom variant of the same icon.",
	round: 1,
	icons: [
		icon(
			"ic-rio-uptime",
			"uptime-deck",
			[
				v("icon", "colour", svg(heartbeat("#e11d48", "#ffffff"))),
				v("icon", "light", svg(heartbeat("#fafafa", "#e11d48"))),
				v("icon", "dark", svg(heartbeat("#18181b", "#fb7185"))),
				v("animated", "colour", svg(heartbeat("#e11d48", "#ffffff", true))),
			],
			{ categories: ["Monitoring"], aliases: ["uptimedeck"] },
		),
	],
}

export const initialSubmissions: MockSubmission[] = [
	...selfHostRecords,
	kioskKiki,
	resubmitted,
	fileTypeSubmission,
	opaqueSubmission,
	goodSubmission,
	wordmarkSubmission,
	updateSubmission,
	kioskDevon,
]

export const reasons: { text: string; outcome: "changes" | "reject" }[] = [
	{ text: "Please remove the background and use transparency.", outcome: "changes" },
	{ text: "Please provide a clean SVG vector file.", outcome: "changes" },
	{ text: "The icon is too small or blurry. Please upload a higher-quality asset.", outcome: "changes" },
	{ text: "Please upload light/dark versions as variants of one icon, not separate icons.", outcome: "changes" },
	{ text: "Please use the official logo and correct its proportions.", outcome: "changes" },
	{ text: "This icon is already in the collection.", outcome: "reject" },
	{ text: "This is a personal or non-public resource.", outcome: "reject" },
	{ text: "This icon is not relevant for our collection.", outcome: "reject" },
]

export const tones: Tone[] = ["colour", "light", "dark"]
export function variantKind(variant: Pick<IconVariant, "form" | "tone">) {
	if (variant.form === "icon") {
		if (variant.tone === "colour") return "base"
		return variant.tone
	}
	if (variant.tone === "colour") return variant.form
	return `${variant.form}-${variant.tone}`
}
export function fileName(slug: string, variant: Pick<IconVariant, "form" | "tone" | "asset">) {
	let name = slug
	if (variant.form !== "icon") name += `-${variant.form}`
	if (variant.tone !== "colour") name += `-${variant.tone}`
	return `${name}.${variant.asset.format}`
}
export function intendedBackground(tone: Tone): "light" | "dark" | "any" {
	if (tone === "light") return "dark"
	if (tone === "dark") return "light"
	return "any"
}
export function blocking(variant: IconVariant) {
	return variant.asset.checks.some((check) => check.severity === "block")
}

export interface Cluster {
	contributor: string
	root: string
	ids: string[]
	spanMinutes: number
}
export function siblingClusters(subs: MockSubmission[]): Cluster[] {
	const clusters: Cluster[] = []
	const byContributor = new Map<string, MockSubmission[]>()
	for (const sub of subs) byContributor.set(sub.contributor, [...(byContributor.get(sub.contributor) || []), sub])
	for (const [contributor, list] of byContributor) {
		if (list.length < 2) continue
		const root = [...list].sort((a, b) => a.icons[0].slug.length - b.icons[0].slug.length)[0].icons[0].slug
		const members = list.filter((sub) => sub.icons.every((entry) => entry.slug === root || entry.slug.startsWith(`${root}-`)))
		if (members.length < 2) continue
		const times = members.map((sub) => new Date(sub.created).getTime())
		const spanMinutes = Math.round((Math.max(...times) - Math.min(...times)) / 60000)
		if (spanMinutes > 15) continue
		clusters.push({ contributor, root, ids: members.map((sub) => sub.id), spanMinutes })
	}
	return clusters
}
export interface Collision {
	slug: string
	entries: { submissionId: string; contributor: string; created: string }[]
}
export function collisions(subs: MockSubmission[]): Collision[] {
	const bySlug = new Map<string, Collision["entries"]>()
	for (const sub of subs)
		for (const entry of sub.icons)
			bySlug.set(entry.slug, [
				...(bySlug.get(entry.slug) || []),
				{ submissionId: sub.id, contributor: sub.contributor, created: sub.created },
			])
	return [...bySlug.entries()]
		.filter(([, entries]) => new Set(entries.map((entry) => entry.contributor)).size > 1)
		.map(([slug, entries]) => ({ slug, entries }))
}

export type FixUp =
	| { kind: "merge"; from: string[]; into: string; summary: string }
	| { kind: "rename"; iconId: string; from: string; to: string }
	| { kind: "retag"; variantId: string; from: string; to: string }
	| { kind: "drop"; variantId: string; file: string; reason: string }
	| { kind: "split"; iconId: string; slug: string; from: string; into: string }

const toneWords: Record<string, Tone> = { light: "light", white: "light", dark: "dark", black: "dark" }
export function smartMerge(subs: MockSubmission[]) {
	const all = subs.flatMap((sub) => sub.icons)
	const root = [...all].sort((a, b) => a.slug.length - b.slug.length)[0].slug
	const groups = new Map<string, ProposedIcon>()
	const fixups: FixUp[] = []
	const drops: Record<string, string> = {}
	for (const source of all) {
		let tone: Tone | undefined
		const formParts: string[] = []
		const rest = source.slug === root ? [] : source.slug.slice(root.length + 1).split("-")
		for (const part of rest) {
			if (toneWords[part]) tone = toneWords[part]
			else formParts.push(part)
		}
		const slug = [root, ...formParts].join("-")
		let target = groups.get(slug)
		if (!target) {
			target = { ...source, id: `ic-merged-${slug}`, slug, aliases: [...source.aliases], variants: [] }
			groups.set(slug, target)
		}
		for (const variant of source.variants) {
			const next: IconVariant = { ...variant, tone: tone || variant.tone }
			const existing = target.variants.find((entry) => entry.form === next.form && entry.tone === next.tone)
			target.variants.push(next)
			const before = fileName(source.slug, variant)
			const after = fileName(slug, next)
			if (before !== after) fixups.push({ kind: "retag", variantId: variant.id, from: before, to: after })
			if (existing) {
				const reason = `Duplicate of ${fileName(slug, existing)} (“${rest.find((part) => toneWords[part])}” = ${next.tone})`
				drops[variant.id] = reason
				fixups.push({ kind: "drop", variantId: variant.id, file: before, reason })
			}
		}
	}
	const sorted = [...subs].sort((a, b) => a.created.localeCompare(b.created))
	const merged: MockSubmission = {
		id: `${sorted[0].id}+${subs.length - 1}`,
		contributor: sorted[0].contributor,
		created: sorted[0].created,
		note: sorted
			.map((sub) => sub.note)
			.filter(Boolean)
			.join(" · "),
		round: 1,
		icons: [...groups.values()],
		mergedFrom: sorted.map((sub) => sub.id),
	}
	const summary = `${subs.length} records → 1 submission: ${merged.icons.map((entry) => `${entry.slug} (${entry.variants.length - entry.variants.filter((variant) => drops[variant.id]).length} variants)`).join(", ")}`
	fixups.unshift({ kind: "merge", from: merged.mergedFrom || [], into: merged.id, summary })
	return { merged, fixups, drops }
}
