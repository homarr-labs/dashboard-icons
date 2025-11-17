import { permanentRedirect, redirect } from "next/navigation"
import { ImageResponse } from "next/og"
import { getCommunityGalleryRecord, getCommunitySubmissionByName, getCommunitySubmissions } from "@/lib/community"

export const dynamic = "force-dynamic";

export const size = {
	width: 1200,
	height: 630,
}

export const alt = "Community Icon Open Graph Image";
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params

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
			{ ...size },
		)
	}

	const iconData = await getCommunitySubmissionByName(icon)

	if (!iconData) {
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
			{ ...size },
		)
	}

	const record = await getCommunityGalleryRecord(icon)
	if (record?.status === "added_to_collection") {
		permanentRedirect(`/icons/${icon}/opengraph-image`)
	}

	const status = record?.status || "pending"
	const allIcons = await getCommunitySubmissions()
	const totalIcons = allIcons.length
	const index = allIcons.findIndex((i) => i.name === icon)

	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")

	const getStatusDisplayName = (status: string) => {
		switch (status) {
			case "pending":
				return "Awaiting Review"
			case "approved":
				return "Approved"
			case "rejected":
				return "Rejected"
			case "added_to_collection":
				return "Added to Collection"
			default:
				return "Awaiting Review"
		}
	}

	const statusColors: Record<string, { bg: string; text: string; border: string }> = {
		approved: {
			bg: "#dbeafe",
			text: "#1e40af",
			border: "#93c5fd",
		},
		pending: {
			bg: "#fef3c7",
			text: "#92400e",
			border: "#fde68a",
		},
		rejected: {
			bg: "#fee2e2",
			text: "#991b1b",
			border: "#fca5a5",
		},
	}

	const statusConfig = statusColors[status] || statusColors.pending
	const statusLabel = getStatusDisplayName(status)

	const mainIconUrl = typeof iconData.data.base === "string" && iconData.data.base.startsWith("http") ? iconData.data.base : null

	let iconDataBuffer: Buffer | null = null
	if (mainIconUrl) {
		try {
			const response = await fetch(mainIconUrl)
			if (response.ok) {
				const arrayBuffer = await response.arrayBuffer()
				iconDataBuffer = Buffer.from(arrayBuffer)
			}
		} catch (error) {
			console.error(`Failed to fetch icon image for ${icon}:`, error)
		}
	}

	const iconUrl = iconDataBuffer
		? `data:image/png;base64,${iconDataBuffer.toString("base64")}`
		: `https://placehold.co/600x400?text=${formattedIconName}`;

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				position: "relative",
				fontFamily: "Inter, system-ui, sans-serif",
				overflow: "hidden",
				backgroundColor: "white",
				backgroundImage:
					"radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
				backgroundSize: "100px 100px",
			}}
		>
			{/* Status Badge */}
			<div
				style={{
					position: "absolute",
					top: 30,
					right: 30,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: statusConfig.bg,
					color: statusConfig.text,
					border: `2px solid ${statusConfig.border}`,
					borderRadius: 12,
					padding: "10px 20px",
					fontSize: 20,
					fontWeight: 700,
					letterSpacing: "0.5px",
					boxShadow:
						"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
					zIndex: 30,
					textTransform: "uppercase",
				}}
			>
				{statusLabel}
			</div>
			<div
				style={{
					position: "absolute",
					top: -100,
					left: -100,
					width: 400,
					height: 400,
					borderRadius: "50%",
					background:
						"linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
					filter: "blur(80px)",
					zIndex: 2,
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
					background:
						"linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)",
					filter: "blur(100px)",
					zIndex: 2,
				}}
			/>

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
					zIndex: 10,
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
						boxShadow:
							"0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
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
							zIndex: 0,
						}}
					/>
					<img
						src={iconUrl}
						alt={formattedIconName}
						width={260}
						height={260}
						style={{
							objectFit: "contain",
							position: "relative",
							zIndex: 1,
							filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))",
						}}
					/>
				</div>

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
						Download {formattedIconName} icon (Community)
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
						Amongst {totalIcons} other community-submitted icons
					</div>

					<div
						style={{
							display: "flex",
							gap: 12,
							marginTop: 8,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								backgroundColor: "#fef3c7",
								color: "#92400e",
								border: "2px solid #fde68a",
								borderRadius: 12,
								padding: "8px 16px",
								fontSize: 18,
								fontWeight: 600,
								boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
							}}
						>
							COMMUNITY
						</div>
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
					zIndex: 20,
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
					<div
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							backgroundColor: "#3b82f6",
							marginRight: 4,
						}}
					/>
					dashboardicons.com
				</div>
			</div>
		</div>,
		{
			...size,
		},
	);
}
