import type { IconVariantMatch } from "@/lib/icons/variants"

export type IconTone = "light" | "dark"

export type IconImageVariant =
	| { kind: "base" }
	| { kind: "tone"; tone: IconTone; monochrome: boolean }
	| { kind: "wordmark"; tone: IconTone | "default" }
	| { kind: "named"; name: string; label: string; tone?: IconTone }
	| { kind: "custom"; name: string }

export const ICON_TONES: readonly IconTone[] = ["light", "dark"]

export const TONE_TITLE: Record<IconTone, string> = {
	light: "Light",
	dark: "Dark",
}

export const TONE_BACKGROUND: Record<IconTone, string> = {
	light: "dark backgrounds",
	dark: "light backgrounds",
}

const MONOCHROME_TONE_NAME: Record<IconTone, string> = {
	light: "white",
	dark: "black",
}

export function getToneEntries(files: Partial<Record<IconTone, string>> | undefined) {
	return ICON_TONES.flatMap((tone) => {
		const fileName = files?.[tone]
		if (!fileName) return []
		return [{ tone, fileName }]
	})
}

function describeToneVariant(tone: IconTone, monochrome: boolean) {
	if (monochrome) return `${MONOCHROME_TONE_NAME[tone]} variant for ${TONE_BACKGROUND[tone]}`
	return `${tone} variant for ${TONE_BACKGROUND[tone]}`
}

export function getToneDescription(tone: IconTone, monochrome: boolean) {
	const description = describeToneVariant(tone, monochrome)
	return `${description.charAt(0).toUpperCase()}${description.slice(1)}.`
}

export function getToneLabel(tone: IconTone, subject?: string) {
	if (subject) return `${TONE_TITLE[tone]} ${subject} (for ${TONE_BACKGROUND[tone]})`
	return `${TONE_TITLE[tone]} (for ${TONE_BACKGROUND[tone]})`
}

export function getIconVariantLabel(variant: Pick<IconVariantMatch, "label">) {
	return variant.label.replace(/\b\w+/g, (word) => {
		if (/^\d+[a-z]+$/i.test(word)) return word.toUpperCase()
		return word.charAt(0).toUpperCase() + word.slice(1)
	})
}

export function getIconImageVariant(variant: IconVariantMatch): IconImageVariant {
	switch (variant.key) {
		case "default":
			return { kind: "base" }
		case "light":
		case "dark":
			return { kind: "tone", tone: variant.key, monochrome: false }
		case "wordmark":
			return { kind: "wordmark", tone: "default" }
		case "wordmark-light":
			return { kind: "wordmark", tone: "light" }
		case "wordmark-dark":
			return { kind: "wordmark", tone: "dark" }
		default:
			return { kind: "custom", name: getIconVariantLabel(variant) }
	}
}

export function buildIconAltText(displayName: string, variant: IconImageVariant, format?: string) {
	const formatName = format === "webp" ? "WebP" : format?.toUpperCase()
	const formatLabel = formatName ? ` (${formatName})` : ""

	switch (variant.kind) {
		case "base":
			return `${displayName} logo${formatLabel}`
		case "tone":
			return `${displayName} logo, ${describeToneVariant(variant.tone, variant.monochrome)}${formatLabel}`
		case "wordmark":
			if (variant.tone === "default") return `${displayName} wordmark logo, in colour${formatLabel}`
			return `${displayName} wordmark logo, ${describeToneVariant(variant.tone, false)}${formatLabel}`
		case "named":
			if (variant.tone) return `${displayName} logo, ${variant.label}, ${describeToneVariant(variant.tone, false)}${formatLabel}`
			return `${displayName} logo, ${variant.label} variant${formatLabel}`
		case "custom":
			return `${displayName} ${variant.name} logo${formatLabel}`
	}
}
