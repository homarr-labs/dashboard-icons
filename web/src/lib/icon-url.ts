import { getExternalIconPreviewUrl } from "@/lib/external-icon-urls"
import { buildIconUrl, type IconFormat } from "@/lib/icons/urls"
import type { IconWithName } from "@/types/icons"

function resolveFormat(base: IconWithName["data"]["base"]): IconFormat {
	if (base === "png" || base === "webp") return base
	return "svg"
}

export function getIconImageUrl(icon: IconWithName): string {
	if (icon.source && icon.source !== "native" && icon.external) {
		return getExternalIconPreviewUrl(icon.external)
	}

	const { base } = icon.data
	if (typeof base === "string" && base.startsWith("http")) {
		return base
	}

	return buildIconUrl(icon.name, resolveFormat(base))
}
