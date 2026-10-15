import { describe, expect, it } from "vitest"
import { assertIconName, ValidationError } from "@/lib/icons/validate"

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
