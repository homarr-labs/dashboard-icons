import type { Page } from "@playwright/test"

export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? ""
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ""

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
	throw new Error(
		"TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in the environment for e2e tests.",
	)
}

export async function loginViaUI(page: Page) {
	await page.goto("/submit")
	await page.getByRole("button", { name: "Sign In to Submit" }).click()
	await page
		.getByPlaceholder("Enter your email or username")
		.fill(ADMIN_EMAIL)
	await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.waitForSelector("text=Icon Identity", { timeout: 15000 })
}
