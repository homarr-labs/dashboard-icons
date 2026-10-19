import "server-only"

import nativeIconFiles from "@/lib/icons/native-icon-files.json"
import type { IconFormat } from "@/lib/icons/urls"
import { type IconVariant, resolveIconVariants } from "@/lib/icons/variants"
import type { Icon } from "@/types/icons"

export type NativeIconVariant = IconVariant & { formats: IconFormat[] }

const formatsByStem = new Map<string, IconFormat[]>()

for (const [group, stems] of Object.entries(nativeIconFiles)) {
	const formats = group.split(",").filter((format): format is IconFormat => format === "svg" || format === "png" || format === "webp")
	for (const stem of stems) formatsByStem.set(stem, formats)
}

export function getNativeIconFormats(stem: string): IconFormat[] {
	return formatsByStem.get(stem) ?? []
}

export function getNativeIconVariants(name: string, data: Icon): NativeIconVariant[] {
	return resolveIconVariants(name, data).flatMap((variant) => {
		const formats = formatsByStem.get(variant.stem)
		if (!formats?.length) return []
		return [{ ...variant, formats }]
	})
}
