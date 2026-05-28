import { describe, expect, it, vi } from "vitest"

const mockImageResponse = vi.fn()

class MockImageResponse {
	constructor(...args: unknown[]) {
		mockImageResponse(...args)
	}
}

vi.mock("next/og", () => ({
	ImageResponse: MockImageResponse,
}))

vi.mock("@/lib/api", () => ({
	getTotalIcons: vi.fn(() => Promise.resolve({ totalIcons: 1234 })),
}))

vi.mock("@/constants", () => ({
	DASHBOARD_ICONS_ICON: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/dashboard-icons.svg",
}))

describe("OG default route handler", () => {
	it("exports correct content type and size", async () => {
		const mod = await import("../default/route")
		expect(mod.contentType).toBe("image/png")
		expect(mod.size).toEqual({ width: 1200, height: 630 })
	})

	it("returns ImageResponse with noindex header", async () => {
		mockImageResponse.mockClear()
		const { GET } = await import("../default/route")
		await GET(new Request("http://localhost/og/default"))

		expect(mockImageResponse).toHaveBeenCalledTimes(1)
		const options = mockImageResponse.mock.calls[0][1] as { headers: Record<string, string> }
		expect(options.headers["X-Robots-Tag"]).toBe("noindex")
	})
})
