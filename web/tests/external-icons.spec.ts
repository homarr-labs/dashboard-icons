import { expect, test } from "@playwright/test"

test.describe("External icon source filter", () => {
	test("'All sources' shows both native and external icons", async ({ page }) => {
		await page.goto("/icons")
		const nativeCard = page.locator('a[href^="/icons/"]:not([href^="/icons/external/"])').first()
		const externalCard = page.locator('a[href^="/icons/external/"]').first()
		await expect(nativeCard).toBeVisible()
		await expect(externalCard).toBeVisible()
	})

	test("native filter excludes external icons", async ({ page }) => {
		await page.goto("/icons?source=native")
		await expect(page.getByRole("button", { name: /dashboard icons/i })).toBeVisible()

		const nativeCard = page.locator('a[href^="/icons/"]:not([href^="/icons/external/"])').first()
		await expect(nativeCard).toBeVisible()

		const externalCards = page.locator('a[href^="/icons/external/"]')
		await expect(externalCards).toHaveCount(0)
	})

	test("filter button shows source icon when a source is selected", async ({ page }) => {
		await page.goto("/icons?source=selfhst")
		const filterButton = page.getByRole("button", { name: /selfh\.st/i })
		await expect(filterButton).toBeVisible()
		await expect(filterButton.locator("img")).toBeVisible()
	})
})

test.describe("External selfh.st icons", () => {
	test("source filter narrows browse results to selfh.st", async ({ page }) => {
		await page.goto("/icons?source=selfhst")
		await expect(page.getByRole("button", { name: /selfh\.st/i })).toBeVisible()

		const firstExternalCard = page.locator('a[href^="/icons/external/"]').first()
		await expect(firstExternalCard).toBeVisible()
	})

	test("detail page renders attribution and jsDelivr assets", async ({ page }) => {
		await page.goto("/icons/external/2fauth")

		await expect(page.getByRole("heading", { name: /2fauth/i })).toBeVisible()
		await expect(page.getByText("Icons by selfh.st/icons (CC BY 4.0)")).toBeVisible()
		await expect(page.getByRole("link", { name: /view on selfh\.st/i })).toBeVisible()

		const jsDelivrImages = page.locator('img[src*="cdn.jsdelivr.net/gh/selfhst/icons"]')
		await expect(jsDelivrImages.first()).toBeVisible()
	})

	test("detail page shows themed PNG variants when available", async ({ page }) => {
		await page.goto("/icons/external/altcha")

		const lightImages = page.locator('img[src*="altcha-light"]')
		const darkImages = page.locator('img[src*="altcha-dark"]')
		const hasLight = (await lightImages.count()) > 0
		const hasDark = (await darkImages.count()) > 0
		expect(hasLight || hasDark).toBe(true)
	})
})

test.describe("External LobeHub icons", () => {
	test("source filter narrows browse results to LobeHub", async ({ page }) => {
		await page.goto("/icons?source=lobehub")
		await expect(page.getByRole("button", { name: /lobehub/i })).toBeVisible()

		const firstExternalCard = page.locator('a[href^="/icons/external/"]').first()
		await expect(firstExternalCard).toBeVisible()
	})

	test("detail page renders attribution and jsDelivr assets", async ({ page }) => {
		await page.goto("/icons/external/openai-color")

		await expect(page.getByRole("heading", { name: /openai/i })).toBeVisible()
		await expect(page.getByText(/MIT/)).toBeVisible()
		await expect(page.getByRole("link", { name: /view on lobehub/i })).toBeVisible()

		const jsDelivrImages = page.locator('img[src*="cdn.jsdelivr.net/npm/@lobehub"]')
		await expect(jsDelivrImages.first()).toBeVisible()
	})

	test("'View on LobeHub' links to the correct brand page", async ({ page }) => {
		await page.goto("/icons/external/openai-color")

		const viewLink = page.getByRole("link", { name: /view on lobehub/i })
		await expect(viewLink).toHaveAttribute("href", /lobehub\.com\/icons\/openai/)
	})

	test("color variant is the primary entry, not duplicated with monochrome", async ({ page }) => {
		await page.goto("/icons?source=lobehub")

		await page.waitForSelector('a[href^="/icons/external/"]')
		const allCards = page.locator('a[href^="/icons/external/"]')
		const hrefs = await allCards.evaluateAll((els) => els.map((el) => el.getAttribute("href")))

		const openaiCards = hrefs.filter((h) => h?.includes("openai"))
		const hasColor = openaiCards.some((h) => h?.includes("openai-color"))
		expect(hasColor).toBe(true)

		const hasBareOpenai = openaiCards.some((h) => h === "/icons/external/openai")
		expect(hasBareOpenai).toBe(false)
	})

	test("detail page does not show SVG light/dark variants (only PNG/WebP have them)", async ({ page }) => {
		await page.goto("/icons/external/openai-color")

		const svgLightImages = page.locator('img[src*="openai-color-light.svg"]')
		const svgDarkImages = page.locator('img[src*="openai-color-dark.svg"]')
		await expect(svgLightImages).toHaveCount(0)
		await expect(svgDarkImages).toHaveCount(0)
	})
})

test.describe("External Simple Icons", () => {
	test("source filter makes the complete Simple Icons catalogue searchable", async ({ page }) => {
		await page.goto("/icons?source=simpleicons&q=stackoverflow")
		await expect(page.getByRole("button", { name: /simple icons/i })).toBeVisible()

		const stackOverflowCard = page.locator('a[href="/icons/external/stackoverflow"]')
		await expect(stackOverflowCard).toBeVisible()
	})

	test("source badge keeps its icon and label inside the hover surface", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name === "mobile-chrome", "Touch devices do not expose hover-only source badges")
		await page.goto("/icons?source=simpleicons&q=stackoverflow")

		const card = page.locator('a[href="/icons/external/stackoverflow"]').locator("../..")
		const badgeLabel = card.getByText("from Simple Icons")
		await card.hover()
		await expect(badgeLabel).toBeVisible()

		const badge = badgeLabel.locator("..")
		const isContained = await badge.evaluate((element) => {
			const container = element.getBoundingClientRect()
			return [...element.children].every((child) => {
				const bounds = child.getBoundingClientRect()
				return bounds.left >= container.left && bounds.right <= container.right && bounds.top >= container.top && bounds.bottom <= container.bottom
			})
		})
		expect(isContained).toBe(true)
	})

	test("detail page credits Simple Icons and uses its brand-color CDN asset", async ({ page }) => {
		await page.goto("/icons/external/stackoverflow")

		await expect(page.getByRole("heading", { name: /stack overflow/i })).toBeVisible()
		await expect(page.getByText(/stack overflow icon by simple icons \(cc0-1\.0\)/i)).toBeVisible()
		await expect(page.getByText(/brand color: #f58025/i)).toHaveCount(0)
		await expect(page.getByRole("link", { name: /view original source/i })).toHaveAttribute(
			"href",
			"https://stackoverflow.design/brand/logo/",
		)
		await expect(page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/F58025"]').first()).toBeVisible()
	})

	test("offers brand, light, and dark variants in SVG and PNG", async ({ page }) => {
		await page.goto("/icons/external/stackoverflow")

		await expect(page.getByRole("heading", { name: "Brand color" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "Light mode" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "Dark mode" })).toBeVisible()
		await expect(page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/000000"]').first()).toBeVisible()
		await expect(page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/FFFFFF"]')).toBeVisible()
		await expect(page.locator('img[src="/api/icons/external/simpleicons/stackoverflow/brand.png"]')).toBeVisible()
		await expect(page.locator('img[src="/api/icons/external/simpleicons/stackoverflow/light.png"]')).toBeVisible()
		await expect(page.locator('img[src="/api/icons/external/simpleicons/stackoverflow/dark.png"]')).toBeVisible()
		await expect(page.getByRole("button", { name: /show svg downloads/i })).toHaveCount(0)
		await expect(page.getByRole("button", { name: /show png downloads/i })).toHaveCount(0)

		const png = await page.request.get("/api/icons/external/simpleicons/stackoverflow/brand.png")
		expect(png.ok()).toBe(true)
		expect(png.headers()["content-type"]).toContain("image/png")
		expect((await png.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
	})

	test("main preview follows the site theme", async ({ page }) => {
		await page.addInitScript(() => window.localStorage.setItem("theme", "light"))
		await page.goto("/icons/external/stackoverflow")

		const preview = page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/000000"]').first()
		await expect(preview).toBeVisible()
		await expect(preview).toHaveCSS("filter", "none")

		await page.getByRole("button", { name: "Toggle theme" }).click()
		await page.getByRole("menuitem", { name: "Dark" }).click()
		await expect(preview).toBeVisible()
		await expect(preview).toHaveCSS("filter", "invert(1)")
	})

	test("brand-colored SVG remains available to the existing customizer", async ({ page }) => {
		await page.goto("/icons/external/stackoverflow")

		await page.getByRole("button", { name: /customize/i }).click()
		await expect(page.getByText(/customize colors/i)).toBeVisible()
		const colorControls = page.getByRole("button", { name: /hsl\(/i })
		await expect(colorControls).toHaveCount(1)
		await expect(colorControls.first()).toHaveAccessibleName(/hsl\(26, 91%, 55%\)/i)
	})
})

test.describe("External icon card hover behavior", () => {
	test("source badge appears on hover for external icons", async ({ page }) => {
		await page.goto("/icons?source=lobehub")

		const firstCard = page.locator(".group\\/card").first()
		await expect(firstCard).toBeVisible()

		const badge = firstCard.locator("text=from LobeHub")
		await firstCard.hover()
		await expect(badge).toBeVisible()
	})

	test("native icons do not show source badge on hover", async ({ page }) => {
		await page.goto("/icons?source=native")

		const firstCard = page.locator(".group\\/card").first()
		await expect(firstCard).toBeVisible()

		await firstCard.hover()
		const badge = firstCard.locator("text=from")
		await expect(badge).toHaveCount(0)
	})
})
