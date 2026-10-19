import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({ getAllIcons: vi.fn().mockResolvedValue({}) }))
vi.mock("@/lib/community", () => ({ getCommunitySubmissions: vi.fn().mockResolvedValue([]) }))
vi.mock("@/lib/external-icons", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/external-icons")>()),
	getExternalIcons: vi.fn().mockResolvedValue([
		{
			source: "selfhst",
			slug: "github",
			name: "GitHub",
			external: {
				source: "selfhst",
				slug: "github",
				formats: ["svg", "png"],
				variants: { light: true },
				url_templates: {},
			},
			data: { base: "svg", aliases: [], categories: [] },
		},
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
			},
			updatedAt: "2026-01-01 00:00:00.000Z",
			data: { base: "svg", aliases: [], categories: [] },
		},
		{
			source: "simpleicons",
			slug: "claude",
			name: "Claude",
			external: {
				source: "simpleicons",
				slug: "claude",
				formats: ["svg", "png"],
				variants: { light: true, dark: true },
				url_templates: {},
				brand_color: "D97757",
			},
			updatedAt: "2026-01-01 00:00:00.000Z",
			data: { base: "svg", aliases: [], categories: [] },
		},
	]),
}))

describe("sitemap", () => {
	it("lists only self-hosted external images with their source dates", async () => {
		const { buildSitemap } = await import("../sitemap")
		const entries = await buildSitemap("external-simpleicons")
		const entry = entries.find(({ url }) => url === "https://dashboardicons.com/icons/external/claude")

		expect(entry?.lastModified).toBe("2026-01-01T00:00:00.000Z")
		expect(entry?.images).toEqual([
			"https://dashboardicons.com/api/icons/external/simpleicons/claude/brand.png",
			"https://dashboardicons.com/api/icons/external/simpleicons/claude/light.png",
			"https://dashboardicons.com/api/icons/external/simpleicons/claude/dark.png",
		])
	})

	it("lists a shared slug only in the sitemap of the source its page shows", async () => {
		const { buildSitemap } = await import("../sitemap")
		const [selfhst, simpleicons] = await Promise.all([buildSitemap("external-selfhst"), buildSitemap("external-simpleicons")])
		const githubUrl = "https://dashboardicons.com/icons/external/github"

		expect(selfhst.find(({ url }) => url === githubUrl)).toMatchObject({ images: [] })
		expect(selfhst.find(({ url }) => url === githubUrl)?.lastModified).toBeUndefined()
		expect(simpleicons.some(({ url }) => url === githubUrl)).toBe(false)
	})
})
