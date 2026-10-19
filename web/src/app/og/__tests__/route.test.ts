import { describe, expect, it, vi } from "vitest"
import nativeIcons from "../../../../../metadata.json"

const mockNotFound = vi.fn()
const mockImageResponse = vi.fn()

vi.mock("next/navigation", () => ({
	notFound: () => {
		mockNotFound()
		throw new Error("NEXT_NOT_FOUND")
	},
}))

class MockImageResponse {
	constructor(...args: unknown[]) {
		mockImageResponse(...args)
	}
}

vi.mock("next/og", () => ({
	ImageResponse: MockImageResponse,
}))

const mockIconsData: Record<string, unknown> = {
	github: { aliases: ["code-repository", "GitHub"], categories: ["development"] },
	"1password": { aliases: ["1Password"], categories: ["security"] },
	pfsense: { aliases: ["Firewall", "pfSense"], categories: ["networking"] },
	"rocket-money": nativeIcons["rocket-money"],
	"check-point": nativeIcons["check-point"],
	rapid7: nativeIcons.rapid7,
	"elgato-wave-link": nativeIcons["elgato-wave-link"],
	notediscovery: nativeIcons.notediscovery,
	"paperless-ai": nativeIcons["paperless-ai"],
	"mlb-tv": nativeIcons["mlb-tv"],
	magicinfo: nativeIcons.magicinfo,
	statuspage: nativeIcons.statuspage,
	waves: nativeIcons.waves,
	chipsound: nativeIcons.chipsound,
	nostalgiatv: nativeIcons.nostalgiatv,
	"jtu-me": nativeIcons["jtu-me"],
	"adguard-home": { name: "AdGuard Home", categories: ["security"] },
	bitwarden: { name: "Bitwarden", categories: ["security"] },
	grafana: { name: "Grafana", categories: ["monitoring"] },
	"home-assistant": { name: "Home Assistant", categories: ["home-automation"] },
	jellyfin: { name: "Jellyfin", categories: ["media"] },
	nextcloud: { name: "Nextcloud", categories: ["cloud"] },
	pihole: { name: "Pi-hole", categories: ["security"] },
	plex: { name: "Plex", categories: ["media"] },
	portainer: { name: "Portainer", categories: ["infrastructure"] },
	prometheus: { name: "Prometheus", categories: ["monitoring"] },
	radarr: { name: "Radarr", categories: ["media"] },
	sonarr: { name: "Sonarr", categories: ["media"] },
	tautulli: { name: "Tautulli", categories: ["media"] },
	traefik: { name: "Traefik", categories: ["infrastructure"] },
	unifi: { name: "UniFi", categories: ["networking"] },
	vaultwarden: { name: "Vaultwarden", categories: ["security"] },
	wireguard: { name: "WireGuard", categories: ["networking"] },
	tailscale: { name: "Tailscale", categories: ["networking"] },
	"nginx-proxy-manager": { name: "Nginx Proxy Manager", categories: ["infrastructure"] },
	proxmox: { name: "Proxmox", categories: ["infrastructure"] },
	immich: { name: "Immich", categories: ["media"] },
	glances: { name: "Glances", categories: ["monitoring"] },
	"changedetection-io": { name: "ChangeDetection.io", categories: ["monitoring"] },
	"libre-speed": { name: "LibreSpeed", categories: ["networking"] },
	mealie: { name: "Mealie", categories: ["productivity"] },
}

vi.mock("@/lib/api", () => ({
	getAllIcons: vi.fn(() => Promise.resolve(mockIconsData)),
	getTotalIcons: vi.fn(() => Promise.resolve({ totalIcons: Object.keys(mockIconsData).length })),
}))

vi.mock("@/constants", () => ({
	BASE_URL: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons",
	DASHBOARD_ICONS_ICON: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/dashboard-icons.svg",
}))

describe("OG icon route handler", () => {
	const validIcons = Object.keys(mockIconsData)

	it("uses the correct image size", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")
		await GET(new Request("http://localhost/og/grafana"), { params: Promise.resolve({ icon: "grafana" }) })
		expect(mockImageResponse.mock.calls[0][1]).toMatchObject({ width: 1200, height: 630 })
	})

	it("returns ImageResponse for valid icons", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")

		for (const icon of validIcons.slice(0, 20)) {
			const request = new Request(`http://localhost/og/${icon}`)
			await GET(request, { params: Promise.resolve({ icon }) })
			expect(mockImageResponse).toHaveBeenCalled()
			mockImageResponse.mockClear()
		}
	})

	it("formats icon names correctly in the OG image", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")

		for (const [icon, expectedName] of [
			["github", "GitHub"],
			["1password", "1Password"],
			["pfsense", "pfSense"],
			["home-assistant", "Home Assistant"],
			["rocket-money", "Rocket Money"],
			["check-point", "Check Point"],
			["rapid7", "Rapid7"],
			["elgato-wave-link", "Elgato Wave Link"],
			["notediscovery", "NoteDiscovery"],
			["paperless-ai", "Paperless-AI"],
			["mlb-tv", "MLB.TV"],
			["magicinfo", "MagicINFO"],
			["statuspage", "Statuspage"],
			["waves", "Waves"],
			["chipsound", "Chipsound"],
			["nostalgiatv", "Nostalgiatv"],
			["jtu-me", "JTU.ME"],
		]) {
			const request = new Request(`http://localhost/og/${icon}`)
			await GET(request, { params: Promise.resolve({ icon }) })
			expect(mockImageResponse).toHaveBeenCalledTimes(1)
			expect(JSON.stringify(mockImageResponse.mock.calls[0][0])).toContain(`"alt":"${expectedName}"`)
			mockImageResponse.mockClear()
		}
	})

	it("strips .png extension from icon param", async () => {
		mockImageResponse.mockClear()
		mockNotFound.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/grafana.png")
		await GET(request, { params: Promise.resolve({ icon: "grafana.png" }) })
		expect(mockImageResponse).toHaveBeenCalled()
		expect(mockNotFound).not.toHaveBeenCalled()
	})

	it("calls notFound for unknown icons", async () => {
		mockImageResponse.mockClear()
		mockNotFound.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/nonexistent-icon")
		await expect(GET(request, { params: Promise.resolve({ icon: "nonexistent-icon" }) })).rejects.toThrow("NEXT_NOT_FOUND")
		expect(mockNotFound).toHaveBeenCalled()
		expect(mockImageResponse).not.toHaveBeenCalled()
	})

	it("strips .png and calls notFound for unknown .png icons", async () => {
		mockImageResponse.mockClear()
		mockNotFound.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/fake-icon.png")
		await expect(GET(request, { params: Promise.resolve({ icon: "fake-icon.png" }) })).rejects.toThrow("NEXT_NOT_FOUND")
		expect(mockNotFound).toHaveBeenCalled()
	})

	it("sets correct cache headers", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/grafana")
		await GET(request, { params: Promise.resolve({ icon: "grafana" }) })

		const callArgs = mockImageResponse.mock.calls[0]
		const options = callArgs[1]
		expect(options.headers["Cache-Control"]).toBe("public, s-maxage=86400, stale-while-revalidate=604800")
		expect(options.headers["CDN-Cache-Control"]).toBe("public, max-age=86400, stale-while-revalidate=604800")
	})

	it("handles all 25+ test icons without errors", async () => {
		mockImageResponse.mockClear()
		mockNotFound.mockClear()
		const { GET } = await import("../[icon]/route")

		let successCount = 0
		for (const icon of validIcons) {
			const request = new Request(`http://localhost/og/${icon}`)
			await GET(request, { params: Promise.resolve({ icon }) })
			successCount++
		}

		expect(successCount).toBe(validIcons.length)
		expect(mockImageResponse).toHaveBeenCalledTimes(validIcons.length)
		expect(mockNotFound).not.toHaveBeenCalled()
	})

	it("handles icons with dashes in name (e.g. nginx-proxy-manager)", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/nginx-proxy-manager")
		await GET(request, { params: Promise.resolve({ icon: "nginx-proxy-manager" }) })
		expect(mockImageResponse).toHaveBeenCalled()
	})

	it("handles icons with multiple dashes (e.g. changedetection-io)", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../[icon]/route")

		const request = new Request("http://localhost/og/changedetection-io")
		await GET(request, { params: Promise.resolve({ icon: "changedetection-io" }) })
		expect(mockImageResponse).toHaveBeenCalled()
	})
})
