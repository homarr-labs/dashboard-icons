import { describe, expect, it } from "vitest"
import robots from "../robots"

describe("robots", () => {
	it("allows the public Simple Icons images listed in the sitemap", () => {
		const rules = robots().rules
		expect(rules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					allow: expect.arrayContaining(["/api/icons/external/simpleicons/"]),
					disallow: expect.arrayContaining(["/api/"]),
				}),
			]),
		)
	})
})
