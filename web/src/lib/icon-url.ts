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

export function getIconImageUrl(icon: IconSearchEntry, stem = icon.name): string {
	if (icon.source && icon.source !== "native" && icon.external) {
		return getExternalIconPreviewUrl(icon.external)
	}

	const { base } = icon.data
	if (isIconAssetUrl(base)) {
		return base
	}

	const format = getKnownPreviewFormat(icon, stem)
	if (format) return buildIconUrl(stem, format)

	return buildIconUrl(icon.name, getKnownPreviewFormat(icon, icon.name) ?? getBaseIconFormat(base))
}

export function getIconSearchPreview(
	icon: IconSearchEntry,
	match?: IconVariantMatch,
): { url: string; variant?: IconVariantMatch; variantLabel?: string } {
	const url = getIconImageUrl(icon, match?.stem)
	if (!match) return { url }

	const label = `${match.label} variant`
	if (match.stem === icon.name || getKnownPreviewFormat(icon, match.stem)) {
		return { url, variant: match, variantLabel: label }
	}
	return { url, variantLabel: `Base preview · ${label}` }
}
