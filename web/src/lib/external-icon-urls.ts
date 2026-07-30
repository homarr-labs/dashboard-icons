import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import type { ExternalIcon } from "@/types/icons"

const FALLBACK_URL_BUILDERS: Partial<
	Record<ExternalSourceId, (cdnBase: string, slug: string, format: string, variant?: string) => string>
> = {
	selfhst: (cdnBase, slug, format, variant) => {
		const suffix = variant ? `-${variant}` : ""
		return `${cdnBase}/${format}/${slug}${suffix}.${format}`
	},
}

export function canResolveExternalIconUrl(icon: Pick<ExternalIcon, "source" | "url_templates">, key: string): boolean {
	const templates = icon.url_templates ?? {}
	return !!templates[key] || !!FALLBACK_URL_BUILDERS[icon.source]
}

export function resolveExternalIconUrl(icon: Pick<ExternalIcon, "source" | "slug" | "url_templates">, key: string): string {
	const templates = icon.url_templates ?? {}
	const template = templates[key]
	if (template) return template.replace("{slug}", icon.slug)

	const parts = key.split("_")
	const format = parts[0]
	const variant = parts[1]
	const sourceConfig = EXTERNAL_SOURCES[icon.source]
	const buildUrl = FALLBACK_URL_BUILDERS[icon.source]
	if (buildUrl) return buildUrl(sourceConfig?.cdnBase ?? "", icon.slug, format, variant)

	return `${sourceConfig?.cdnBase ?? ""}/${format}/${icon.slug}.${format}`
}

export function getExternalIconPreviewUrl(icon: ExternalIcon): string {
	const formats = icon.formats ?? []
	const format = formats.includes("svg") ? "svg" : formats.includes("png") ? "png" : formats[0] || "svg"
	return resolveExternalIconUrl(icon, format)
}

export function getExternalIconThemedPreviewUrl(icon: ExternalIcon, theme: "light" | "dark"): string {
	const variants = icon.variants ?? {}
	if (variants.light && variants.dark) {
		const format = (icon.formats ?? []).includes("png") ? "png" : (icon.formats ?? []).includes("webp") ? "webp" : null
		const key = format ? `${format}_${theme}` : null
		if (key && canResolveExternalIconUrl(icon, key)) return resolveExternalIconUrl(icon, key)
	}
	return getExternalIconPreviewUrl(icon)
}
