import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAllIcons } from "@/lib/api";

export const size = {
	width: 1200,
	height: 630,
};

export const alt = "Icon Open Graph Image";
export const contentType = "image/png";
export default async function Image({
	params,
}: {
	params: Promise<{ icon: string }>;
}) {
	const { icon } = await params;

	if (!icon) {
		console.error(`[Opengraph Image] Icon not found for ${icon}`);
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
		);
	}

	const iconsData = await getAllIcons();
	const totalIcons = Object.keys(iconsData).length;
	const index = Object.keys(iconsData).indexOf(icon);

	// Format the icon name for display
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

	// Read the icon file from local filesystem
	let iconData: Buffer | null = null;
	try {
		const iconPath = join(process.cwd(), `../png/${icon}.png`);
		console.log(
			`Generating opengraph image for ${icon} (${index + 1} / ${totalIcons}) from path ${iconPath}`,
		);
		iconData = await readFile(iconPath);
	} catch (_error) {
		console.error(`Icon ${icon} was not found locally`);
	}

	// Convert the image data to a data URL or use placeholder
	const iconUrl = iconData
		? `data:image/png;base64,${iconData.toString("base64")}`
		: null;

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
			{/* Background blur blobs */}
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

			{/* Main content layout */}
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
						src={
							iconUrl ||
							`https://placehold.co/600x400?text=${formattedIconName}`
						}
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
						Download {formattedIconName} icon for free
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
						Amongst {totalIcons} other high-quality dashboard icons
					</div>

					<div
						style={{
							display: "flex",
							gap: 12,
							marginTop: 8,
						}}
					>
						{["SVG", "PNG", "WEBP"].map((format) => (
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
								}}
							>
								{format}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Footer */}
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
