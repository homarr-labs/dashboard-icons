import { resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySourceAndSlug } from "@/lib/external-icons"
import { rasterizeRemoteSvg } from "@/lib/rasterize-svg"

const PNG_SIZE = 640
const VARIANT_KEYS = {
	brand: "svg",
	light: "svg_light",
	dark: "svg_dark",
} as const

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; variant: string }> }) {
	const { slug, variant: rawVariant } = await params
	const variant = rawVariant.replace(/\.png$/, "") as keyof typeof VARIANT_KEYS
	const svgKey = VARIANT_KEYS[variant]

	if (!svgKey) return new Response("Unknown Simple Icons color variant", { status: 400 })

	const icon = await getExternalIconBySourceAndSlug("simpleicons", slug)
	if (!icon) return new Response("Simple Icon not found", { status: 404 })

	// Keep this server-side fetch pinned to the official Simple Icons CDN even if
	// a stored URL template is accidentally or maliciously changed.
	const svgUrl = resolveExternalIconUrl({ ...icon.external, url_templates: {} }, svgKey)

	try {
		const png = await rasterizeRemoteSvg(svgUrl, PNG_SIZE)
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
