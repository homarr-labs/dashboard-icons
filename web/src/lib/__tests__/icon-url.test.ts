import { describe, expect, it, vi } from "vitest"
import { BASE_URL } from "@/constants"
import { getIconImageUrl } from "@/lib/icon-url"
import type { ExternalIcon, IconWithName } from "@/types/icons"

vi.mock("@/lib/external-icon-urls", () => ({
	getExternalIconPreviewUrl: vi.fn(() => "https://external.example/icon.svg"),
}))

const nativeIcon = (overrides: Partial<IconWithName> = {}): IconWithName => ({
	name: "plex",
	data: {
		base: "svg",
		aliases: [],
		categories: [],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1 } },
	},
	...overrides,
})

describe("getIconImageUrl", () => {
	it("returns external preview url for non-native icons", () => {
		const external = { slug: "plex", source: "selfhst" } as ExternalIcon
		const url = getIconImageUrl({
			...nativeIcon(),
			source: "selfhst",
			external,
		})
		expect(url).toBe("https://external.example/icon.svg")
	})

	it("returns absolute base url when icon base is http", () => {
		const url = getIconImageUrl(
			nativeIcon({
				data: {
					base: "https://cdn.example/custom.svg",
					aliases: [],
					categories: [],
					update: { timestamp: "", author: { id: 1 } },
				},
			}),
		)
		expect(url).toBe("https://cdn.example/custom.svg")
	})

	it("builds png url for png base", () => {
		const url = getIconImageUrl(
			nativeIcon({
				name: "plex",
				data: {
					base: "png",
					aliases: [],
					categories: [],
					update: { timestamp: "", author: { id: 1 } },
				},
			}),
		)
		expect(url).toBe(`${BASE_URL}/png/plex.png`)
	})

	it("builds webp url for webp base", () => {
		const url = getIconImageUrl(
			nativeIcon({
				name: "plex",
				data: {
					base: "webp",
					aliases: [],
					categories: [],
					update: { timestamp: "", author: { id: 1 } },
				},
			}),
		)
		expect(url).toBe(`${BASE_URL}/webp/plex.webp`)
	})

	it("defaults to svg url for native icons", () => {
		expect(getIconImageUrl(nativeIcon())).toBe(`${BASE_URL}/svg/plex.svg`)
	})
})
