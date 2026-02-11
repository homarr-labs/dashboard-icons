import { expect, test } from "@playwright/test"

const ADMIN_EMAIL = "admin@dashboardicons.com"
const ADMIN_PASSWORD = "playwright"

test.describe("Authentication Flow", () => {
	test("should login via the login modal from header", async ({ page }) => {
		await page.goto("/")

		// Click submit button in header to trigger login
		const submitButton = page.getByRole("button", {
			name: /Submit icon/,
		})
		await submitButton.click()

		// Login modal should appear
		await expect(
			page.getByRole("heading", { name: "Welcome Back" }),
		).toBeVisible()

		// Fill in credentials
		await page
			.getByPlaceholder("Enter your email or username")
			.fill(ADMIN_EMAIL)
		await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)

		// Submit
		await page.getByRole("button", { name: "Sign In" }).click()

		// Wait for login to complete
		await page.waitForTimeout(2000)

		// User menu should appear in header
		await expect(
			page.getByRole("button", { name: /User menu/ }),
		).toBeVisible()

		// Dashboard link should appear in nav
		await expect(
			page.getByRole("link", { name: "Dashboard", exact: true }),
		).toBeVisible()
	})

	test("should show error for invalid credentials", async ({ page }) => {
		await page.goto("/submit")

		await page
			.getByRole("button", { name: "Sign In to Submit" })
			.click()

		await page
			.getByPlaceholder("Enter your email or username")
			.fill("invalid@test.com")
		await page.getByPlaceholder("Enter your password").fill("wrongpassword")
		await page.getByRole("button", { name: "Sign In" }).click()

		// Error message container should appear (the bg-destructive/10 div)
		const errorContainer = page.locator("[class*='bg-destructive']")
		await expect(errorContainer).toBeVisible({ timeout: 10000 })
	})

	test("should navigate to dashboard after login", async ({ page }) => {
		await page.goto("/")

		const submitButton = page.getByRole("button", {
			name: /Submit icon/,
		})
		await submitButton.click()

		await page
			.getByPlaceholder("Enter your email or username")
			.fill(ADMIN_EMAIL)
		await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
		await page.getByRole("button", { name: "Sign In" }).click()

		await page.waitForTimeout(2000)

		// Navigate to dashboard
		await page.getByRole("link", { name: "Dashboard", exact: true }).click()
		await page.waitForSelector("text=Submissions Dashboard", {
			timeout: 10000,
		})
		await expect(page.getByText("Submissions Dashboard")).toBeVisible()
	})

	test("should redirect to submit form after login from submit page", async ({
		page,
	}) => {
		await page.goto("/submit")

		await page
			.getByRole("button", { name: "Sign In to Submit" })
			.click()
		await page
			.getByPlaceholder("Enter your email or username")
			.fill(ADMIN_EMAIL)
		await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
		await page.getByRole("button", { name: "Sign In" }).click()

		// After login, the form should be visible
		await expect(page.getByText("Icon Identity")).toBeVisible({
			timeout: 10000,
		})
	})

	test("should show GitHub OAuth button", async ({ page }) => {
		await page.goto("/submit")
		await page
			.getByRole("button", { name: "Sign In to Submit" })
			.click()

		await expect(
			page.getByRole("button", { name: /Continue with GitHub/ }),
		).toBeVisible()
	})
})

test.describe("Authentication Flow - Mobile", () => {
	test.use({ viewport: { width: 375, height: 812 } })

	test("should login from mobile submit page", async ({ page }) => {
		await page.goto("/submit")

		await page
			.getByRole("button", { name: "Sign In to Submit" })
			.click()

		// Modal should be visible on mobile
		await expect(
			page.getByRole("heading", { name: "Welcome Back" }),
		).toBeVisible()

		await page
			.getByPlaceholder("Enter your email or username")
			.fill(ADMIN_EMAIL)
		await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
		await page.getByRole("button", { name: "Sign In" }).click()

		await expect(page.getByText("Icon Identity")).toBeVisible({
			timeout: 10000,
		})
	})
})
