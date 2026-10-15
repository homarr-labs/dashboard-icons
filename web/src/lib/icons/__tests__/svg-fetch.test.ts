import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearSvgCacheForTests, fetchTrustedSvg, getSvgCacheSizeForTests, isTrustedSvgUrl, MAX_SVG_BYTES } from "@/lib/icons/svg-fetch"

const URL_NATIVE = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg"
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'

const fetchMock = vi.fn()

beforeEach(() => {
	clearSvgCacheForTests()
	fetchMock.mockReset()
	vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe("isTrustedSvgUrl", () => {
	it("accepts https URLs on known CDNs", () => {
		expect(isTrustedSvgUrl(URL_NATIVE)).toBe(true)
		expect(isTrustedSvgUrl("https://cdn.simpleicons.org/github/181717")).toBe(true)
	})

	it("rejects other hosts, plain http, credentials and garbage", () => {
		expect(isTrustedSvgUrl("https://evil.example/plex.svg")).toBe(false)
		expect(isTrustedSvgUrl("http://cdn.jsdelivr.net/gh/x.svg")).toBe(false)
		expect(isTrustedSvgUrl("https://user:pass@cdn.jsdelivr.net/gh/x.svg")).toBe(false)
		expect(isTrustedSvgUrl("https://user@cdn.jsdelivr.net/gh/x.svg")).toBe(false)
		expect(isTrustedSvgUrl("https://:pass@cdn.jsdelivr.net/gh/x.svg")).toBe(false)
		expect(isTrustedSvgUrl("not a url")).toBe(false)
	})
})

describe("fetchTrustedSvg", () => {
	it("never fetches untrusted URLs", async () => {
		expect(await fetchTrustedSvg("https://evil.example/plex.svg")).toBeNull()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("fetches, validates and caches SVG text", async () => {
		fetchMock.mockResolvedValue(new Response(SVG))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBe(SVG)
		expect(await fetchTrustedSvg(URL_NATIVE)).toBe(SVG)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "error", cache: "no-store" })
	})

	it("refetches after the cache entry expires", async () => {
		const now = vi.spyOn(Date, "now").mockReturnValue(1_000)
		fetchMock.mockImplementation(async () => new Response(SVG))
		await fetchTrustedSvg(URL_NATIVE)
		now.mockReturnValue(1_000 + 60 * 60 * 1000 + 1)
		await fetchTrustedSvg(URL_NATIVE)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it("returns null for error statuses, empty bodies and non-SVG payloads", async () => {
		fetchMock.mockResolvedValueOnce(new Response(SVG, { status: 404 }))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
		fetchMock.mockResolvedValueOnce(new Response(null))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
		fetchMock.mockResolvedValueOnce(new Response(""))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
		fetchMock.mockResolvedValueOnce(new Response("<html><body>Not found</body></html>"))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
		expect(getSvgCacheSizeForTests()).toBe(0)
	})

	it("rejects payloads over the size cap by header or by streamed size", async () => {
		fetchMock.mockResolvedValueOnce(new Response(SVG, { headers: { "content-length": String(MAX_SVG_BYTES + 1) } }))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
		fetchMock.mockResolvedValueOnce(new Response(`<svg>${"a".repeat(MAX_SVG_BYTES)}</svg>`))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
	})

	it("returns null when the request fails", async () => {
		fetchMock.mockRejectedValueOnce(new Error("timeout"))
		expect(await fetchTrustedSvg(URL_NATIVE)).toBeNull()
	})

	it("keeps the cache bounded", async () => {
		fetchMock.mockImplementation(async () => new Response(SVG))
		for (let index = 0; index < 205; index++) {
			await fetchTrustedSvg(`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/icon-${index}.svg`)
		}
		expect(getSvgCacheSizeForTests()).toBe(200)
		await fetchTrustedSvg("https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/icon-0.svg")
		expect(fetchMock).toHaveBeenCalledTimes(206)
	})
})
