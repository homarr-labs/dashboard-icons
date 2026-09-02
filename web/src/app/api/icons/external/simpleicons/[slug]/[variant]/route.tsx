import { getExternalIconBySourceAndSlug } from "@/lib/external-icons"
import { rasterizeRemoteSvg } from "@/lib/rasterize-svg"

const PNG_SIZE = 640
const SIMPLE_ICONS_SVG_CDN = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons"

const VARIANT_FILLS: Record<string, (brandColor?: string) => string | undefined> = {
	brand: (brandColor) => (brandColor ? `#${brandColor}` : undefined),
	light: () => "#000000",
	dark: () => "#FFFFFF",
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; variant: string }> }) {
	const { slug, variant: rawVariant } = await params
	const variant = rawVariant.replace(/\.png$/, "")
	const getFill = VARIANT_FILLS[variant]

	if (!getFill) return new Response("Unknown Simple Icons color variant", { status: 400 })

	const icon = await getExternalIconBySourceAndSlug("simpleicons", slug)
	if (!icon) return new Response("Simple Icon not found", { status: 404 })

	const svgUrl = `${SIMPLE_ICONS_SVG_CDN}/${slug}.svg`
	const fillColor = getFill(icon.external.brand_color)

	try {
		const png = await rasterizeRemoteSvg(svgUrl, PNG_SIZE, fillColor)
		return new Response(png, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
			},
		})
	} catch {
		return new Response("Unable to generate Simple Icons PNG", { status: 502 })
	}
}
