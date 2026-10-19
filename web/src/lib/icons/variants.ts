import type { Icon, IconSearchEntry } from "@/types/icons"
import { declaredVariantStems, RESERVED_VARIANT_NAMES } from "../../../backend/pb_hooks/variant-policy.js"

export { RESERVED_VARIANT_NAMES } from "../../../backend/pb_hooks/variant-policy.js"

export type IconVariantMatch = {
	key: string
	label: string
	stem: string
}

export type IconVariant = IconVariantMatch & { keys: string[] }

type VariantSource = Partial<Pick<Icon, "colors" | "wordmark" | "variants">>

type VariantTone = "light" | "dark"

type WellKnownVariant = {
	label: string
	terms: string[]
	tone?: VariantTone
}

type VariantTerm = IconVariantMatch & { words: string[] }

const LIGHT_TERMS = ["light", "white", "for dark background", "for dark backgrounds"]
const DARK_TERMS = ["dark", "black", "for light background", "for light backgrounds"]
const WORDMARK_TERMS = ["wordmark", "text logo", "logo text", "logotype"]

function combine(first: string[], second: string[]): string[] {
	return first.flatMap((a) => second.flatMap((b) => [`${a} ${b}`, `${b} ${a}`]))
}

const WELL_KNOWN_VARIANTS: Record<string, WellKnownVariant> = {
	default: { label: "Base", terms: [] },
	light: { label: "Light", terms: LIGHT_TERMS, tone: "light" },
	dark: { label: "Dark", terms: DARK_TERMS, tone: "dark" },
	wordmark: { label: "Wordmark", terms: WORDMARK_TERMS },
	"wordmark-light": {
		label: "Wordmark light",
		terms: [...combine(WORDMARK_TERMS, LIGHT_TERMS), ...WORDMARK_TERMS],
		tone: "light",
	},
	"wordmark-dark": {
		label: "Wordmark dark",
		terms: [...combine(WORDMARK_TERMS, DARK_TERMS), ...WORDMARK_TERMS],
		tone: "dark",
	},
}

const TONE_CLASSES: Record<VariantTone, string> = {
	light: "bg-zinc-900 ring-zinc-700",
	dark: "bg-white ring-zinc-200",
}

const variantsByData = new WeakMap<VariantSource, IconVariant[]>()
const termsByData = new WeakMap<VariantSource, VariantTerm[]>()

function wellKnown(key: string): WellKnownVariant | undefined {
	if (!Object.hasOwn(WELL_KNOWN_VARIANTS, key)) return undefined
	return WELL_KNOWN_VARIANTS[key]
}

function labelOf(key: string): string {
	return wellKnown(key)?.label ?? key
}

function termsOf(key: string): string[] {
	return wellKnown(key)?.terms ?? [key.replace(/-/g, " ")]
}

export function variantToneClass(variant: IconVariantMatch | undefined): string | undefined {
	const tone = variant && (wellKnown(variant.key)?.tone ?? customVariantTone(variant.key))
	if (!tone) return undefined
	return TONE_CLASSES[tone]
}

export function customVariantTone(name: string): VariantTone | undefined {
	if (name.endsWith("-dark")) return "dark"
	if (name.endsWith("-light")) return "light"
	return undefined
}

function declaredStems(name: string, data: VariantSource): [string, string | undefined][] {
	return declaredVariantStems(name, data).flatMap(([key, stem]): [string, string][] => {
		if (!key.startsWith("custom:")) return [[key, stem]]
		const name = key.slice(7)
		if (RESERVED_VARIANT_NAMES.includes(name)) return []
		return [[name, stem]]
	})
}

export function resolveIconVariants(name: string, data: VariantSource): IconVariant[] {
	const cached = variantsByData.get(data)
	if (cached) return cached

	const byStem = new Map<string, IconVariant>()
	for (const [key, stem] of declaredStems(name, data)) {
		if (!stem) continue
		const existing = byStem.get(stem)
		if (existing) existing.keys.push(key)
		else byStem.set(stem, { key, label: labelOf(key), stem, keys: [key] })
	}

	const variants = [...byStem.values()]
	variantsByData.set(data, variants)
	return variants
}

function variantTerms(icon: IconSearchEntry): VariantTerm[] {
	const cached = termsByData.get(icon.data)
	if (cached) return cached

	const terms = resolveIconVariants(icon.name, icon.data).flatMap((variant) =>
		variant.keys.flatMap((key) => termsOf(key).map((term) => ({ key, label: labelOf(key), stem: variant.stem, words: term.split(" ") }))),
	)
	termsByData.set(icon.data, terms)
	return terms
}

function endsWithWords(words: string[], term: string[]): boolean {
	const start = words.length - term.length
	return term.every((word, offset) => words[start + offset] === word)
}

export function matchIconVariant(icon: IconSearchEntry, query: string): (IconVariantMatch & { rest: string }) | null {
	if (icon.source && icon.source !== "native") return null
	const words = query.toLowerCase().trim().split(/\s+/)
	if (words.length < 2) return null

	let best: VariantTerm | null = null
	for (const term of variantTerms(icon)) {
		if (term.words.length >= words.length) continue
		if (best && term.words.length <= best.words.length) continue
		if (endsWithWords(words, term.words)) best = term
	}
	if (!best) return null

	return { key: best.key, label: best.label, stem: best.stem, rest: words.slice(0, words.length - best.words.length).join(" ") }
}
