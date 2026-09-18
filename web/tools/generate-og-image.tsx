/** Run from web: pnpm generate:og (set OG_REFRESH_COUNT=true for the live total). */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ImageResponse } from "next/og"
import React from "react"
import sharp from "sharp"

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = resolve(webRoot, "..")
const size = { width: 1200, height: 630 }
// Combined count across Dashboard Icons and the external collections.
const fallbackIconCount = 9222
const rows = [
	["portainer", "adguard-home", "audiobookshelf", "authelia", "authentik", "bazarr", "bookstack", "calibre-web", "changedetection", "deluge", "dozzle", "freshrss"],
	["homepage", "emby", "sonarr", "openclaw", "google-gemini", "microsoft-copilot", "anthropic", "claude-ai", "qbittorrent", "nextcloud", "filebrowser", "lidarr"],
	["linkwarden", "firefly-iii", "home-assistant", "docker", "homarr", "radarr", "plex", "jellyfin", "immich", "bilibili", "gitea", "ntfy"],
	["overseerr", "glances", "hermes-agent", "paperless-ngx", "mealie", "navidrome", "syncthing", "uptime-kuma", "vaultwarden", "grok", "kavita", "photoprism"],
	["prowlarr", "grafana", "proxmox", "n8n", "red-dead-redemption-2", "kick", "openai", "microsoft-sharepoint", "whatnot", "comfyui", "truenas", "tailscale"],
	["traefik", "actual-budget", "miniflux", "nginx-proxy-manager", "prometheus", "recyclarr", "sabnzbd", "searxng", "unraid", "vikunja", "wireguard", "transmission"],
	["watchtower", "zigbee2mqtt", "redis", "wordpress", "nginx", "beszel", "jellyseerr", "calibre", "heimdall", "woodpecker-ci", "cloudflare", "cloudflared"],
]

async function imageData(path: string, width: number) {
	let data: Buffer
	if (path.startsWith("https://")) {
		const response = await fetch(path, { signal: AbortSignal.timeout(30_000) })
		if (!response.ok) throw new Error(`Icon download failed: ${response.status} ${path}`)
		data = Buffer.from(await response.arrayBuffer())
	} else {
		data = await readFile(path)
	}
	const image = await sharp(data).resize(width, width, { fit: "inside" }).png().toBuffer()
	return `data:image/png;base64,${image.toString("base64")}`
}

function iconPath(name: string) {
	if (name === "hermes-agent") {
		return "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/hermesagent.png"
	}
	// Use light variants for monochrome marks on the dark grid.
	if (name === "openai") {
		return resolve(repositoryRoot, "png/openai-light.png")
	}
	if (name === "grok") {
		return resolve(repositoryRoot, "png/grok-dark.png")
	}
	return resolve(repositoryRoot, "png", `${name}.png`)
}

async function getCuratedIconCount() {
	if (process.env.OG_REFRESH_COUNT !== "true") return fallbackIconCount

	const response = await fetch("https://dashboardicons.com/api/icons/search", {
		signal: AbortSignal.timeout(30_000),
	})
	if (!response.ok) throw new Error(`Icon catalog request failed: ${response.status}`)
	const icons: unknown = await response.json()
	if (!Array.isArray(icons) || icons.length < fallbackIconCount ||
		!icons.every((icon) => typeof icon?.name === "string" && typeof icon?.source === "string")) {
		throw new Error("Invalid or incomplete icon catalog; refusing to publish an incorrect count")
	}
	console.log(`Using ${icons.length} icons across all collections`)
	return icons.length
}

async function main() {
	const curatedIconCount = await getCuratedIconCount()
	const icons = new Map(await Promise.all([...new Set(rows.flat())].map(async (name) => [
		name, await imageData(iconPath(name), 96),
	] as const)))
	const background = new ImageResponse(
		<div style={{ display: "flex", width: "100%", height: "100%", background: "#10151e", overflow: "hidden" }}>
			<div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 0, top: 0, gap: 18 }}>
				{rows.map((row, rowIndex) => (
					<div key={rowIndex} style={{ display: "flex", gap: 18 }}>
						{row.map((name) => (
							<div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 132, height: 132, borderRadius: 26, background: "#1b2330", border: "1px solid #344051" }}>
								<img alt={name} src={icons.get(name)} width={76} height={76} style={{ objectFit: "contain" }} />
							</div>
						))}
					</div>
				))}
			</div>
		</div>, { width: 1800, height: 1050 },
	)
	// Rotate the rasterized grid to avoid Satori clipping rotated images; soften only the background.
	const rotated = await sharp(Buffer.from(await background.arrayBuffer()))
		.rotate(-12, { background: "#10151e" })
		.png()
		.toBuffer({ resolveWithObject: true })
	// Pull back 15% while the oversized grid still covers every rotated corner.
	const backgroundScale = 0.85
	const crop = {
		width: Math.round(size.width / backgroundScale),
		height: Math.round(size.height / backgroundScale),
	}
	const softened = await sharp(rotated.data)
		.extract({
			left: Math.floor((rotated.info.width - crop.width) / 2),
			top: Math.floor((rotated.info.height - crop.height) / 2),
			...crop,
		})
		.resize(size.width, size.height)
		.blur(0.8)
		.png()
		.toBuffer()
	const logo = await imageData(resolve(repositoryRoot, "svg/dashboard-icons-dark.svg"), 160)
	const fonts = await Promise.all([
		{ name: "Inter", file: "Inter-Regular.ttf", weight: 400 as const },
		{ name: "Inter", file: "Inter-Bold.ttf", weight: 700 as const },
	].map(async ({ name, file, weight }) => ({
		name,
		data: await readFile(resolve(webRoot, "tools/og-assets", file)),
		weight,
		style: "normal" as const,
	})))
	const response = new ImageResponse(
		<div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#10151e", color: "#fff", fontFamily: "Inter" }}>
			<img alt="" src={`data:image/png;base64,${softened.toString("base64")}`} width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
			<div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(8,12,20,0.25), rgba(8,12,20,0.68) 35%, rgba(8,12,20,0.78) 65%, rgba(8,12,20,0.30))" }} />
			<div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "radial-gradient(ellipse at center, rgba(8,12,20,0.45), rgba(8,12,20,0))" }} />
			<div style={{ display: "flex", alignItems: "center", gap: 30 }}>
				<img alt="Dashboard Icons logo" src={logo} width={126} height={126} />
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -3.5, backgroundImage: "linear-gradient(135deg, #FA5352, #FA5352, #FFA500)", backgroundClip: "text", color: "transparent" }}>Dashboard Icons</div>
					<div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#f8fafc", letterSpacing: -0.7 }}>
						{curatedIconCount.toLocaleString("en-US")}+ curated icons & logos
					</div>
				</div>
			</div>
		</div>, { ...size, fonts },
	)
	const output = resolve(webRoot, "public/og-image.png")
	await writeFile(output, Buffer.from(await response.arrayBuffer()))
	console.log(`Generated ${output} (${size.width} × ${size.height})`)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
