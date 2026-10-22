import { expect, test } from "@playwright/test"

for (const theme of ["dark", "light"]) {
	test(`keyboard-focused tooltip has readable contrast in ${theme} theme`, async ({ page }) => {
		await page.addInitScript((theme) => {
			localStorage.setItem("theme", theme)
			localStorage.setItem("licenseNoticeDismissed", "true")
		}, theme)
		await page.goto("/submit")
		await expect(page.getByRole("button", { name: "Sign In to Submit" })).toBeVisible({ timeout: 15_000 })
		await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`))

		const trigger = page.getByRole("contentinfo").getByRole("button", { name: "Toggle theme" })
		await trigger.scrollIntoViewIfNeeded()
		await page.getByRole("contentinfo").getByRole("link", { name: "GitHub", exact: true }).focus()
		await page.keyboard.press("Tab")
		await expect(trigger).toBeFocused()

		const tooltip = page.locator('[data-slot="tooltip-content"]')
		await expect(tooltip).toBeVisible()
		await expect(tooltip).toHaveText(/Change theme/)

		const contrast = await tooltip.evaluate((element) => {
			const style = getComputedStyle(element)
			const canvas = document.createElement("canvas")
			canvas.width = canvas.height = 1
			const context = canvas.getContext("2d")
			if (!context) throw new Error("Canvas context unavailable")

			const luminance = (color: string) => {
				// Resolve CSS colors (including OKLCH) to sRGB before applying WCAG's formula.
				context.clearRect(0, 0, 1, 1)
				context.fillStyle = color
				context.fillRect(0, 0, 1, 1)
				const pixel = context.getImageData(0, 0, 1, 1).data
				if (pixel[3] !== 255) throw new Error("Expected opaque tooltip colors")
				const [r, g, b] = Array.from(pixel)
					.slice(0, 3)
					.map((channel) => {
						const srgb = channel / 255
						return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
					})
				return 0.2126 * r + 0.7152 * g + 0.0722 * b
			}

			const foreground = luminance(style.color)
			const background = luminance(style.backgroundColor)
			return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
		})

		expect(contrast, "Normal-size tooltip text must meet WCAG AA contrast").toBeGreaterThanOrEqual(4.5)
	})
}
