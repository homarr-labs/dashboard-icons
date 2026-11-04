import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("licenseNoticeDismissed", "true"))
})

for (const query of ["", "openai", "   "]) {
	for (const sort of ["", "invalid"]) {
		test(`automatic sort for query ${JSON.stringify(query)} and sort ${JSON.stringify(sort)}`, async ({ page }) => {
			await page.route("**/api/icons/search", (route) => route.fulfill({
				json: [
					{ name: "openai", timestamp: "2020-01-01T00:00:00Z", aliases: [] },
					{ name: "claude-ai", timestamp: "2024-01-01T00:00:00Z", aliases: [] },
					{ name: "sonarr", timestamp: "2026-01-01T00:00:00Z", aliases: ["openai"] },
				].map(({ name, timestamp, aliases }) => ({
					name,
					source: "native",
					data: { base: "svg", aliases, categories: [], update: { timestamp, author: { id: 1 } } },
				})),
			}))
			const params = new URLSearchParams({ q: query })
			if (sort) params.set("sort", sort)
			await page.goto(`/icons?${params}`)
			let label = "Newest first"
			let firstIcon = "sonarr"
			if (query.trim()) {
				label = "Best match"
				firstIcon = "openai"
			}
			await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
			await expect(page.locator('main a[href^="/icons/"]:has(img)').first()).toHaveAttribute("href", `/icons/${firstIcon}`)
		})
	}
}

test("automatic defaults stay out of the URL when typing and clearing", async ({ page }) => {
	await page.goto("/icons?sort=invalid")
	await page.getByRole("searchbox", { name: "Search icons", exact: true }).fill("plex")
	await expect(page).toHaveURL(/\/icons\?q=plex$/)
	await expect(page.getByRole("button", { name: "Best match", exact: true })).toBeVisible()
	await page.getByRole("button", { name: "Clear search", exact: true }).click()
	await expect(page).toHaveURL(/\/icons$/)
	await expect(page.getByRole("button", { name: "Newest first", exact: true })).toBeVisible()
})

for (const [sort, label] of [
	["newest", "Newest first"],
	["relevance", "Best match"],
	["alphabetical-asc", "A to Z"],
	["alphabetical-desc", "Z to A"],
]) {
	test(`explicit ${sort} survives clearing and retyping a query`, async ({ page }) => {
		await page.goto(`/icons?q=plex&sort=${sort}`)
		await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
		await page.getByRole("button", { name: "Clear search", exact: true }).click()
		await expect(page).toHaveURL(`/icons?sort=${sort}`)
		await page.getByRole("searchbox", { name: "Search icons", exact: true }).fill("plex")
		await expect(page).toHaveURL(`/icons?q=plex&sort=${sort}`)
		await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
	})
}

for (const sort of ["", "newest"]) {
	test(`source change flushes a pending query with ${sort || "automatic"} sorting`, async ({ page }) => {
		await page.clock.install({ time: new Date("2026-11-04T12:00:00Z") })
		await page.goto(`/icons?${new URLSearchParams({ sort })}`)
		const source = page.getByRole("button", { name: "All sources", exact: true })
		await expect(source).toBeVisible()
		await page.clock.pauseAt(new Date("2026-11-04T12:05:00Z"))
		await page.getByRole("searchbox", { name: "Search icons", exact: true }).fill("plex")
		await source.press("Enter")
		await page.getByRole("menuitemradio", { name: "Dashboard Icons", exact: true }).press("Enter")
		await page.clock.runFor(250)
		await expect(page).toHaveURL((url) => {
			return url.searchParams.get("q") === "plex" && url.searchParams.get("source") === "native" &&
				(url.searchParams.get("sort") ?? "") === sort
		})
		let label = "Best match"
		if (sort) label = "Newest first"
		await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
	})
}
