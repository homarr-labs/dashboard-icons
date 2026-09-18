import { getExternalIconPreviewUrl } from "@/lib/external-icon-urls"
import { buildIconUrl, type IconFormat } from "@/lib/icons/urls"
import type { IconSearchEntry } from "@/types/icons"

export function isIconAssetUrl(base: string): boolean {
	return base.startsWith("/") || /^https?:\/\//.test(base)
}

function resolveFormat(base: IconSearchEntry["data"]["base"]): IconFormat {
	if (base === "png" || base === "webp") return base
	return "svg"
}

export function getIconImageUrl(icon: IconSearchEntry): string {
	if (icon.source && icon.source !== "native" && icon.external) {
		return getExternalIconPreviewUrl(icon.external)
	}

	const { base } = icon.data
	if (isIconAssetUrl(base)) {
		return base
	}

	return buildIconUrl(icon.name, resolveFormat(base))
}
