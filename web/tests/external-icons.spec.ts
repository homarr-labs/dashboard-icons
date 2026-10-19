import { expect, type Locator, test } from "@playwright/test"

const CARD_LINK = 'main a[href^="/icons/"]:has(img)'
const NATIVE_CARD_LINK = `${CARD_LINK}:not([href^="/icons/external/"])`
const EXTERNAL_CARD_LINK = `${CARD_LINK}[href^="/icons/external/"]`

async function expectLoadedImage(image: Locator) {
	await expect(image).toBeVisible()
	await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
}

test.describe("External icon source filter", () => {
	test("'All sources' shows both native and external icons", async ({ page }) => {
		await page.goto("/icons?q=2fauth")
		await expect(page.getByRole("button", { name: "All sources", exact: true })).toBeVisible()
		const nativeCard = page.locator(`${NATIVE_CARD_LINK}[href="/icons/2fauth"]`)
		const externalCard = page.locator(`${EXTERNAL_CARD_LINK}[href="/icons/external/selfhst/2fauth"]`)
		await expect(nativeCard).toBeVisible()
		await expect(externalCard).toBeVisible()
	})

	test("native filter excludes external icons", async ({ page }) => {
		await page.goto("/icons?source=native")
		await expect(page.getByRole("button", { name: /dashboard icons/i })).toBeVisible()

		const nativeCard = page.locator(NATIVE_CARD_LINK).first()
		await expect(nativeCard).toBeVisible()

		const externalCards = page.locator(EXTERNAL_CARD_LINK)
		await expect(externalCards).toHaveCount(0)
	})

	test("filter button shows source icon when a source is selected", async ({ page }) => {
		await page.goto("/icons?source=selfhst")
		const filterButton = page.getByRole("button", { name: /selfh\.st/i })
		await expect(filterButton).toBeVisible()
		await expectLoadedImage(filterButton.locator("img"))
	})
})

test.describe("External selfh.st icons", () => {
	test("source filter narrows browse results to selfh.st", async ({ page }) => {
		await page.goto("/icons?source=selfhst")
		await expect(page.getByRole("button", { name: /selfh\.st/i })).toBeVisible()

		const firstExternalCard = page.locator(`${CARD_LINK}[href^="/icons/external/selfhst/"]`).first()
		await expect(firstExternalCard).toBeVisible()
		await expect(page.locator(`${CARD_LINK}:not([href^="/icons/external/selfhst/"])`)).toHaveCount(0)
	})

	test("detail page renders attribution and jsDelivr assets", async ({ page }) => {
		await page.goto("/icons/external/selfhst/2fauth")

		await expect(page.getByRole("heading", { name: /2fauth/i })).toBeVisible()
		await expect(page.getByText("Icons by selfh.st/icons (CC BY 4.0)")).toBeVisible()
		await expect(page.getByRole("link", { name: /view on selfh\.st/i })).toBeVisible()

		const jsDelivrImages = page.locator('img[src*="cdn.jsdelivr.net/gh/selfhst/icons"]')
		await expectLoadedImage(jsDelivrImages.first())
	})

	test("old one-segment URL permanently redirects to the source-qualified page", async ({ request }) => {
		const response = await request.get("/icons/external/2fauth", { maxRedirects: 0 })

		expect(response.status()).toBe(308)
		expect(response.headers().location).toMatch(/\/icons\/external\/selfhst\/2fauth$/)
	})

	test("detail page shows both themed PNG variants", async ({ page }) => {
		await page.goto("/icons/external/selfhst/altcha")

		await expect(page.getByRole("heading", { name: "ALTCHA", level: 1 })).toBeVisible()
		await expectLoadedImage(page.locator('img[src$="/png/altcha-light.png"]'))
		await expectLoadedImage(page.locator('img[src$="/png/altcha-dark.png"]'))
	})
})

test.describe("External LobeHub icons", () => {
	test("source filter narrows browse results to LobeHub", async ({ page }) => {
		await page.goto("/icons?source=lobehub")
		await expect(page.getByRole("button", { name: /lobehub/i })).toBeVisible()

		const firstExternalCard = page.locator(`${CARD_LINK}[href^="/icons/external/lobehub/"]`).first()
		await expect(firstExternalCard).toBeVisible()
		await expect(page.locator(`${CARD_LINK}:not([href^="/icons/external/lobehub/"])`)).toHaveCount(0)
	})

	test("detail page renders attribution and jsDelivr assets", async ({ page }) => {
		await page.goto("/icons/external/lobehub/openai")

		await expect(page.getByRole("heading", { name: /openai/i })).toBeVisible()
		await expect(page.getByRole("region", { name: "License and attribution" }).getByText("Icons by LobeHub (MIT)")).toBeVisible()
		await expect(page.getByRole("link", { name: "Read MIT artwork license" })).toHaveAttribute(
			"href",
			"https://github.com/lobehub/lobe-icons/blob/master/LICENSE",
		)
		await expect(page.getByRole("link", { name: /view on lobehub/i })).toBeVisible()

		const jsDelivrImages = page.locator('img[src*="cdn.jsdelivr.net/npm/@lobehub"]')
		await expectLoadedImage(jsDelivrImages.first())
	})

	test("'View on LobeHub' links to the correct brand page", async ({ page }) => {
		await page.goto("/icons/external/lobehub/openai")

		const viewLink = page.getByRole("link", { name: /view on lobehub/i })
		await expect(viewLink).toHaveAttribute("href", "https://lobehub.com/icons/openai")
	})

	test("color variant is the primary entry, not duplicated with monochrome", async ({ page }) => {
		await page.goto("/icons?source=lobehub&q=adobe")
		await expect(page.getByRole("button", { name: "LobeHub", exact: true })).toBeVisible()

		const colorCard = page.locator(`${CARD_LINK}[href="/icons/external/lobehub/adobe-color"]`)
		await expect(colorCard).toBeVisible()
		await expect(colorCard).toHaveCount(1)
		await expectLoadedImage(colorCard.locator("img"))
		await expect(page.locator(`${CARD_LINK}[href="/icons/external/lobehub/adobe"]`)).toHaveCount(0)
	})

	test("detail page does not show SVG light/dark variants (only PNG/WebP have them)", async ({ page }) => {
		await page.goto("/icons/external/lobehub/openai")
		await expect(page.getByRole("heading", { name: "Openai", level: 1 })).toBeVisible()
		await expectLoadedImage(page.locator('img[src$="/icons/openai.svg"]').first())

		const svgLightImages = page.locator('img[src*="openai-light.svg"]')
		const svgDarkImages = page.locator('img[src*="openai-dark.svg"]')
		await expect(svgLightImages).toHaveCount(0)
		await expect(svgDarkImages).toHaveCount(0)
		for (const format of ["png", "webp"]) {
			await expectLoadedImage(page.locator(`img[src$="/light/openai.${format}"]`).first())
			await expectLoadedImage(page.locator(`img[src$="/dark/openai.${format}"]`))
		}
	})
})

test.describe("External Simple Icons", () => {
	test("source filter makes the complete Simple Icons catalogue searchable", async ({ page }) => {
		await page.goto("/icons?source=simpleicons&q=stackoverflow")
		await expect(page.getByRole("button", { name: /simple icons/i })).toBeVisible()

		const stackOverflowCard = page.locator(`${CARD_LINK}[href="/icons/external/simpleicons/stackoverflow"]`)
		await expect(stackOverflowCard).toBeVisible()
		await expect(page.locator(`${CARD_LINK}:not([href^="/icons/external/simpleicons/"])`)).toHaveCount(0)
	})

	test("source badge keeps its icon and label inside the hover or focus surface", async ({ page, isMobile }) => {
		await page.goto("/icons?source=simpleicons&q=stackoverflow")

		const cardLink = page.locator(`${CARD_LINK}[href="/icons/external/simpleicons/stackoverflow"]`)
		await expect(cardLink).toBeVisible()
		const card = cardLink.locator("..")
		const badgeLabel = card.getByText("from Simple Icons")
		const badge = badgeLabel.locator("..")
		await expect(badge).toHaveCSS("opacity", "0")
		if (isMobile) await cardLink.focus()
		else await cardLink.hover()
		await expect(badge).toHaveCSS("opacity", "1")
		await expect(badgeLabel).toBeVisible()

		const isContained = await badge.evaluate((element) => {
			const container = element.getBoundingClientRect()
			return [...element.children].every((child) => {
				const bounds = child.getBoundingClientRect()
				return (
					bounds.left >= container.left &&
					bounds.right <= container.right &&
					bounds.top >= container.top &&
					bounds.bottom <= container.bottom
				)
			})
		})
		expect(isContained).toBe(true)
	})

	test("detail page credits Simple Icons and uses its brand-color CDN asset", async ({ page }) => {
		await page.goto("/icons/external/simpleicons/stackoverflow")

		await expect(page.getByRole("heading", { name: /stack overflow/i })).toBeVisible()
		const attribution = page.getByRole("region", { name: "License and attribution" })
		await expect(
			attribution.getByRole("link", { name: "Stack Overflow icon via Simple Icons. Brand marks remain subject to their owners' terms." }),
		).toBeVisible()
		await expect(attribution.getByText("Artwork license: Not specified by this source.", { exact: true })).toBeVisible()
		await expect(attribution.getByRole("link", { name: "Simple Icons collection: CC0-1.0" })).toHaveAttribute(
			"href",
			"https://creativecommons.org/publicdomain/zero/1.0/",
		)
		await expect(attribution.getByText("The collection license does not cover every icon. Artwork rights may differ.")).toBeVisible()
		await expect(attribution.getByRole("link", { name: /artwork license/i })).toHaveCount(0)
		await expect(page.getByText(/brand color: #f58025/i)).toHaveCount(0)
		await expect(page.getByRole("link", { name: /view original source/i })).toHaveAttribute(
			"href",
			"https://stackoverflow.design/brand/logo/",
		)
		await expectLoadedImage(page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/F58025"]'))
	})

	test("offers brand, light, and dark variants in SVG and PNG", async ({ page }) => {
		await page.goto("/icons/external/simpleicons/stackoverflow")

		await expect(page.getByRole("heading", { name: "Brand color" })).toBeVisible()
		await expect(page.getByRole("heading", { name: "Light", exact: true })).toBeVisible()
		await expect(page.getByRole("heading", { name: "Dark", exact: true })).toBeVisible()
		await expect(page.getByAltText("Stack Overflow logo, white variant for dark backgrounds (SVG)")).toHaveAttribute(
			"src",
			"https://cdn.simpleicons.org/stackoverflow/FFFFFF",
		)
		await expect(page.getByAltText("Stack Overflow logo, black variant for light backgrounds (SVG)")).toHaveAttribute(
			"src",
			"https://cdn.simpleicons.org/stackoverflow/000000",
		)
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

	test("main preview follows the site theme through the keyboard-accessible menu", async ({ page }) => {
		await page.addInitScript(() => {
			window.localStorage.setItem("theme", "light")
			window.localStorage.setItem("licenseNoticeDismissed", "true")
		})
		await page.goto("/icons/external/simpleicons/stackoverflow")

		const preview = page.locator('img[src="https://cdn.simpleicons.org/stackoverflow/000000"]').first()
		await expect(preview).toBeVisible()
		await expect(preview).toHaveCSS("filter", "none")

		const themeToggle = page.getByRole("button", { name: "Toggle theme" })
		await themeToggle.focus()
		await themeToggle.press("Space")
		await page.getByRole("menu").getByRole("menuitem", { name: "Dark", exact: true }).click()
		await expect(page.locator("html")).toHaveClass(/dark/)
		await expect(preview).toBeVisible()
		await expect(preview).toHaveCSS("filter", "invert(1)")
	})

	test("brand-colored SVG remains available to the existing customizer", async ({ page }) => {
		await page.goto("/icons/external/simpleicons/stackoverflow")

		await page.getByRole("button", { name: /customize/i }).click()
		await expect(page.getByText(/customize colors/i)).toBeVisible()
		const colorControls = page.getByRole("button", { name: /hsl\(/i })
		await expect(colorControls).toHaveCount(1)
		await expect(colorControls.first()).toHaveAccessibleName(/hsl\(26, 91%, 55%\)/i)
	})
})

test.describe("External icon card hover behavior", () => {
	test("source badge appears on hover or focus for external icons", async ({ page, isMobile }) => {
		await page.goto("/icons?source=lobehub&q=openai")

		const cardLink = page.locator(`${CARD_LINK}[href="/icons/external/lobehub/openai"]`)
		await expect(cardLink).toBeVisible()
		const firstCard = cardLink.locator("..")

		const badge = firstCard.getByText("from LobeHub").locator("..")
		await expect(badge).toHaveCSS("opacity", "0")
		if (isMobile) await cardLink.focus()
		else await cardLink.hover()
		await expect(badge).toHaveCSS("opacity", "1")
		await expect(badge).toBeVisible()
	})

	test("native icons do not show source badge on hover or focus", async ({ page, isMobile }) => {
		await page.goto("/icons?source=native&q=2fauth")

		const cardLink = page.locator(`${NATIVE_CARD_LINK}[href="/icons/2fauth"]`)
		await expect(cardLink).toBeVisible()
		const firstCard = cardLink.locator("..")

		if (isMobile) await cardLink.focus()
		else await cardLink.hover()
		const badge = firstCard.getByText(/^from /)
		await expect(badge).toHaveCount(0)
	})
})
