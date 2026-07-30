import { describe, expect, it } from "vitest"
import {
	assertIconName,
	getIconSchema,
	MAX_LIMIT_SEARCH,
	searchIconsSchema,
	ValidationError,
} from "@/lib/icons/validate"

describe("assertIconName", () => {
	it("accepts valid kebab-case names", () => {
		expect(assertIconName("plex")).toBe("plex")
		expect(assertIconName("home-assistant")).toBe("home-assistant")
	})

	it("rejects path traversal and invalid chars", () => {
		expect(() => assertIconName("../etc/passwd")).toThrow(ValidationError)
		expect(() => assertIconName("Foo Bar")).toThrow(ValidationError)
		expect(() => assertIconName("a".repeat(81))).toThrow(ValidationError)
	})
})

describe("searchIconsSchema", () => {
	it("rejects limit over MAX_LIMIT_SEARCH", () => {
		expect(() => searchIconsSchema.parse({ query: "plex", limit: 999 })).toThrow()
		expect(searchIconsSchema.parse({ query: "plex", limit: MAX_LIMIT_SEARCH }).limit).toBe(MAX_LIMIT_SEARCH)
	})

	it("rejects empty query over max length", () => {
		expect(() => searchIconsSchema.parse({ query: "x".repeat(101) })).toThrow()
	})
})

describe("getIconSchema", () => {
	it("validates icon name", () => {
		expect(getIconSchema.parse({ name: "docker" }).name).toBe("docker")
	})
})
