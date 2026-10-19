export type IconTone = "light" | "dark"

export type IconImageVariant =
	| { kind: "base" }
	| { kind: "tone"; tone: IconTone; monochrome: boolean }
	| { kind: "wordmark"; tone: IconTone }

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

export function buildIconAltText(displayName: string, variant: IconImageVariant, format?: string) {
	const formatLabel = format ? ` (${format.toUpperCase()})` : ""

	switch (variant.kind) {
		case "base":
			return `${displayName} logo${formatLabel}`
		case "tone":
			return `${displayName} logo, ${describeToneVariant(variant.tone, variant.monochrome)}${formatLabel}`
		case "wordmark":
			return `${displayName} wordmark logo, ${describeToneVariant(variant.tone, false)}${formatLabel}`
	}
}
