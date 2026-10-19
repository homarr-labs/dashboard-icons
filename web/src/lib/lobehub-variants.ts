import { EXTERNAL_SOURCES, type ExternalToneKey } from "@/constants"
import type { ExternalIcon } from "@/types/icons"

export const LOBEHUB_VARIANTS = [
	{ name: "monochrome", label: "Monochrome", description: "The single-colour icon." },
	{ name: "brand-color", label: "Brand color", description: "The brand mark in its original colours." },
	{ name: "brand", label: "Brand mark", description: "The alternative brand mark." },
	{ name: "text", label: "Text", description: "A wordmark showing the brand name." },
	{ name: "text-color", label: "Text (color)", description: "A wordmark in brand colours." },
	{ name: "text-cn", label: "Text (Chinese)", description: "A wordmark showing the brand name in Chinese." },
	{ name: "combine", label: "Combined", description: "The icon and wordmark together." },
	{ name: "avatar", label: "Avatar", description: "The avatar artwork." },
] as const

export type LobehubVariant = (typeof LOBEHUB_VARIANTS)[number]

export function getLobehubBaseSlug(slug: string): string {
	return slug.replace(/-(brand-color|text-color|text-cn|color|text|combine|avatar|brand)$/, "")
}

export function isLobehubVariantAlias(icon: Pick<ExternalIcon, "source" | "slug" | "aliases">, slug: string): boolean {
	return icon.source === "lobehub" && slug !== icon.slug && getLobehubBaseSlug(slug) === icon.slug && icon.aliases.includes(slug)
}

export function getLobehubVariantUrlKey(
	icon: Pick<ExternalIcon, "source" | "url_templates">,
	format: string,
	name: string,
	tone?: ExternalToneKey,
): string | null {
	if (icon.source !== "lobehub") return null
	let key = `${format}_${name}`
	if (format !== "svg" && tone) key += `_${EXTERNAL_SOURCES.lobehub.toneKeys[tone]}`
	if (!icon.url_templates[key]) return null
	return key
}

export function getLobehubVariants(icon: Pick<ExternalIcon, "source" | "url_templates">) {
	if (icon.source !== "lobehub") return []
	return LOBEHUB_VARIANTS.filter((variant) => ["svg", "png", "webp"].some((format) => icon.url_templates[`${format}_${variant.name}`]))
}
