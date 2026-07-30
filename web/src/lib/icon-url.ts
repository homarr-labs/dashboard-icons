import { BASE_URL, type ExternalSourceId } from "@/constants"
import { getExternalIconPreviewUrl } from "@/lib/external-icon-urls"
import { buildIconUrl } from "@/lib/icons/urls"
import type { IconWithName } from "@/types/icons"

export function getIconImageUrl(icon: IconWithName): string {
	const { name, data: iconData, source, external } = icon

	if (source && source !== "native" && external) {
		return getExternalIconPreviewUrl(external)
	}

	if (typeof iconData.base === "string" && iconData.base.startsWith("http")) {
		return iconData.base
	}

	const base = typeof icon.base === "string" && !icon.base.startsWith("http") ? icon.base : "svg"
	return buildIconUrl(name, format, theme)
}
