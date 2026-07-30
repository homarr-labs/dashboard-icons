import { describe, expect, it } from "vitest"
import { filterAndSortIcons, normalizeForSearch, scoreIcon } from "@/lib/icons/search"
import type { IconWithName } from "@/types/icons"

const mockIcon = (name: string, aliases: string[] = []): IconWithName => ({
	name,
	data: {
		base: "svg",
		aliases,
		categories: [],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 1, name: "test" } },
	},
})

describe("normalizeForSearch", () => {
	it("strips hyphens and spaces", () => {
		expect(normalizeForSearch("home-assistant")).toBe("homeassistant")
	})
})

describe("filterAndSortIcons", () => {
	const icons = [mockIcon("plex"), mockIcon("plexamp", ["Plex Amp"])]

	it("finds plex by name", () => {
		const results = filterAndSortIcons({ icons, query: "plex", limit: 5 })
		expect(results[0]?.name).toBe("plex")
	})

	it("matches aliases", () => {
		const results = filterAndSortIcons({ icons, query: "plex amp", limit: 5 })
		expect(results.some((icon) => icon.name === "plexamp")).toBe(true)
	})
})

describe("scoreIcon", () => {
	it("scores exact name match highly", () => {
		expect(scoreIcon(mockIcon("docker"), "docker")).toBeGreaterThan(0.7)
	})
})
