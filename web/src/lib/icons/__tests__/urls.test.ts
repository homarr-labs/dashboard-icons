import { describe, expect, it } from "vitest"
import { BASE_URL } from "@/constants"
import { buildIconUrl } from "@/lib/icons/urls"

describe("buildIconUrl", () => {
	it("builds default svg url", () => {
		expect(buildIconUrl("plex", "svg", "default")).toBe(`${BASE_URL}/svg/plex.svg`)
	})

	it("builds light theme url with suffix", () => {
		expect(buildIconUrl("github", "svg", "light")).toBe(`${BASE_URL}/svg/github-light.svg`)
	})

	it("builds dark theme png url", () => {
		expect(buildIconUrl("github", "png", "dark")).toBe(`${BASE_URL}/png/github-dark.png`)
	})
})
