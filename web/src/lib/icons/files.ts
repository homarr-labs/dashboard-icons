import "server-only"

import nativeIconFiles from "@/lib/icons/native-icon-files.json"
import { getBaseIconFormat, type IconFormat } from "@/lib/icons/urls"
import { type IconVariant, resolveIconVariants } from "@/lib/icons/variants"
import type { Icon } from "@/types/icons"

export type NativeIconVariant = IconVariant & { formats: IconFormat[] }

const formatsByStem = new Map<string, IconFormat[]>()

for (const [group, stems] of Object.entries(nativeIconFiles)) {
	const formats = group.split(",").filter((format): format is IconFormat => format === "svg" || format === "png" || format === "webp")
	for (const stem of stems) formatsByStem.set(stem, formats)
}

export function getNativeIconVariants(name: string, data: Icon): NativeIconVariant[] {
	return resolveIconVariants(name, data).flatMap((variant) => {
		const formats = formatsByStem.get(variant.stem)
		if (!formats?.length) return []
		return [{ ...variant, formats }]
	})
}

export function getNativeIconPreviewFormats(name: string, data: Icon): Partial<Record<string, IconFormat>> | undefined {
	const preferredFormat = getBaseIconFormat(data.base)
	const previews: [string, IconFormat][] = []
	for (const { stem, formats } of getNativeIconVariants(name, data)) {
		let format = formats[0]
		if (formats.includes(preferredFormat)) format = preferredFormat
		// The browser already has the Base format from metadata.
		if (stem !== name || format !== preferredFormat) previews.push([stem, format])
	}
	if (previews.length > 0) return Object.fromEntries(previews)
}
