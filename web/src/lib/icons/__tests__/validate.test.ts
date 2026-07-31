import { describe, expect, it } from "vitest"
import {
	assertIconName,
	getIconSchema,
	getIconUrlSchema,
	MAX_LIMIT_SEARCH,
	MAX_LIMIT_SUGGEST,
	searchIconsSchema,
	suggestIconSchema,
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
		expect(() => assertIconName("")).toThrow(ValidationError)
		expect(() => assertIconName("bad\\name")).toThrow(ValidationError)
		expect(() => assertIconName("bad\0name")).toThrow(ValidationError)
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

	it("accepts optional category", () => {
		expect(searchIconsSchema.parse({ query: "plex", category: "media" }).category).toBe("media")
	})
})

describe("getIconSchema", () => {
	it("validates icon name", () => {
		expect(getIconSchema.parse({ name: "docker" }).name).toBe("docker")
		expect(getIconSchema.parse({ name: " docker " }).name).toBe("docker")
	})

	it("returns a structured Zod failure for invalid names", () => {
		const result = getIconSchema.safeParse({ name: "../etc/passwd" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.code).toBe("custom")
		}
	})
})

describe("getIconUrlSchema", () => {
	it("applies defaults", () => {
		expect(getIconUrlSchema.parse({ name: "docker" })).toEqual({
			name: "docker",
			format: "svg",
			theme: "default",
		})
	})
})

describe("suggestIconSchema", () => {
	it("clamps to max suggest limit boundary", () => {
		expect(suggestIconSchema.parse({ service_name: "plex", limit: MAX_LIMIT_SUGGEST }).limit).toBe(MAX_LIMIT_SUGGEST)
	})
})
