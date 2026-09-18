import sharp from "sharp"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { rasterizeRemoteSvg } from "../rasterize-svg"

describe("rasterizeRemoteSvg", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("applies a validated fill color before rasterizing", async () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>'
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(svg)))

		const png = await rasterizeRemoteSvg("https://example.com/icon.svg", 4, "#FF0000")
		const { data, info } = await sharp(Buffer.from(png)).raw().toBuffer({ resolveWithObject: true })

		expect(info).toMatchObject({ width: 4, height: 4, channels: 4 })
		expect([...data.subarray(0, 4)]).toEqual([255, 0, 0, 255])
	})

	it("rejects an unsafe fill value", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<svg/>")))

		await expect(rasterizeRemoteSvg("https://example.com/icon.svg", 4, 'red" onload="alert(1)')).rejects.toThrow("Invalid SVG fill color")
	})
})
