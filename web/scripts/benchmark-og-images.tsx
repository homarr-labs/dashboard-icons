import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import React from "react";
import { METADATA_URL } from "../src/constants";
import type { IconFile } from "../src/types/icons";

// Standalone cached functions for benchmarking (no Next.js dependencies)
let iconsDataCache: IconFile | null = null;
const iconFileCache = new Map<string, Buffer | null>();
let preloadDone = false;

async function getAllIconsStandalone(): Promise<IconFile> {
	if (iconsDataCache) {
		return iconsDataCache;
	}
	const response = await fetch(METADATA_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch icons: ${response.statusText}`);
	}
	iconsDataCache = (await response.json()) as IconFile;
	return iconsDataCache;
}

async function preloadAllIconsStandalone(): Promise<void> {
	if (preloadDone) {
		return;
	}
	const startTime = Date.now();
	const iconsData = await getAllIconsStandalone();
	const iconNames = Object.keys(iconsData);
	const pngDir = join(process.cwd(), `../png`);

	console.log(`[Preload] Loading ${iconNames.length} icons into memory...`);

	const loadPromises = iconNames.map(async (iconName) => {
		if (iconFileCache.has(iconName)) {
			return;
		}
		try {
			const iconPath = join(pngDir, `${iconName}.png`);
			const buffer = await readFile(iconPath);
			iconFileCache.set(iconName, buffer);
		} catch (_error) {
			iconFileCache.set(iconName, null);
		}
	});

	await Promise.all(loadPromises);
	const duration = Date.now() - startTime;
	const loadedCount = Array.from(iconFileCache.values()).filter(
		(v) => v !== null,
	).length;
	console.log(
		`[Preload] Loaded ${loadedCount}/${iconNames.length} icons in ${duration}ms (${(loadedCount / duration).toFixed(2)} icons/ms)\n`,
	);
	preloadDone = true;
}

async function readIconFileStandalone(
	iconName: string,
): Promise<Buffer | null> {
	if (iconFileCache.has(iconName)) {
		return iconFileCache.get(iconName)!;
	}
	try {
		const iconPath = join(process.cwd(), `../png/${iconName}.png`);
		const buffer = await readFile(iconPath);
		iconFileCache.set(iconName, buffer);
		return buffer;
	} catch (_error) {
		iconFileCache.set(iconName, null);
		return null;
	}
}

const size = {
	width: 1200,
	height: 630,
};

async function generateOGImage(
	icon: string,
	iconsData: Record<string, unknown>,
	totalIcons: number,
	index: number,
	profileTimings: Map<string, number[]>,
) {
	const stepTimings: Record<string, number> = {};
	let stepStart: number;

	stepStart = Date.now();
	const formattedIconName = icon
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
	stepTimings.formatName = Date.now() - stepStart;

	stepStart = Date.now();
	const iconData = await readIconFileStandalone(icon);
	stepTimings.readFile = Date.now() - stepStart;

	stepStart = Date.now();
	const iconUrl = iconData
		? `data:image/png;base64,${iconData.toString("base64")}`
		: null;
	stepTimings.base64 = Date.now() - stepStart;

	stepStart = Date.now();
	const imageResponse = await new ImageResponse(
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
					{iconUrl ? (
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
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 260,
								height: 260,
								position: "relative",
								zIndex: 1,
								fontSize: 48,
								fontWeight: 700,
								color: "#94a3b8",
								textAlign: "center",
								wordBreak: "break-word",
							}}
						>
							{formattedIconName}
						</div>
					)}
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
	stepTimings.imageResponse = Date.now() - stepStart;

	for (const [step, timing] of Object.entries(stepTimings)) {
		if (!profileTimings.has(step)) {
			profileTimings.set(step, []);
		}
		profileTimings.get(step)!.push(timing);
	}

	return imageResponse;
}

async function benchmark() {
	console.log("Starting OG image generation benchmark...\n");

	const startTime = Date.now();

	console.log("Fetching icons data...");
	const iconsData = await getAllIconsStandalone();
	const iconNames = Object.keys(iconsData);
	const totalIcons = iconNames.length;
	const testIcons = iconNames.slice(0, 100);

	await preloadAllIconsStandalone();

	console.log(`Testing with ${testIcons.length} icons\n`);

	const times: number[] = [];
	const profileTimings = new Map<string, number[]>();

	for (let i = 0; i < testIcons.length; i++) {
		const icon = testIcons[i];
		const iconStartTime = Date.now();

		try {
			await generateOGImage(icon, iconsData, totalIcons, i, profileTimings);
			const iconEndTime = Date.now();
			const duration = iconEndTime - iconStartTime;
			times.push(duration);

			if ((i + 1) % 10 === 0) {
				const avgTime = times.slice(-10).reduce((a, b) => a + b, 0) / 10;
				console.log(
					`Generated ${i + 1}/${testIcons.length} images (avg: ${avgTime.toFixed(2)}ms per image)`,
				);
			}
		} catch (error) {
			console.error(`Failed to generate image for ${icon}:`, error);
		}
	}

	const endTime = Date.now();
	const totalDuration = endTime - startTime;
	const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
	const minTime = Math.min(...times);
	const maxTime = Math.max(...times);

	console.log("\n" + "=".repeat(50));
	console.log("Benchmark Results");
	console.log("=".repeat(50));
	console.log(`Total images generated: ${testIcons.length}`);
	console.log(`Total time: ${(totalDuration / 1000).toFixed(2)}s`);
	console.log(`Average time per image: ${avgTime.toFixed(2)}ms`);
	console.log(`Min time: ${minTime.toFixed(2)}ms`);
	console.log(`Max time: ${maxTime.toFixed(2)}ms`);
	console.log(
		`Images per second: ${((testIcons.length / totalDuration) * 1000).toFixed(2)}`,
	);
	console.log("\n" + "-".repeat(50));
	console.log("Performance Breakdown (per image):");
	console.log("-".repeat(50));
	for (const [step, timings] of profileTimings.entries()) {
		const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
		const min = Math.min(...timings);
		const max = Math.max(...timings);
		const total = timings.reduce((a, b) => a + b, 0);
		const percentage = (
			(total / times.reduce((a, b) => a + b, 0)) *
			100
		).toFixed(1);
		console.log(
			`  ${step.padEnd(15)}: avg ${avg.toFixed(2)}ms | min ${min.toFixed(2)}ms | max ${max.toFixed(2)}ms | ${percentage}%`,
		);
	}
	console.log("=".repeat(50));
}

benchmark().catch(console.error);
