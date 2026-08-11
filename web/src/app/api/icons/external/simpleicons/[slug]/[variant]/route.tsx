import { ImageResponse } from "next/og"
import { resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getExternalIconBySourceAndSlug } from "@/lib/external-icons"

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

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "transparent",
			}}
		>
			{/* biome-ignore lint/performance/noImgElement: ImageResponse requires a native image element */}
			<img src={svgUrl} alt="" width={PNG_SIZE} height={PNG_SIZE} style={{ objectFit: "contain" }} />
		</div>,
		{
			width: PNG_SIZE,
			height: PNG_SIZE,
			headers: {
				"Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
			},
		},
	)
}
