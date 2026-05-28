import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"
import { BASE_URL, DASHBOARD_ICONS_ICON } from "@/constants"
import { getCommunitySubmissionByName } from "@/lib/community"

export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

function resolveCommunityIconUrl(iconName: string, iconData: Awaited<ReturnType<typeof getCommunitySubmissionByName>>) {
	if (!iconData) return null

	const directBase = iconData.data.base
	if (typeof directBase === "string" && directBase.startsWith("http")) {
		return directBase
	}

	const mainIconUrl = (iconData.data as { mainIconUrl?: string }).mainIconUrl
	if (mainIconUrl) {
		return mainIconUrl
	}

	return `${BASE_URL}/svg/${iconName}.svg`
}

export async function GET(_req: Request, { params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const iconData = await getCommunitySubmissionByName(icon)

	if (!iconData) {
		notFound()
	}

	const iconUrl = resolveCommunityIconUrl(icon, iconData)
	if (!iconUrl) {
		notFound()
	}

	const formattedName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

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
					}}
				>
					{/* biome-ignore lint/performance/noImgElement: ImageResponse uses Satori which requires native HTML img elements */}
					<img src={iconUrl} alt={formattedName} width={260} height={260} style={{ objectFit: "contain" }} />
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 650 }}>
					<div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
						{formattedName} community icon
					</div>
					<div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: "#64748b", paddingLeft: 16, borderLeft: "4px solid #94a3b8" }}>
						Community submission on DashboardIcons.com
					</div>
				</div>
			</div>
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
				<div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#334155", alignItems: "center", gap: 10 }}>
					{/* biome-ignore lint/performance/noImgElement: ImageResponse uses Satori which requires native HTML img elements */}
					<img src={DASHBOARD_ICONS_ICON} alt="dashboardicons.com" width={32} height={32} />
					dashboardicons.com
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
