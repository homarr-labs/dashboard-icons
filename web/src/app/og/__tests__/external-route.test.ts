import { beforeEach, describe, expect, it, vi } from "vitest"

const mockImageResponse = vi.fn()
const mockNotFound = vi.fn()

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

const mockGetExternalIconBySourceAndSlug = vi.fn()
const mockGetTotalIcons = vi.fn()
const mockRasterizeRemoteSvg = vi.fn()

const EXTERNAL_SOURCES_MOCK = {
	simpleicons: {
		id: "simpleicons",
		label: "Simple Icons",
		authorName: "Simple Icons",
		authorLogin: "simple-icons",
		authorUrl: "https://github.com/simple-icons",
		cdnBase: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons",
		license: "CC0",
		icon: "https://cdn.example.com/icon.svg",
	},
	selfhst: {
		id: "selfhst",
		label: "Selfh.st",
		authorName: "Selfh.st",
		authorLogin: "selfhst",
		authorUrl: "https://selfh.st",
		cdnBase: "https://cdn.jsdelivr.net/gh/selfhst/icons",
		license: "MIT",
		icon: "https://cdn.example.com/icon2.svg",
	},
}

vi.mock("@/lib/api", () => ({
	getTotalIcons: (...args: unknown[]) => mockGetTotalIcons(...args),
}))

vi.mock("@/lib/external-icons", () => ({
	getExternalIconBySourceAndSlug: (...args: unknown[]) => mockGetExternalIconBySourceAndSlug(...args),
}))

vi.mock("@/lib/rasterize-svg", () => ({
	rasterizeRemoteSvg: (...args: unknown[]) => mockRasterizeRemoteSvg(...args),
}))

vi.mock("@/constants", () => ({
	EXTERNAL_SOURCES: EXTERNAL_SOURCES_MOCK,
	ExternalSourceId: null,
	isExternalSourceId: (value: string) => value in EXTERNAL_SOURCES_MOCK,
}))

function makeExternalIcon(slug: string, sourceId: string, formats: string[] = ["svg", "png"]) {
	return {
		source: sourceId,
		slug,
		external: {
			id: slug,
			source: sourceId,
			slug,
			name: slug
				.split("-")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" "),
			formats,
			brand_color: "000000",
			url_templates: (() => {
				const templates: Record<string, string> = {}
				for (const f of formats) {
					templates[f] = `https://cdn.example.com/${f}/${slug}.${f}`
				}
				return templates
			})(),
			categories: [],
			aliases: [],
			variants: {},
			license: "CC0",
			attribution: "",
			source_url: "",
		},
		data: {},
	}
}

describe("OG external icon route handler", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetTotalIcons.mockResolvedValue({ totalIcons: 42 })
		mockRasterizeRemoteSvg.mockResolvedValue(new ArrayBuffer(8))
	})

	it("exports correct content type and size", async () => {
		const mod = await import("../external/[source]/[slug]/route")
		expect(mod.contentType).toBe("image/png")
		expect(mod.size).toEqual({ width: 1200, height: 630 })
	})

	it("returns ImageResponse for valid external icons", async () => {
		const icon = makeExternalIcon("docker", "simpleicons")
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/docker")
		await GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "docker" }) })

		expect(mockImageResponse).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				headers: expect.objectContaining({
					"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
				}),
			}),
		)
	})

	it("strips .png extension from slug param", async () => {
		const icon = makeExternalIcon("docker", "simpleicons")
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/docker.png")
		await GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "docker.png" }) })

		expect(mockGetExternalIconBySourceAndSlug).toHaveBeenCalledWith("simpleicons", "docker")
		expect(mockImageResponse).toHaveBeenCalled()
	})

	it("calls notFound for unknown external icons", async () => {
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(null)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/nonexistent")
		await expect(GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "nonexistent" }) })).rejects.toThrow(
			"NEXT_NOT_FOUND",
		)

		expect(mockNotFound).toHaveBeenCalled()
		expect(mockImageResponse).not.toHaveBeenCalled()
	})

	it("handles 20+ external icons from all sources", async () => {
		const { GET } = await import("../external/[source]/[slug]/route")

		const testIcons = [
			{ slug: "docker", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "kubernetes", source: "simpleicons", formats: ["svg"] },
			{ slug: "react", source: "simpleicons", formats: ["svg", "png", "webp"] },
			{ slug: "python", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "nodejs", source: "simpleicons", formats: ["svg"] },
			{ slug: "postgresql", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "redis", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "mongodb", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "nginx", source: "simpleicons", formats: ["svg"] },
			{ slug: "grafana", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "prometheus", source: "simpleicons", formats: ["svg"] },
			{ slug: "jellyfin", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "portainer", source: "simpleicons", formats: ["svg"] },
			{ slug: "traefik", source: "simpleicons", formats: ["svg", "png"] },
			{ slug: "vault", source: "simpleicons", formats: ["svg"] },
			{ slug: "adguard", source: "selfhst", formats: ["png"] },
			{ slug: "homepage", source: "selfhst", formats: ["svg", "png"] },
			{ slug: "uptime-kuma", source: "selfhst", formats: ["svg"] },
			{ slug: "changedetection", source: "selfhst", formats: ["svg", "png"] },
			{ slug: "stirling-pdf", source: "selfhst", formats: ["svg"] },
			{ slug: "immich", source: "selfhst", formats: ["svg", "png"] },
			{ slug: "paperless-ngx", source: "selfhst", formats: ["svg"] },
		]

		for (const { slug, source, formats } of testIcons) {
			const icon = makeExternalIcon(slug, source, formats)
			mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
			mockImageResponse.mockClear()

			const request = new Request(`http://localhost/og/external/${source}/${slug}`)
			await GET(request, { params: Promise.resolve({ source, slug }) })

			expect(mockImageResponse).toHaveBeenCalledTimes(1)
		}
	})

	it("sets correct cache headers for external OG images", async () => {
		const icon = makeExternalIcon("docker", "simpleicons")
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/docker")
		await GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "docker" }) })

		const callArgs = mockImageResponse.mock.calls[0]
		const options = callArgs[1]
		expect(options.headers["Cache-Control"]).toBe("public, s-maxage=86400, stale-while-revalidate=604800")
		expect(options.headers["CDN-Cache-Control"]).toBe("public, max-age=86400, stale-while-revalidate=604800")
	})

	it("resolves all Simple Icons URL template placeholders before loading the image", async () => {
		const icon = makeExternalIcon("docker", "simpleicons")
		icon.external.brand_color = "2496ED"
		icon.external.url_templates.svg = "https://cdn.simpleicons.org/{slug}/{hex}"
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)

		const { GET } = await import("../external/[source]/[slug]/route")
		await GET(new Request("http://localhost/og/external/simpleicons/docker"), {
			params: Promise.resolve({ source: "simpleicons", slug: "docker" }),
		})

		expect(mockRasterizeRemoteSvg).toHaveBeenCalledWith("https://cdn.simpleicons.org/docker/2496ED", 260)
		expect(mockRasterizeRemoteSvg).not.toHaveBeenCalledWith(expect.stringContaining("{"), expect.anything())
	})

	it("handles icons with only non-standard formats", async () => {
		const icon = makeExternalIcon("weird-icon", "simpleicons", ["ico", "gif"])
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/weird-icon")
		await GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "weird-icon" }) })

		expect(mockImageResponse).toHaveBeenCalled()
	})

	it("handles icons with no formats gracefully", async () => {
		const icon = makeExternalIcon("no-format-icon", "simpleicons", [])
		mockGetExternalIconBySourceAndSlug.mockResolvedValue(icon)
		mockImageResponse.mockClear()

		const { GET } = await import("../external/[source]/[slug]/route")
		const request = new Request("http://localhost/og/external/simpleicons/no-format-icon")
		await GET(request, { params: Promise.resolve({ source: "simpleicons", slug: "no-format-icon" }) })

		expect(mockImageResponse).toHaveBeenCalled()
	})
})
