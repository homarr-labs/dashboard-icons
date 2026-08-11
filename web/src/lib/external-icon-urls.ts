import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import type { ExternalIcon, ExternalIconUrlData } from "@/types/icons"

const FALLBACK_URL_BUILDERS: Partial<
	Record<ExternalSourceId, (cdnBase: string, slug: string, format: string, variant?: string, brandColor?: string) => string>
> = {
	selfhst: (cdnBase, slug, format, variant) => {
		const suffix = variant ? `-${variant}` : ""
		return `${cdnBase}/${format}/${slug}${suffix}.${format}`
	},
	simpleicons: (cdnBase, slug, format, variant, brandColor) => {
		if (format === "png") return `/api/icons/external/simpleicons/${slug}/${variant || "brand"}.png`
		if (variant === "auto") return `${cdnBase}/${slug}/000000/FFFFFF`
		if (variant === "light") return `${cdnBase}/${slug}/000000`
		if (variant === "dark") return `${cdnBase}/${slug}/FFFFFF`
		return brandColor ? `${cdnBase}/${slug}/${brandColor}` : `${cdnBase}/${slug}`
	},
}

export function canResolveExternalIconUrl(icon: Pick<ExternalIcon, "source" | "url_templates">, key: string): boolean {
	const templates = icon.url_templates ?? {}
	if (templates[key]) return true

	switch (icon.source) {
		case "simpleicons":
			return /^(svg|png)(_(light|dark|auto))?$/.test(key)
		case "selfhst":
			return /^(svg|png|webp)(_(light|dark))?$/.test(key)
		default:
			return false
	}
}

export function resolveExternalIconUrl(icon: Pick<ExternalIcon, "source" | "slug" | "url_templates" | "brand_color">, key: string): string {
	const templates = icon.url_templates ?? {}
	const template = templates[key]
	if (template) {
		return template.replaceAll("{slug}", icon.slug).replaceAll("{hex}", icon.brand_color ?? "")
	}

	const parts = key.split("_")
	const format = parts[0]
	const variant = parts[1]
	const sourceConfig = EXTERNAL_SOURCES[icon.source]
	const buildUrl = FALLBACK_URL_BUILDERS[icon.source]
	if (buildUrl) return buildUrl(sourceConfig?.cdnBase ?? "", icon.slug, format, variant, icon.brand_color)

	return `${sourceConfig?.cdnBase ?? ""}/${format}/${icon.slug}.${format}`
}

export function getExternalIconPreviewUrl(icon: ExternalIconUrlData): string {
	if (icon.url_templates?.svg_auto || icon.source === "simpleicons") return resolveExternalIconUrl(icon, "svg_auto")

	const formats = icon.formats ?? []
	const format = formats.includes("svg") ? "svg" : formats.includes("png") ? "png" : formats[0] || "svg"
	return resolveExternalIconUrl(icon, format)
}
