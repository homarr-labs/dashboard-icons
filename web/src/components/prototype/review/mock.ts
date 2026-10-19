// PROTOTYPE (throwaway): pass 2 mock model — one Submission = one icon (new or update delta), 6 well-known variants + custom variants, "sent together" batches, sibling/collision hints.
export const wellKnown = ["base", "light", "dark", "wordmark", "wordmark-light", "wordmark-dark"] as const
export type CheckId = "opaque-background" | "low-resolution" | "raster"
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
export interface Variant {
	id: string
	kind: string
	asset: Asset
}
export interface UpdateDelta {
	add: Variant[]
	replace: Variant[]
	remove: string[]
	aliases: { add: string[]; remove: string[] }
	categories: { add: string[]; remove: string[] }
}
export interface Published {
	variants: Variant[]
	aliases: string[]
	categories: string[]
}
export interface Revision {
	round: number
	reviewer: string
	at: string
	reason: string
	previous: Variant[]
	changes: string[]
}
export interface Submission {
	id: string
	contributor: string
	created: string
	note: string
	round: number
	type: "new" | "update"
	slug: string
	aliases: string[]
	categories: string[]
	variants: Variant[]
	published?: Published
	delta?: UpdateDelta
	history?: Revision
}

const now = Date.now()
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString()
export const svgUrl = (markup: string) =>
	`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`
const asset = (markup: string, checks: Check[] = [], format: Asset["format"] = "svg", size = "vector"): Asset => ({
	url: svgUrl(markup),
	format,
	size,
	checks,
})
const opaque: Check = { id: "opaque-background", label: "Opaque background", severity: "block" }
const lowRes: Check = { id: "low-resolution", label: "Low resolution (24×24)", severity: "block" }
const raster: Check = { id: "raster", label: "Raster, SVG preferred", severity: "warn" }

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
function shield(fill: string, inner: string) {
	return `<svg viewBox="0 0 64 64"><path d="M32 6l20 7v15c0 14-9 24-20 29C21 52 12 42 12 28V13z" fill="${fill}"/><rect x="24" y="26" width="16" height="13" rx="2" fill="${inner}"/><path d="M27 26v-4a5 5 0 0 1 10 0v4" stroke="${inner}" stroke-width="3" fill="none"/></svg>`
}
function shieldWordmark(fill: string) {
	return `<svg viewBox="0 0 200 48"><path d="M24 4l16 6v11c0 11-7 18-16 22C15 39 8 32 8 21V10z" fill="${fill}"/><text x="50" y="33" font-family="ui-sans-serif,system-ui,sans-serif" font-size="24" font-weight="700" fill="${fill}">vaultkeeper</text></svg>`
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
function sonarr(ring: string, inner: string, badge = "") {
	const tag = badge
		? `<rect x="34" y="40" width="26" height="16" rx="4" fill="#111827"/><text x="47" y="52" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" font-weight="800" fill="#fbbf24" text-anchor="middle">${badge}</text>`
		: ""
	return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="none" stroke="${ring}" stroke-width="7"/><circle cx="32" cy="32" r="13" fill="${inner}"/><path d="M32 7v12M32 45v12M7 32h12M45 32h12" stroke="${ring}" stroke-width="4"/>${tag}</svg>`
}

let counter = 0
const v = (kind: string, a: Asset): Variant => ({ id: `v${++counter}`, kind, asset: a })
const base = (props: Partial<Submission> & Pick<Submission, "id" | "contributor" | "created" | "slug" | "variants">): Submission => ({
	note: "",
	round: 1,
	type: "new",
	aliases: [],
	categories: [],
	...props,
})

const luneAt = ago(42)
const luneColours: Record<string, [string, string, boolean]> = {
	"self-host": ["#2563eb", "#22c55e", false],
	"self-host-light": ["#f4f4f5", "#86efac", false],
	"self-host-dark": ["#18181b", "#15803d", false],
	"self-host-white": ["#ffffff", "#bbf7d0", false],
	"self-host-black": ["#000000", "#166534", false],
	"self-host-animated": ["#2563eb", "#22c55e", true],
	"self-host-animated-dark": ["#18181b", "#15803d", true],
}
const lune = Object.entries(luneColours).map(([slug, [fill, accent, animated]], index) =>
	base({
		id: `sub-lune-${index + 1}`,
		contributor: "lune-agent",
		created: luneAt,
		slug,
		note: "Automated upload: self-host logo set.",
		categories: ["Self-Hosting"],
		variants: [v("base", asset(server(fill, accent, animated)))],
	}),
)

const rio = base({
	id: "sub-rio",
	contributor: "rio",
	created: ago(60 * 7),
	slug: "self-host",
	note: "Self-host logo with light/dark and the animated versions as custom variants.",
	aliases: ["selfhost", "homelab"],
	categories: ["Self-Hosting"],
	variants: [
		v("base", asset(server("#2563eb", "#22c55e"))),
		v("light", asset(server("#f4f4f5", "#86efac"))),
		v("dark", asset(server("#18181b", "#15803d"))),
		v("animated", asset(server("#2563eb", "#22c55e", true))),
		v("animated-dark", asset(server("#18181b", "#15803d", true))),
	],
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
const pkrzAt = ago(180)
const pkrz = fileTypes.map(([slug, label, color]) =>
	base({
		id: `sub-pkrz-${slug}`,
		contributor: "pkrz",
		created: pkrzAt,
		slug,
		note: "File-type icon set for file browser dashboards.",
		categories: ["File Types"],
		aliases: [label.toLowerCase()],
		variants: [
			slug === "music" ? v("base", asset(pixelDoc(color), [lowRes, raster], "png", "24×24")) : v("base", asset(doc(label, color))),
		],
	}),
)

const sonarrPublished: Published = {
	variants: [
		v("base", asset(sonarr("#35c5f4", "#ffffff"))),
		v("light", asset(sonarr("#e0f2fe", "#ffffff"))),
		v("dark", asset(sonarr("#0c4a6e", "#e5e7eb"))),
	],
	aliases: ["sonarr-tv"],
	categories: ["Media", "Arr"],
}
const sonarrDelta: UpdateDelta = {
	add: [v("4k", asset(sonarr("#35c5f4", "#ffffff", "4K")))],
	replace: [v("dark", asset(sonarr("#082f49", "#94a3b8")))],
	remove: [],
	aliases: { add: ["sonarr-4k"], remove: [] },
	categories: { add: [], remove: [] },
}
const vaultPublished: Published = {
	variants: [
		v("base", asset(shield("#175ddc", "#ffffff"))),
		v("light", asset(shield("#f4f4f5", "#18181b"))),
		v("dark", asset(shield("#0f172a", "#e2e8f0"))),
		v("wordmark", asset(shieldWordmark("#175ddc"))),
	],
	aliases: ["vaultkeeper-server"],
	categories: ["Security", "Password Managers"],
}
const vaultDelta: UpdateDelta = {
	add: [],
	replace: [],
	remove: ["wordmark"],
	aliases: { add: [], remove: ["vaultkeeper-server"] },
	categories: { add: [], remove: [] },
}
function applyDelta(published: Published, delta: UpdateDelta): Variant[] {
	const kept = published.variants
		.filter((entry) => !delta.remove.includes(entry.kind))
		.map((entry) => delta.replace.find((next) => next.kind === entry.kind) || entry)
	return [...kept, ...delta.add]
}

const sonarrUpdate = base({
	id: "sub-mara-sonarr",
	contributor: "mara",
	created: ago(60 * 26),
	type: "update",
	slug: "sonarr",
	note: "Adds the 4K badge variant used by Sonarr 4K instances; the dark variant had wrong colours.",
	published: sonarrPublished,
	delta: sonarrDelta,
	aliases: [...sonarrPublished.aliases, ...sonarrDelta.aliases.add],
	categories: sonarrPublished.categories,
	variants: applyDelta(sonarrPublished, sonarrDelta),
})
const vaultUpdate = base({
	id: "sub-devon-vault",
	contributor: "devon",
	created: ago(60 * 30),
	type: "update",
	slug: "vaultkeeper",
	note: "The wordmark is the pre-rebrand one and is no longer used anywhere. Please remove it (and the old alias).",
	published: vaultPublished,
	delta: vaultDelta,
	aliases: [],
	categories: vaultPublished.categories,
	variants: applyDelta(vaultPublished, vaultDelta),
})

const bookshelf = base({
	id: "sub-jdoe",
	contributor: "jdoe",
	created: ago(60 * 5),
	slug: "bookshelf",
	note: "Bookshelf reading tracker",
	categories: ["Books", "Media"],
	variants: [v("base", asset(books(true), [opaque, raster], "png", "512×512"))],
})

const pulsar = base({
	id: "sub-tomasz",
	contributor: "tomasz",
	created: ago(60 * 9),
	slug: "pulsar",
	note: "Pulsar (monitoring). Includes the wordmark trio for wide tiles.",
	aliases: ["pulsar-monitor"],
	categories: ["Monitoring"],
	variants: [
		v("base", asset(pulsarMark("#8b5cf6"))),
		v("wordmark", asset(pulsarWordmark("#8b5cf6", "#8b5cf6"))),
		v("wordmark-light", asset(pulsarWordmark("#ede9fe", "#fafafa"))),
		v("wordmark-dark", asset(pulsarWordmark("#4c1d95", "#18181b"))),
	],
})

const grocyPrevious = [v("base", asset(basket("#16a34a", "#bbf7d0", true), [opaque]))]
const grocy = base({
	id: "sub-ana",
	contributor: "ana",
	created: ago(60 * 3),
	round: 2,
	slug: "grocy-lite",
	note: "Removed the background and added the dark version as asked.",
	aliases: ["grocy"],
	categories: ["Home", "Inventory"],
	history: {
		round: 1,
		reviewer: "ajnart",
		at: ago(60 * 30),
		reason: "Please remove the background and use transparency.",
		previous: grocyPrevious,
		changes: ["base replaced (background removed)", "dark added"],
	},
	variants: [v("base", asset(basket("#16a34a", "#bbf7d0", false))), v("dark", asset(basket("#14532d", "#4ade80", false)))],
})

const kioskDevon = base({
	id: "sub-devon-kiosk",
	contributor: "devon",
	created: ago(60 * 52),
	slug: "kiosk-panel",
	note: "Kiosk Panel – wall-mounted dashboard frontend.",
	categories: ["Dashboards"],
	variants: [v("base", asset(kiosk("#0ea5e9", "#e0f2fe")))],
})
const kioskKiki = base({
	id: "sub-kiki",
	contributor: "kiki",
	created: ago(35),
	slug: "kiosk-panel",
	note: "kiosk-panel icon + dark",
	categories: ["Dashboards"],
	variants: [v("base", asset(kiosk("#f97316", "#ffedd5"))), v("dark", asset(kiosk("#27272a", "#d4d4d8")))],
})

export const initialSubmissions: Submission[] = [
	...lune,
	kioskKiki,
	grocy,
	...pkrz,
	bookshelf,
	rio,
	pulsar,
	sonarrUpdate,
	vaultUpdate,
	kioskDevon,
]

export interface Reason {
	key: string
	text: string
	final: boolean
}
export const reasons: Reason[] = [
	{ key: "svg", text: "Please provide a clean SVG vector file.", final: false },
	{ key: "transparent", text: "Please remove the background and use transparency.", final: false },
	{ key: "quality", text: "The icon is too small or blurry. Please upload a higher-quality asset.", final: false },
	{ key: "official", text: "Please use the official logo and correct its proportions.", final: false },
	{ key: "variant-of", text: "This should be a variant of another icon. Please resubmit it as an update to that icon.", final: false },
	{ key: "exists", text: "This icon is already in the collection.", final: true },
	{ key: "political", text: "Political submissions are not accepted.", final: true },
	{ key: "personal", text: "This is a personal or non-public resource.", final: true },
	{ key: "irrelevant", text: "This icon is not relevant for our collection.", final: true },
]
export function variantOfText(parent: string) {
	return `This should be a variant of ${parent}. Please resubmit it as an update to ${parent}.`
}

export function fileName(slug: string, variant: Pick<Variant, "kind" | "asset">) {
	if (variant.kind === "base") return `${slug}.${variant.asset.format}`
	return `${slug}-${variant.kind}.${variant.asset.format}`
}
export function isCustom(kind: string) {
	return !(wellKnown as readonly string[]).includes(kind)
}
export function kindLabel(kind: string) {
	const labels: Record<string, string> = {
		base: "Base",
		light: "Light",
		dark: "Dark",
		wordmark: "Wordmark",
		"wordmark-light": "Wordmark light",
		"wordmark-dark": "Wordmark dark",
	}
	return labels[kind] || kind
}
export function intendedBackground(kind: string): "light" | "dark" | "any" {
	if (kind === "light" || kind.endsWith("-light")) return "dark"
	if (kind === "dark" || kind.endsWith("-dark")) return "light"
	return "any"
}
export function backgroundHint(kind: string) {
	const intended = intendedBackground(kind)
	if (intended === "dark") return "for dark backgrounds"
	if (intended === "light") return "for light backgrounds"
	return "colour"
}
export function blocking(variant: Variant) {
	return variant.asset.checks.some((check) => check.severity === "block")
}
export function batchKey(sub: Submission) {
	return `${sub.contributor}@${sub.created}`
}

export type Change = "added" | "replaced" | "removed" | "unchanged"
export interface Row {
	kind: string
	published?: Variant
	proposed?: Variant
	change: Change
}
export function rows(sub: Submission): Row[] {
	if (sub.type === "new" || !sub.published || !sub.delta)
		return sub.variants.map((proposed) => ({ kind: proposed.kind, proposed, change: "added" }))
	const delta = sub.delta
	const result: Row[] = sub.published.variants.map((published) => {
		if (delta.remove.includes(published.kind)) return { kind: published.kind, published, change: "removed" }
		const replaced = delta.replace.find((entry) => entry.kind === published.kind)
		if (replaced) return { kind: published.kind, published, proposed: replaced, change: "replaced" }
		return { kind: published.kind, published, proposed: published, change: "unchanged" }
	})
	return [...result, ...delta.add.map((proposed) => ({ kind: proposed.kind, proposed, change: "added" as Change }))]
}

const toneWords: Record<string, string> = { white: "light", black: "dark" }
export interface Hint {
	type: "variant-of" | "collision"
	text: string
	parent?: string
	submissionId?: string
	suggestedKind?: string
}
export function hints(sub: Submission, all: Submission[]): Hint[] {
	const result: Hint[] = []
	for (const other of all) {
		if (other.id === sub.id) continue
		if (other.slug === sub.slug && other.contributor !== sub.contributor)
			result.push({
				type: "collision",
				text: `${sub.slug} is also pending from @${other.contributor}`,
				submissionId: other.id,
			})
		if (other.contributor === sub.contributor && sub.slug.startsWith(`${other.slug}-`) && other.type === "new") {
			const shorter = all.some(
				(entry) => entry.contributor === sub.contributor && entry.slug.length < other.slug.length && sub.slug.startsWith(`${entry.slug}-`),
			)
			if (shorter) continue
			const suffix = sub.slug.slice(other.slug.length + 1)
			const suggestedKind = suffix
				.split("-")
				.map((part) => toneWords[part] || part)
				.join("-")
			result.push({
				type: "variant-of",
				text: `${sub.slug} looks like the ${suggestedKind} variant of ${other.slug} (pending, same contributor)`,
				parent: other.slug,
				submissionId: other.id,
				suggestedKind,
			})
		}
	}
	return result
}
