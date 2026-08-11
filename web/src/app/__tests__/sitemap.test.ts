import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({ getAllIcons: vi.fn().mockResolvedValue({}) }))
vi.mock("@/lib/community", () => ({ getCommunitySubmissions: vi.fn().mockResolvedValue([]) }))
vi.mock("@/lib/external-icons", () => ({
	getExternalIcons: vi.fn().mockResolvedValue([
		{
			source: "simpleicons",
			slug: "github",
			name: "GitHub",
			external: {
				source: "simpleicons",
				slug: "github",
				formats: ["svg", "png"],
				variants: { light: true, dark: true },
				url_templates: {},
				brand_color: "181717",
				updated_at_source: "2026-01-01T00:00:00.000Z",
			},
			data: { base: "svg", aliases: [], categories: [] },
		},
	]),
}))

describe("sitemap", () => {
	it("includes external icon pages with absolute image URLs", async () => {
		const { default: sitemap } = await import("../sitemap")
		const entries = await sitemap()
		const entry = entries.find(({ url }) => url === "https://dashboardicons.com/icons/external/github")

		expect(entry?.images).toContain("https://dashboardicons.com/api/icons/external/simpleicons/github/brand.png")
		expect(entry?.images).toContain("https://dashboardicons.com/api/icons/external/simpleicons/github/light.png")
		expect(entry?.images).toContain("https://dashboardicons.com/api/icons/external/simpleicons/github/dark.png")
		expect(entry?.images?.every((url) => URL.canParse(url))).toBe(true)
	})
})
