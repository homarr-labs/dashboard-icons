import { ImageResponse } from "next/og"
import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import { getTotalIcons } from "@/lib/api"
import { getExternalIconBySlug } from "@/lib/external-icons"

export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
	const { slug: rawSlug } = await params
	const slug = rawSlug.replace(/\.png$/, "")
	const icon = await getExternalIconBySlug(slug)

	if (!icon) {
		return new ImageResponse(
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "white",
					fontSize: 48,
					fontWeight: 600,
					color: "#64748b",
				}}
			>
				Icon not found
			</div>,
			{ ...size, headers: { "X-Robots-Tag": "noindex" } },
		)
	}

	const sourceConfig = EXTERNAL_SOURCES[icon.external.source as ExternalSourceId]
	if (!sourceConfig) {
		return new ImageResponse(
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "white",
					fontSize: 48,
					fontWeight: 600,
					color: "#64748b",
				}}
			>
				Source not found
			</div>,
			{ ...size, headers: { "X-Robots-Tag": "noindex" } },
		)
	}

	const { totalIcons } = await getTotalIcons()
	const formattedName = icon.external.name

	// Build the icon URL: prefer the first available format
	const formats = icon.external.formats || []
	let previewUrl = ""
	if (formats.length > 0) {
		const urlTemplates = icon.external.url_templates as Record<string, string> | undefined
		const fmt = formats.includes("svg") ? "svg" : formats.includes("png") ? "png" : formats[0]
		if (urlTemplates?.[fmt]) {
			previewUrl = urlTemplates[fmt].replace("{slug}", slug)
		} else {
			previewUrl = `${sourceConfig.cdnBase}/${fmt}/${slug}.${fmt}`
		}
	}

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				position: "relative",
				fontFamily: "system-ui, sans-serif",
				overflow: "hidden",
				backgroundColor: "white",
				backgroundImage:
					"radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
				backgroundSize: "100px 100px",
			}}
		>
			{/* Background blur blobs */}
			<div
				style={{
					position: "absolute",
					top: -100,
					left: -100,
					width: 400,
					height: 400,
					borderRadius: "50%",
					background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
					filter: "blur(80px)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: -150,
					right: -150,
					width: 500,
					height: 500,
					borderRadius: "50%",
					background: "linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)",
					filter: "blur(100px)",
				}}
			/>

			{/* Main content */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					padding: "60px",
					gap: "70px",
				}}
			>
				{/* Icon container */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 320,
						height: 320,
						borderRadius: 32,
						background: "white",
						boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
						padding: 30,
						flexShrink: 0,
						position: "relative",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
						}}
					/>
					{previewUrl ? (
						// biome-ignore lint/performance/noImgElement: ImageResponse uses Satori which requires native HTML img elements
						<img
							src={previewUrl}
							alt={formattedName}
							width={260}
							height={260}
							style={{
								objectFit: "contain",
								position: "relative",
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 260,
								height: 260,
								backgroundColor: "#f1f5f9",
								color: "#475569",
								border: "2px solid #e2e8f0",
								borderRadius: 12,
								fontSize: 18,
								fontWeight: 600,
							}}
						>
							{formattedName}
						</div>
					)}
				</div>

				{/* Text content */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						gap: 28,
						maxWidth: 650,
					}}
				>
					<div
						style={{
							display: "flex",
							fontSize: 64,
							fontWeight: 800,
							color: "#0f172a",
							lineHeight: 1.1,
							letterSpacing: "-0.02em",
						}}
					>
						Download {formattedName} icon for free
					</div>
					<div
						style={{
							display: "flex",
							fontSize: 32,
							fontWeight: 500,
							color: "#64748b",
							lineHeight: 1.4,
							position: "relative",
							paddingLeft: 16,
							borderLeft: "4px solid #94a3b8",
						}}
					>
						Part of {totalIcons} icons & logos available on DashboardIcons.com
					</div>
					<div style={{ display: "flex", gap: 12, marginTop: 8 }}>
						{formats.slice(0, 4).map((format) => (
							<div
								key={format}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: "#f1f5f9",
									color: "#475569",
									border: "2px solid #e2e8f0",
									borderRadius: 12,
									padding: "8px 16px",
									fontSize: 18,
									fontWeight: 600,
									boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
									textTransform: "uppercase",
								}}
							>
								{format}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Footer with provider logo */}
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: 80,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#ffffff",
					borderTop: "2px solid rgba(0, 0, 0, 0.05)",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 24,
						fontWeight: 600,
						color: "#334155",
						alignItems: "center",
						gap: 10,
					}}
				>
					<span>from</span>
					{/* biome-ignore lint/performance/noImgElement: ImageResponse uses Satori which requires native HTML img elements */}
					<img src={sourceConfig.icon} alt={sourceConfig.label} width={32} height={32} style={{ marginRight: 2 }} />
					<span>{sourceConfig.label} via dashboardicons.com</span>
				</div>
			</div>
		</div>,
		{
			...size,
			headers: {
				"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
				"CDN-Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
				"X-Robots-Tag": "noindex",
			},
		},
	)
}
