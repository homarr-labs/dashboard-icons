import { describe, expect, it } from "vitest"
import { BASE_URL } from "@/constants"
import { buildIconUrl, buildIconUrls } from "@/lib/icons/urls"

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

describe("buildIconUrls", () => {
	it("includes variant urls when colors defined", () => {
		const urls = buildIconUrls("dagster", {
			base: "svg",
			aliases: [],
			categories: [],
			update: { timestamp: "", author: { id: 1 } },
			colors: { dark: "dagster-dark", light: "dagster-light" },
		})
		expect(urls.light).toContain("dagster-light")
		expect(urls.dark).toContain("dagster-dark")
	})
})
