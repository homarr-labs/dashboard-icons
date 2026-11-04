import { expect, test, type Page } from "@playwright/test"

const DIALOG_TITLE = /Connect Dashboard Icons/
const MCP_TRIGGER = /Use with AI/i

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
		for (const tool of ["match_icons", "search_icons", "get_icon", "get_icon_svg", "browse_icons", "list_categories"]) {
			await expect(dialog.getByText(tool, { exact: true })).toBeVisible()
		}
		await expect(dialog.getByRole("link", { name: "Add to ChatGPT" })).toHaveAttribute(
			"href",
			"https://chatgpt.com/plugins/plugin_asdk_app_6adb7403f24881918e4a466aaafac771",
		)
	})

	test("lists all supported MCP clients in the setup accordion", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		for (const client of ["ChatGPT", "Visual Studio Code", "Cursor", "Claude", "Custom MCP client"]) {
			await expect(dialog.getByRole("button", { name: client })).toBeVisible()
		}
	})

	test("expands Claude guide with CLI and desktop snippets", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)

		await dialog.getByRole("button", { name: "Claude" }).click()
		await expect(dialog.getByText("Claude Code", { exact: true })).toBeVisible()
		await expect(dialog.getByText("Claude Desktop", { exact: true })).toBeVisible()
		await expect(dialog.getByText("claude mcp add --transport http dashboard-icons")).toBeVisible()
		await expect(dialog.getByText("Remote MCP server URL")).toBeVisible()
	})

	test("links to the ChatGPT plugin in a new tab", async ({ page }) => {
		const dialog = await openHeroMcpDialog(page)
		const link = dialog.getByRole("link", { name: "Add to ChatGPT" })
		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute("target", "_blank")
		await expect(link).toHaveAttribute("rel", "noopener noreferrer")
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


test.describe("native MCP snippets", () => {
	for (const [client, wrapper, entry] of [
		["Visual Studio Code", "servers", { type: "http", url: "https://dashboardicons.com/api/mcp" }],
		["Custom MCP client", "mcpServers", { command: "npx", args: ["-y", "mcp-remote@0.15.1", "https://dashboardicons.com/api/mcp"] }],
	] as const) {
		test(`copies the ${client} configuration`, async ({ page, context }) => {
			await context.grantPermissions(["clipboard-read", "clipboard-write"])
			const dialog = await openHeroMcpDialog(page)
			const trigger = dialog.getByRole("button", { name: client, exact: true })
			await trigger.click()
			const panel = page.locator(`[id="${await trigger.getAttribute("aria-controls")}"]`)
			await panel.getByRole("button", { name: /^Copy$/i }).click()
			await expect(panel.getByRole("button", { name: /Copied/i })).toBeVisible()
			const clipboard = await page.evaluate(() => navigator.clipboard.readText())
			expect(JSON.parse(clipboard)).toEqual({ [wrapper]: { "dashboard-icons": entry } })
		})
	}

	test("copies only the Claude Desktop connector URL", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"])
		const dialog = await openHeroMcpDialog(page)
		const trigger = dialog.getByRole("button", { name: "Claude", exact: true })
		await trigger.click()
		const panel = page.locator(`[id="${await trigger.getAttribute("aria-controls")}"]`)
		await expect(panel.getByText("Remote MCP server URL", { exact: true })).toBeVisible()
		await expect(panel.locator("pre").nth(1)).toHaveText("https://dashboardicons.com/api/mcp")
		await panel.getByRole("button", { name: /^Copy$/i }).nth(1).click()
		await expect(panel.getByRole("button", { name: /Copied/i })).toBeVisible()
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://dashboardicons.com/api/mcp")
	})
})
