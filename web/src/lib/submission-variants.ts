import { customVariantTone } from "@/lib/icons/variants"

export { customVariantNameError } from "../../backend/pb_hooks/variant-policy.js"

export const SUBMISSION_VARIANTS = ["base", "light", "dark", "wordmark", "wordmark_light", "wordmark_dark"] as const
export type StandardSubmissionVariant = (typeof SUBMISSION_VARIANTS)[number]
export type SubmissionVariant = StandardSubmissionVariant | `custom:${string}`

export type VariantBackground = "any" | "dark" | "light"

export interface VariantKind {
	label: string
	description: string
	background: VariantBackground
	suffix: string
}

export const VARIANT_KINDS: Record<StandardSubmissionVariant, VariantKind> = {
	base: { label: "Base", description: "Colour icon for any background", background: "any", suffix: "" },
	light: { label: "Light", description: "Light-coloured icon for dark backgrounds", background: "dark", suffix: "-light" },
	dark: { label: "Dark", description: "Dark-coloured icon for light backgrounds", background: "light", suffix: "-dark" },
	wordmark: { label: "Wordmark", description: "Colour brand name for any background", background: "any", suffix: "-wordmark" },
	wordmark_light: {
		label: "Wordmark light",
		description: "Light-coloured brand name for dark backgrounds",
		background: "dark",
		suffix: "-wordmark-light",
	},
	wordmark_dark: {
		label: "Wordmark dark",
		description: "Dark-coloured brand name for light backgrounds",
		background: "light",
		suffix: "-wordmark-dark",
	},
}

export function variantKind(variant: SubmissionVariant): VariantKind {
	if (!variant.startsWith("custom:")) return VARIANT_KINDS[variant as StandardSubmissionVariant]
	const name = variant.slice(7)
	let background: VariantBackground = "any"
	let description = "Custom variant for any background"
	if (customVariantTone(name) === "dark") {
		background = "light"
		description = "Dark-coloured Custom variant for light backgrounds"
	}
	if (customVariantTone(name) === "light") {
		background = "dark"
		description = "Light-coloured Custom variant for dark backgrounds"
	}
	return { label: name, description, background, suffix: `-${name}` }
}

export interface VariantExtras {
	colors?: { light?: string; dark?: string }
	wordmark?: { default?: string; light?: string; dark?: string }
	variants?: Record<string, string>
}

export function variantExtras(files: Partial<Record<SubmissionVariant, string>>): VariantExtras {
	const extras: VariantExtras = {}
	if (files.light || files.dark) extras.colors = { light: files.light, dark: files.dark }
	if (files.wordmark || files.wordmark_light || files.wordmark_dark)
		extras.wordmark = { default: files.wordmark, light: files.wordmark_light, dark: files.wordmark_dark }
	const custom = Object.entries(files).flatMap(([key, file]) => (key.startsWith("custom:") && file ? [[key.slice(7), file]] : []))
	if (custom.length) extras.variants = Object.fromEntries(custom)
	return extras
}

export type LabelledAsset = { file: string; variant: SubmissionVariant } | { file: string; variant: null }

export function labelledAssets(extras: VariantExtras | undefined, assets: string[]): LabelledAsset[] {
	const tagged = new Map<string, SubmissionVariant>()
	const tag = (file: string | undefined, variant: SubmissionVariant) => {
		if (file && !tagged.has(file)) tagged.set(file, variant)
	}
	tag(extras?.colors?.light, "light")
	tag(extras?.colors?.dark, "dark")
	tag(extras?.wordmark?.default, "wordmark")
	tag(extras?.wordmark?.light, "wordmark_light")
	tag(extras?.wordmark?.dark, "wordmark_dark")
	for (const [name, file] of Object.entries(extras?.variants ?? {})) tag(file, `custom:${name}`)
	tag(
		assets.find((file) => !tagged.has(file)),
		"base",
	)

	const labelled = assets.map((file): LabelledAsset => {
		const variant = tagged.get(file)
		if (variant) return { file, variant }
		return { file, variant: null }
	})
	return labelled.sort((a, b) => variantOrder(a.variant) - variantOrder(b.variant))
}

function variantOrder(variant: SubmissionVariant | null): number {
	if (!variant) return SUBMISSION_VARIANTS.length
	if (variant.startsWith("custom:")) return SUBMISSION_VARIANTS.length
	return SUBMISSION_VARIANTS.indexOf(variant as StandardSubmissionVariant)
}
