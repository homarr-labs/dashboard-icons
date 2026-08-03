import { expect, test, type Page } from "@playwright/test"

const DIALOG_TITLE = /Connect Dashboard Icons/
const MCP_ENDPOINT = /\/api\/mcp/
const MCP_TRIGGER = /Add to MCP client|MCP setup/i

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem("licenseNoticeDismissed", "true")
	})
})

async function openMcpDialog(page: Page, trigger: ReturnType<Page["getByRole"]> | ReturnType<Page["getByTestId"]>) {
	await trigger.scrollIntoViewIfNeeded()
	await expect(trigger).toBeVisible()
	await trigger.click()

	const dialog = page.getByRole("dialog")
	await expect(dialog).toBeVisible()
	return dialog
}

async function openHeroMcpDialog(page: Page) {
	await page.goto("/")
	await page.waitForLoadState("domcontentloaded")
	return openMcpDialog(page, page.getByRole("button", { name: MCP_TRIGGER }))
}

test.describe("MCP setup dialog", () => {
	test("opens from hero with setup guides and tools", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		await expect(dialog.getByRole("heading", { name: DIALOG_TITLE })).toBeVisible()
		await expect(dialog.getByRole("heading", { name: "Choose your client", exact: true })).toBeVisible()
		await expect(dialog.getByRole("heading", { name: "Available tools", exact: true })).toBeVisible()
		await expect(dialog.getByText("search_icons")).toBeVisible()
		await expect(dialog.getByText("get_icon_url")).toBeVisible()
		await expect(dialog.getByText(".cursor/mcp.json", { exact: true })).toBeVisible()
		await expect(dialog.locator("code, pre").filter({ hasText: MCP_ENDPOINT }).first()).toBeVisible()
	})

	test("lists all supported MCP clients in the setup accordion", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		for (const client of ["Visual Studio Code", "Cursor", "Claude", "Windsurf", "Zed", "Custom MCP client"]) {
			await expect(dialog.getByRole("button", { name: client })).toBeVisible()
		}
	})

	test("expands Claude guide with CLI and desktop snippets", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		await dialog.getByRole("button", { name: "Claude" }).click()
		await expect(dialog.getByText("Claude Code", { exact: true })).toBeVisible()
		await expect(dialog.getByText("Claude Desktop", { exact: true })).toBeVisible()
		await expect(dialog.getByText("claude mcp add dashboard-icons")).toBeVisible()
		await expect(dialog.getByText("claude_desktop_config.json")).toBeVisible()
	})

	test("copy button copies the visible Cursor config", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"])
		const dialog = await openHeroMcpDialog(page)

		await dialog.getByRole("button", { name: /^Copy$/i }).first().click()
		await expect(dialog.getByRole("button", { name: /Copied/i })).toBeVisible()

		const clipboard = await page.evaluate(() => navigator.clipboard.readText())
		expect(clipboard).toMatch(MCP_ENDPOINT)
		expect(clipboard).toContain("dashboard-icons")
	})

	test("links to MCP documentation", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		await expect(dialog.getByRole("link", { name: /Full docs/i })).toHaveAttribute("href", /MCP\.md/)
		await expect(dialog.getByRole("link", { name: /What is MCP/i })).toHaveAttribute(
			"href",
			/modelcontextprotocol\.io/,
		)
	})
})

test.describe("MCP setup entry points", () => {
	test.describe.configure({ mode: "serial" })

	test("opens from icon browse page", async ({ page }) => {
		await page.goto("/icons")
		await page.waitForLoadState("domcontentloaded")
		await openMcpDialog(page, page.getByRole("button", { name: MCP_TRIGGER }))

		await expect(page.getByRole("heading", { name: DIALOG_TITLE })).toBeVisible()
	})

	test("does not appear on icon detail pages", async ({ page }) => {
		await page.goto("/icons/plex")
		await page.waitForLoadState("domcontentloaded")

		await expect(page.getByRole("button", { name: MCP_TRIGGER })).toHaveCount(0)
		await expect(page.getByRole("button", { name: "Set up MCP" })).toHaveCount(0)
	})
})
