import { getExternalIconPreviewUrl } from "@/lib/external-icon-urls"
import { buildIconUrl, getBaseIconFormat, type IconFormat } from "@/lib/icons/urls"
import type { IconVariantMatch } from "@/lib/icons/variants"
import type { IconSearchEntry } from "@/types/icons"

export function isIconAssetUrl(base: string): boolean {
	return base.startsWith("/") || /^https?:\/\//.test(base)
}

function getKnownPreviewFormat(icon: IconSearchEntry, stem: string): IconFormat | undefined {
	const formats = icon.nativePreviewFormats
	if (formats && Object.hasOwn(formats, stem)) return formats[stem]
}

function resolveIconPreview(icon: IconSearchEntry, stem: string): { url: string; stem?: string } {
	if (icon.source && icon.source !== "native" && icon.external) {
		return { url: getExternalIconPreviewUrl(icon.external) }
	}

	const { base } = icon.data
	if (isIconAssetUrl(base)) {
		return { url: base }
	}

	if (stem !== icon.name) {
		const format = getKnownPreviewFormat(icon, stem)
		if (format) return { url: buildIconUrl(stem, format), stem }
	}

	const baseFormat = getKnownPreviewFormat(icon, icon.name) ?? getBaseIconFormat(base)
	return { url: buildIconUrl(icon.name, baseFormat), stem: icon.name }
}

export function getIconImageUrl(icon: IconSearchEntry, stem = icon.name): string {
	return resolveIconPreview(icon, stem).url
}

export function getIconSearchPreview(
	icon: IconSearchEntry,
	match?: IconVariantMatch,
): { url: string; variant?: IconVariantMatch; variantLabel?: string } {
	const { url, stem } = resolveIconPreview(icon, match?.stem ?? icon.name)
	if (!match || stem === undefined) return { url }

	if (match.stem === stem) {
		return { url, variant: match, variantLabel: `${match.label} variant` }
	}
	return { url, variantLabel: "Base preview" }
}
