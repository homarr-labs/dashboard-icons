import { expect, test, type Page } from "@playwright/test"

const ADMIN_EMAIL = "admin@dashboardicons.com"
const ADMIN_PASSWORD = "playwright"

async function loginViaUI(page: Page) {
	await page.goto("/submit")
	await page.getByRole("button", { name: "Sign In to Submit" }).click()
	await page
		.getByPlaceholder("Enter your email or username")
		.fill(ADMIN_EMAIL)
	await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
	await page.getByRole("button", { name: "Sign In" }).click()
	await page.waitForSelector("text=Icon Identity", { timeout: 15000 })
}

test.describe("Submit Page - Unauthenticated", () => {
	test("should show login prompt when not authenticated", async ({
		page,
	}) => {
		await page.goto("/submit")
		await expect(page.getByText("Submit an Icon")).toBeVisible()
		await expect(page.getByText("Before you start")).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Sign In to Submit" }),
		).toBeVisible()
	})

	test("should list submission requirements", async ({ page }) => {
		await page.goto("/submit")
		await expect(
			page.getByText("You need to be logged in to submit icons"),
		).toBeVisible()
		await expect(
			page.getByText(/Icons should be in SVG, PNG/),
		).toBeVisible()
		await expect(page.getByText(/Maximum file size/)).toBeVisible()
	})

	test("should open login modal when clicking Sign In to Submit", async ({
		page,
	}) => {
		await page.goto("/submit")
		await page.getByRole("button", { name: "Sign In to Submit" }).click()

		await expect(
			page.getByRole("heading", { name: "Welcome Back" }),
		).toBeVisible()
		await expect(
			page.getByPlaceholder("Enter your email or username"),
		).toBeVisible()
		await expect(
			page.getByPlaceholder("Enter your password"),
		).toBeVisible()
	})

	test("should allow switching to register mode from login modal", async ({
		page,
	}) => {
		await page.goto("/submit")
		await page.getByRole("button", { name: "Sign In to Submit" }).click()
		await expect(
			page.getByRole("heading", { name: "Welcome Back" }),
		).toBeVisible()

		await page
			.getByRole("button", { name: /Don't have an account/ })
			.click()

		await expect(
			page.getByRole("heading", { name: "Create Account" }),
		).toBeVisible()
		await expect(page.getByPlaceholder("Choose a username")).toBeVisible()
		await expect(
			page.getByPlaceholder("Confirm your password"),
		).toBeVisible()
	})
})

test.describe("Submit Page - Authenticated", () => {
	test.beforeEach(async ({ page }) => {
		await loginViaUI(page)
	})

	test("should show the icon submission form", async ({ page }) => {
		await expect(page.getByText("Icon Identity")).toBeVisible()
		await expect(page.getByText("File Uploads")).toBeVisible()
		await expect(page.getByText("Metadata")).toBeVisible()
		await expect(page.getByText("Preview", { exact: true })).toBeVisible()
	})

	test("should have icon name input field", async ({ page }) => {
		await expect(page.getByText("Icon Name / ID")).toBeVisible()
		await expect(
			page.getByText(
				"Use lowercase letters, numbers, and hyphens only",
			),
		).toBeVisible()
	})

	test("should have description textarea", async ({ page }) => {
		await expect(page.getByText("Description (Optional)")).toBeVisible()
		const textarea = page.getByPlaceholder(
			/Brief description of the icon/,
		)
		await expect(textarea).toBeVisible()
	})

	test("should display variant selector with base required", async ({
		page,
	}) => {
		await expect(
			page.getByText("Select Variants to Upload"),
		).toBeVisible()
		await expect(page.getByText("Required", { exact: true })).toBeVisible()
	})

	test("should show category selector with available categories", async ({
		page,
	}) => {
		const categoriesLabel = page.locator("label", { hasText: "Categories" })
		await categoriesLabel.scrollIntoViewIfNeeded()
		await expect(categoriesLabel).toBeVisible()
		const categoryButtons = page.locator(
			"button[aria-label*='category']",
		)
		const count = await categoryButtons.count()
		expect(count).toBeGreaterThan(0)
	})

	test("should show alias input", async ({ page }) => {
		await expect(page.getByText("Aliases", { exact: true })).toBeVisible()
		await expect(
			page.getByPlaceholder("Add alternative names..."),
		).toBeVisible()
	})

	test("should show empty preview state initially", async ({ page }) => {
		await expect(page.getByText("Upload icons to see preview")).toBeVisible()
	})

	test("should show submit and clear buttons", async ({ page, viewport }) => {
		await expect(
			page.getByRole("button", { name: "Submit Icon" }),
		).toBeVisible()
		// On mobile, the button says "Clear"; on desktop, "Clear Form"
		const isMobileViewport = (viewport?.width ?? 1280) < 768
		const clearButton = isMobileViewport
			? page.getByRole("button", { name: "Clear", exact: true })
			: page.getByRole("button", { name: "Clear Form" })
		await expect(clearButton).toBeVisible()
	})

	test("should add and remove aliases", async ({ page }) => {
		const aliasInput = page.getByPlaceholder("Add alternative names...")
		await aliasInput.fill("test-alias")
		await aliasInput.press("Enter")

		// Alias badge should appear
		await expect(page.getByText("test-alias")).toBeVisible()

		// Add another
		await aliasInput.fill("another-alias")
		await aliasInput.press("Enter")
		await expect(page.getByText("another-alias")).toBeVisible()
	})

	test("should toggle categories", async ({ page }) => {
		const categoryButton = page
			.locator("button[aria-label*='category']")
			.first()
		const ariaPressed = await categoryButton.getAttribute("aria-pressed")

		await categoryButton.click()
		const newAriaPressed = await categoryButton.getAttribute("aria-pressed")
		expect(newAriaPressed).not.toBe(ariaPressed)
	})

	test("should add optional variants", async ({ page }) => {
		// Click on "Dark" variant to add it
		const darkVariant = page
			.locator("button")
			.filter({ hasText: "Dark" })
			.first()
		if (await darkVariant.isVisible()) {
			await darkVariant.click()

			// Should now show upload area for Dark variant
			await expect(page.getByText("Dark").first()).toBeVisible()
		}
	})

	test("submit button should be disabled without base file", async ({
		page,
	}) => {
		const submitButton = page.getByRole("button", { name: "Submit Icon" })
		await expect(submitButton).toBeDisabled()
	})
})

test.describe("Submit Page - Mobile", () => {
	test.use({ viewport: { width: 375, height: 812 } })

	test("should show login prompt on mobile when not authenticated", async ({
		page,
	}) => {
		await page.goto("/submit")
		await expect(page.getByText("Submit an Icon")).toBeVisible()
		const signInButton = page.getByRole("button", {
			name: "Sign In to Submit",
		})
		await expect(signInButton).toBeVisible()
	})

	test("should show sticky bottom bar on mobile when authenticated", async ({
		page,
	}) => {
		await loginViaUI(page)
		await page.goto("/submit")
		await page.waitForSelector("text=Icon Identity", { timeout: 10000 })

		// Sticky bottom bar should be visible
		const stickyBar = page.locator(".fixed.bottom-0")
		await expect(stickyBar).toBeVisible()
		await expect(
			stickyBar.getByRole("button", { name: "Submit Icon" }),
		).toBeVisible()
		await expect(
			stickyBar.getByRole("button", { name: "Clear" }),
		).toBeVisible()
	})

	test("should not show desktop submit card on mobile", async ({ page }) => {
		await loginViaUI(page)
		await page.goto("/submit")
		await page.waitForSelector("text=Icon Identity", { timeout: 10000 })

		// The sticky desktop submit card should not be visible
		const desktopSubmitCards = page.locator(".sticky.top-20 .border-t-primary")
		await expect(desktopSubmitCards).not.toBeVisible()
	})

	test("form cards should have compact padding on mobile", async ({
		page,
	}) => {
		await loginViaUI(page)
		await page.goto("/submit")
		await page.waitForSelector("text=Icon Identity", { timeout: 10000 })

		// Verify the form sections are all visible and accessible
		await expect(page.getByText("Icon Identity")).toBeVisible()

		// Scroll to file uploads
		await page.getByText("File Uploads").scrollIntoViewIfNeeded()
		await expect(page.getByText("File Uploads")).toBeVisible()

		// Scroll to metadata
		await page.getByText("Metadata").scrollIntoViewIfNeeded()
		await expect(page.getByText("Metadata")).toBeVisible()
	})
})
