import { ImageResponse } from "next/og"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params

	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	// Verify icon exists by checking CDN
	const cdnUrl = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${icon}.png`
	const checkRes = await fetch(cdnUrl, { method: "HEAD" })
	if (!checkRes.ok) {
		return new Response("Icon not found", { status: 404 })
	}

	return new ImageResponse(
		<div
			tw="flex h-full w-full flex-col items-center justify-center"
			style={{
				width: "100%",
				height: "100%",
				background: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)",
				fontFamily: "system-ui, sans-serif",
			}}
		>
			{/* Accent bar at top */}
			<div tw="absolute top-0 left-0 right-0 flex h-2" style={{ background: "linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)" }} />

			{/* Icon preview area */}
			<div
				tw="flex items-center justify-center mb-6 rounded-2xl"
				style={{
					width: 120,
					height: 120,
					background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.15))",
					border: "1px solid rgba(168,85,247,0.2)",
				}}
			>
				{/* biome-ignore lint/performance/noImgElement: ImageResponse uses native img, next/Image not supported */}
				<img
					src={`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${icon}.png`}
					alt={`${formattedIconName} icon`}
					tw="object-contain"
					style={{ width: 80, height: 80 }}
				/>
			</div>

			{/* Icon name */}
			<div tw="flex flex-col items-center text-center px-12" style={{ maxWidth: 800 }}>
				<h1 tw="text-5xl font-bold text-white mb-2" style={{ lineHeight: 1.2, letterSpacing: "-0.02em" }}>
					{formattedIconName} Icon
				</h1>

				<p tw="text-xl text-zinc-400 mb-1">Download free {formattedIconName} icon in SVG, PNG & WEBP</p>

				<p tw="text-sm text-zinc-500">Part of the Dashboard Icons collection</p>
			</div>

			{/* Bottom branding */}
			<div
				tw="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 pt-4"
				style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
			>
				<span tw="text-sm text-zinc-500">dashboardicons.com</span>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			headers: {
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		},
	)
}
