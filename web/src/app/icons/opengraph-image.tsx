import { ImageResponse } from "next/og"
import { getAllIcons } from "@/lib/api"

export const dynamic = "force-static"

export const size = {
	width: 1200,
	height: 630,
}

// Define a fixed list of representative icons
const representativeIcons = [
	"homarr",
	"sonarr",
	"radarr",
	"lidarr",
	"readarr",
	"prowlarr",
	"qbittorrent",
	"home-assistant",
	"cloudflare",
	"github",
	"traefik",
	"portainer-alt",
	"plex",
	"jellyfin",
	"overseerr",
]

export default async function Image() {
	const iconsData = await getAllIcons()
	const totalIcons = Object.keys(iconsData).length
	// Round down to the nearest 100
	const roundedTotalIcons = Math.round(totalIcons / 100) * 100

	const iconImages = representativeIcons.map((icon) => ({
		name: icon
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" "),
		url: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${icon}.png`,
	}))

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
			<div
				style={{
					position: "absolute",
					display: "flex",
					top: -100,
					left: -100,
					width: 400,
					height: 400,
					borderRadius: "50%",
					background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
					filter: "blur(80px)",
					zIndex: 2,
				}}
			/>
			<div
				style={{
					position: "absolute",
					display: "flex",
					bottom: -150,
					right: -150,
					width: 500,
					height: 500,
					borderRadius: "50%",
					background: "linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)",
					filter: "blur(100px)",
					zIndex: 2,
				}}
			/>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					padding: "50px",
					zIndex: 10,
					gap: "30px",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "16px",
						marginBottom: "10px",
					}}
				>
					<div
						style={{
							fontSize: 64,
							display: "flex",
							fontWeight: 800,
							fontFamily: "monospace",
							color: "#0f172a",
							lineHeight: 1.1,
							textAlign: "center",
						}}
					>
						Dashboard Icons
					</div>
					<div
						style={{
							fontSize: 28,
							display: "flex",
							fontWeight: 500,
							color: "#64748b",
							lineHeight: 1.4,
							textAlign: "center",
							maxWidth: 1100,
						}}
					>
						A curated collection of {roundedTotalIcons}+ free icons for dashboards and app directories
					</div>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: "20px",
						width: "1100px",
						margin: "0 auto",
					}}
				>
					{iconImages.map((icon, index) => (
						<div
							key={index}
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								background: "white",
								borderRadius: 16,
								boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
								padding: "20px",
								position: "relative",
								overflow: "hidden",
								width: "120px",
								height: "75px",
								margin: "0",
							}}
						>
							<div
								style={{
									display: "flex",
									position: "absolute",
									inset: 0,
									background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
									zIndex: 0,
								}}
							/>
							<img
								src={icon.url}
								alt={icon.name}
								width={50}
								height={50}
								style={{
									objectFit: "contain",
									position: "relative",
									zIndex: 1,
									filter: "drop-shadow(0 5px 10px rgba(0, 0, 0, 0.1))",
								}}
							/>
						</div>
					))}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							background: "white",
							borderRadius: 16,
							boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
							padding: "20px",
							position: "relative",
							overflow: "hidden",
							width: "120px",
							height: "75px",
							margin: "0",
						}}
					>
						<div
							style={{
								display: "flex",
								position: "absolute",
								inset: 0,
								background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
								zIndex: 0,
							}}
						/>
						<div
							style={{
								display: "flex",
								fontSize: 20,
								fontWeight: 600,
								color: "#64748b",
								zIndex: 1,
							}}
						>
							+{totalIcons - representativeIcons.length}
						</div>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: 16,
						marginTop: 10,
					}}
				/>
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
							display: "flex",
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
	)
}
