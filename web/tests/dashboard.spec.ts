import { expect, test, type Page } from "@playwright/test"

const ADMIN_EMAIL = "admin@dashboardicons.com"
const ADMIN_PASSWORD = "playwright"
const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://pb.dashboardicons.com"

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

test.describe("Dashboard - Unauthenticated", () => {
	test("should show inline login form when not logged in", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page.getByText("Welcome Back")).toBeVisible()
		await expect(
			page.getByRole("button", { name: /Continue with GitHub/ }),
		).toBeVisible()
		await expect(
			page.getByPlaceholder("Enter your email or username"),
		).toBeVisible()
		await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
	})

	test("should not show Dashboard link in navigation when logged out", async ({
		page,
	}) => {
		await page.goto("/dashboard")
		const nav = page.locator("nav")
		await expect(nav.getByRole("link", { name: "Dashboard" })).not.toBeVisible()
	})

	test("should login from inline form and show dashboard", async ({
		page,
	}) => {
		await page.goto("/dashboard")
		await page.getByPlaceholder("Enter your email or username").fill(ADMIN_EMAIL)
		await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD)
		await page.getByRole("button", { name: "Sign In" }).click()

		await expect(page.getByText("Submissions Dashboard")).toBeVisible({
			timeout: 15000,
		})
		expect(page.url()).toContain("/dashboard")
	})
})

test.describe("Dashboard - Authenticated Admin (Desktop)", () => {
	test.skip(({ viewport }) => (viewport?.width ?? 1280) < 768, "Desktop-only tests")

	test.beforeEach(async ({ page }) => {
		await loginViaUI(page)
		await page.goto("/dashboard")
		await page.waitForSelector("text=Submissions Dashboard", {
			timeout: 15000,
		})
	})

	test("should display the dashboard header with title and stats", async ({
		page,
	}) => {
		await expect(page.getByText("Submissions Dashboard")).toBeVisible()
		await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible()

		// Stats badges should be visible when there is data
		const statsSection = page.locator(".flex.flex-wrap.gap-2").first()
		await expect(statsSection).toBeVisible()
	})

	test("should show Dashboard link in navigation when logged in", async ({
		page,
	}) => {
		await expect(
			page.getByRole("link", { name: "Dashboard", exact: true }),
		).toBeVisible()
	})

	test("should display submission data in the table", async ({ page }) => {
		// Wait for table to render with data
		const table = page.locator("table")
		await expect(table).toBeVisible()

		// Check column headers exist
		await expect(page.getByRole("button", { name: "Name" })).toBeVisible()
		await expect(page.getByRole("button", { name: "Status" })).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Submitted By" }),
		).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Updated" }),
		).toBeVisible()
	})

	test("should display status group headers in the table", async ({
		page,
	}) => {
		const firstGroupHeader = page
			.locator("tr.bg-muted\\/40")
			.first()
		await expect(firstGroupHeader).toBeVisible()
		await expect(firstGroupHeader.locator("span").first()).toBeVisible()
	})

	test("should show approved submissions first for admin", async ({
		page,
	}) => {
		// The first group header should be "Approved" for admin users
		const firstGroupText = page.locator("tr.bg-muted\\/40").first()
		await expect(firstGroupText).toContainText(/approved/i)
	})

	test("should show action-needed banner for approved submissions", async ({
		page,
	}) => {
		const banner = page.getByText(/approved submission.*ready for GitHub CI/i)
		await expect(banner).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Select all approved" }),
		).toBeVisible()
	})

	test("should search and filter submissions", async ({ page }) => {
		const searchInput = page.getByPlaceholder("Search submissions...")
		await expect(searchInput).toBeVisible()

		// Type a search term
		await searchInput.fill("oase")
		await page.waitForTimeout(300)

		// Should filter results
		const rows = page.locator("table tbody tr").filter({ hasNot: page.locator(".bg-muted\\/40") })
		const visibleRows = rows.filter({ has: page.locator("td") })
		const count = await visibleRows.count()
		expect(count).toBeGreaterThan(0)
	})

	test("should expand a row to show submission details", async ({ page }) => {
		// Click the first data row (not header)
		const firstDataRow = page
			.locator("table tbody tr")
			.filter({ has: page.locator("td") })
			.filter({ hasNot: page.locator("td[colspan]") })
			.first()
		await firstDataRow.click()

		// Expanded details should appear
		await expect(page.getByText("Assets Preview")).toBeVisible()
		await expect(page.getByText("Submission Details")).toBeVisible()
	})

	test("should select approved submissions with checkboxes", async ({
		page,
	}) => {
		// Click "Select all approved" from the banner
		await page
			.getByRole("button", { name: "Select all approved" })
			.click()

		// Bulk actions toolbar should appear
		await expect(page.getByText(/selected/)).toBeVisible()
		await expect(
			page.getByRole("button", { name: /Trigger All/ }),
		).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Clear selection" }),
		).toBeVisible()
	})

	test("should clear selection from bulk toolbar", async ({ page }) => {
		await page
			.getByRole("button", { name: "Select all approved" })
			.click()
		await expect(page.getByText(/selected/)).toBeVisible()

		await page.getByRole("button", { name: "Clear selection" }).click()

		// Banner should reappear, bulk toolbar should disappear
		await expect(page.getByText(/selected/)).not.toBeVisible()
		await expect(
			page.getByText(/approved submission.*ready for GitHub CI/i),
		).toBeVisible()
	})

	test("should open approve dialog when approving a pending submission", async ({
		page,
	}) => {
		// Find and expand a pending row (pending is below approved for admins)
		const pendingGroupRow = page.locator("tr.bg-muted\\/40").filter({ hasText: /pending/i })
		await pendingGroupRow.scrollIntoViewIfNeeded()

		// Get the first data row after the pending group header
		const allRows = page.locator("table tbody tr")
		const pendingHeaderIndex = await pendingGroupRow.evaluate(
			(el) => Array.from(el.parentElement!.children).indexOf(el),
		)
		const pendingDataRow = allRows.nth(pendingHeaderIndex + 1)
		await pendingDataRow.click()
		await page.waitForTimeout(500)

		// Click approve button (use exact match)
		const approveButton = page.getByRole("button", { name: "Approve", exact: true })
		if (await approveButton.isVisible()) {
			await approveButton.click()
			await expect(
				page.getByRole("heading", { name: "Approve Submission" }),
			).toBeVisible()
		}
	})

	test("should open reject dialog when rejecting a pending submission", async ({
		page,
	}) => {
		const searchInput = page.getByPlaceholder("Search submissions...")
		await searchInput.fill("pending")
		await page.waitForTimeout(300)

		const pendingRow = page
			.locator("table tbody tr")
			.filter({ has: page.locator("td") })
			.filter({ hasNot: page.locator("td[colspan]") })
			.first()
		await pendingRow.click()
		await page.waitForTimeout(300)

		const rejectButton = page.getByRole("button", { name: "Reject" })
		if (await rejectButton.isVisible()) {
			await rejectButton.click()
			await expect(
				page.getByRole("heading", { name: "Reject Submission" }),
			).toBeVisible()
		}
	})

	test("should refresh data when clicking Refresh button", async ({
		page,
	}) => {
		const refreshButton = page.getByRole("button", { name: "Refresh" })
		await refreshButton.click()

		// The page should still display the dashboard after refresh
		await expect(page.getByText("Submissions Dashboard")).toBeVisible()
	})

	test("should show Run GitHub CI button in expanded approved submission", async ({
		page,
	}) => {
		// Find and expand the approved submission
		const approvedRow = page
			.locator("table tbody tr")
			.filter({ has: page.locator("td") })
			.filter({ hasNot: page.locator("td[colspan]") })
			.first()
		await approvedRow.click()
		await page.waitForTimeout(300)

		const ciButton = page.getByRole("button", { name: /Run GitHub CI/i })
		await expect(ciButton).toBeVisible()
	})
})

test.describe("Dashboard - Mobile", () => {
	test.use({ viewport: { width: 375, height: 812 } })

	test.beforeEach(async ({ page }) => {
		await loginViaUI(page)
		await page.goto("/dashboard")
		await page.waitForSelector("text=Submissions Dashboard", {
			timeout: 15000,
		})
	})

	test("should display card-based list instead of table on mobile", async ({
		page,
	}) => {
		// Table should not be visible on mobile
		await expect(page.locator("table")).not.toBeVisible()

		// Cards should be visible
		const cards = page.locator("[class*='rounded-lg'][class*='border'][class*='cursor-pointer']")
		await expect(cards.first()).toBeVisible()
	})

	test("should show status group headers on mobile", async ({ page }) => {
		// Group headers should be visible
		const groupHeaders = page.locator("text=/\\d+ submission/")
		const count = await groupHeaders.count()
		expect(count).toBeGreaterThan(0)
	})

	test("should open drawer when tapping a submission card", async ({
		page,
	}) => {
		// Find the first card by looking for capitalized submission names
		const submissionName = page.locator(".font-medium.capitalize").first()
		await expect(submissionName).toBeVisible({ timeout: 5000 })

		// Click the card container
		await submissionName.click()
		await page.waitForTimeout(1500)

		// Drawer should open - check for the drawer title (capitalize) which matches the submission name
		const drawerTitle = page.locator("[data-slot='drawer-title']")
		await expect(drawerTitle).toBeVisible({ timeout: 5000 })
	})

	test("should show action-needed banner on mobile", async ({ page }) => {
		await expect(
			page.getByText(/approved submission.*ready for/i),
		).toBeVisible()
		await expect(
			page.getByRole("button", { name: "Select all approved" }),
		).toBeVisible()
	})

	test("should display stat badges on mobile", async ({ page }) => {
		await expect(page.getByText(/\d+ Pending/)).toBeVisible()
		await expect(page.getByText(/\d+ Approved/)).toBeVisible()
	})

	test("search should work on mobile", async ({ page }) => {
		const searchInput = page.getByPlaceholder("Search submissions...")
		await searchInput.fill("oase")
		await page.waitForTimeout(300)

		// Should still show matching results
		await expect(page.getByText("Oase")).toBeVisible()
	})
})
