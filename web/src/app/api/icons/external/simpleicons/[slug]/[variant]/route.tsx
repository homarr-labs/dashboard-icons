import { getExternalIconBySourceAndSlug } from "@/lib/external-icons"
import { rasterizeRemoteSvg } from "@/lib/rasterize-svg"

const PNG_SIZE = 640
const SIMPLE_ICONS_SVG_CDN = "https://cdn.jsdelivr.net/npm/simple-icons"

const VARIANT_FILLS = {
	brand: (brandColor?: string) => (brandColor ? `#${brandColor}` : undefined),
	light: () => "#000000",
	dark: () => "#FFFFFF",
}

function isSupportedVariant(variant: string): variant is keyof typeof VARIANT_FILLS {
	return Object.hasOwn(VARIANT_FILLS, variant)
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; variant: string }> }) {
	const { slug, variant: rawVariant } = await params
	const variant = rawVariant.replace(/\.png$/, "")

	if (!isSupportedVariant(variant)) return new Response("Unknown Simple Icons color variant", { status: 400 })

	const icon = await getExternalIconBySourceAndSlug("simpleicons", slug)
	if (!icon) return new Response("Simple Icon not found", { status: 404 })

	const version = encodeURIComponent(icon.external.upstream_version || "latest")
	const canonicalSlug = encodeURIComponent(icon.external.slug)
	const svgUrl = `${SIMPLE_ICONS_SVG_CDN}@${version}/icons/${canonicalSlug}.svg`
	const fillColor = VARIANT_FILLS[variant](icon.external.brand_color)

	try {
		const png = await rasterizeRemoteSvg(svgUrl, PNG_SIZE, fillColor)
		return new Response(png, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
			},
		})
	} catch {
		return new Response("Unable to generate Simple Icons PNG", {
			status: 502,
			headers: { "Cache-Control": "no-store" },
		})
	}
}
