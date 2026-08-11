import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetIcon = vi.fn()
const mockRasterizeRemoteSvg = vi.fn()

vi.mock("@/lib/external-icons", () => ({
	getExternalIconBySourceAndSlug: (...args: unknown[]) => mockGetIcon(...args),
}))
vi.mock("@/lib/rasterize-svg", () => ({
	rasterizeRemoteSvg: (...args: unknown[]) => mockRasterizeRemoteSvg(...args),
}))

describe("Simple Icons PNG route", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetIcon.mockResolvedValue({
			external: { source: "simpleicons", slug: "github", brand_color: "181717", url_templates: {} },
		})
		mockRasterizeRemoteSvg.mockResolvedValue(Uint8Array.from([137, 80, 78, 71]).buffer)
	})

	it("returns a rasterized PNG for the requested variant", async () => {
		const { GET } = await import("../[slug]/[variant]/route")
		const response = await GET(new Request("http://localhost"), {
			params: Promise.resolve({ slug: "github", variant: "light.png" }),
		})

		expect(mockRasterizeRemoteSvg).toHaveBeenCalledWith("https://cdn.simpleicons.org/github/000000", 640)
		expect(response.status).toBe(200)
		expect(response.headers.get("Content-Type")).toBe("image/png")
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([137, 80, 78, 71]))
	})

	it("returns a controlled error when the upstream SVG cannot be loaded", async () => {
		mockRasterizeRemoteSvg.mockRejectedValue(new Error("fetch failed"))
		const { GET } = await import("../[slug]/[variant]/route")
		const response = await GET(new Request("http://localhost"), {
			params: Promise.resolve({ slug: "github", variant: "brand" }),
		})

		expect(response.status).toBe(502)
	})
})
