import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import PocketBase, { ClientResponseError } from "pocketbase"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_SUBMITTED_SVG_BYTES } from "@/lib/icons/svg-safety"
import type { McpSession } from "@/mcp/caller"
import { DASHBOARD_ICONS_TOOLS, registerDashboardIconsTools } from "@/mcp/tools"
import { SIGN_IN_EXPIRED } from "@/mcp/tools/account"
import { listMySubmissionsTool } from "@/mcp/tools/list-my-submissions"
import { proposeIconUpdateTool } from "@/mcp/tools/propose-icon-update"
import { submitIconTool } from "@/mcp/tools/submit-icon"

const pb = vi.hoisted(() => ({
	authRefresh: vi.fn(),
	create: vi.fn(),
	getList: vi.fn(),
	getOne: vi.fn(),
	update: vi.fn(),
	getFullList: vi.fn(),
	getAllIcons: vi.fn(),
	tokens: [] as string[],
}))

vi.mock("@/lib/pb", () => ({
	createServerPB: () => {
		const client = new PocketBase("http://127.0.0.1:8090")
		const as =
			<Args extends unknown[]>(method: (...args: Args) => unknown) =>
			(...args: Args) => {
				pb.tokens.push(client.authStore.token)
				return method(...args)
			}
		client.collection = ((name: string) => {
			if (name === "users") return { authRefresh: as(pb.authRefresh) }
			return {
				create: as(pb.create),
				getList: as(pb.getList),
				getFullList: as(pb.getFullList),
				getOne: as(pb.getOne),
				update: as(pb.update),
			}
		}) as never
		return client
	},
}))

vi.mock("@/lib/icons/service", () => ({ getAllIcons: pb.getAllIcons }))

const update = vi.hoisted(() => ({ loadUpdateTarget: vi.fn(), createIconUpdate: vi.fn(), updateOwnIconUpdate: vi.fn() }))
vi.mock("@/lib/icon-update-service", () => update)

const SESSION: McpSession = { caller: { userId: "user_1", username: "iconfan", admin: false }, pbToken: "pb-old" }
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>'

const TARGET = {
	kind: "published",
	name: "my-app",
	id: "",
	revision: "rev-1",
	updated: "",
	status: "published",
	metadata: { base: "svg", aliases: ["My App"], categories: ["media"] },
	files: { base: "my-app.svg", light: "my-app-light.svg", "custom:4k": "my-app-4k.svg" },
}

type ToolCallback = (args: Record<string, unknown>) => Promise<CallToolResult>

function register(session: McpSession | null) {
	const callbacks = new Map<string, ToolCallback>()
	const registerTool = (name: string, _config: unknown, callback: ToolCallback) => callbacks.set(name, callback)
	registerDashboardIconsTools({ registerTool } as unknown as McpServer, session)
	return (name: string, args: Record<string, unknown>) => callbacks.get(name)?.(args) as Promise<CallToolResult>
}

function textOf(result: CallToolResult): string {
	const [block] = result.content
	if (block?.type !== "text") throw new Error("expected a text block")
	return block.text
}

beforeEach(() => {
	vi.clearAllMocks()
	pb.tokens.length = 0
	pb.getAllIcons.mockResolvedValue({ plex: {} })
	pb.getFullList.mockResolvedValue([])
	pb.getList.mockResolvedValue({ items: [], totalItems: 0 })
	update.loadUpdateTarget.mockResolvedValue(TARGET)
	update.createIconUpdate.mockResolvedValue({ ok: true, record: { id: "upd1", name: "my-app", status: "pending" } })
	update.updateOwnIconUpdate.mockResolvedValue({ id: "rej1", name: "my-app", status: "pending" })
	pb.authRefresh.mockResolvedValue({ token: "pb-fresh", record: { id: "user_1", username: "iconfan", admin: false } })
})

describe("account tool registry", () => {
	it("flags account tools and describes submit_icon as a non-idempotent write", () => {
		expect(DASHBOARD_ICONS_TOOLS.filter((tool) => tool.access === "account").map((tool) => tool.name)).toEqual([
			"submit_icon",
			"propose_icon_update",
			"list_my_submissions",
		])
		expect(submitIconTool.config.annotations).toEqual({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		})
		for (const text of ["one call per Icon", "Never split Variants", "sign in", "512 KiB", "48 KiB", "rejection is not final"]) {
			expect(submitIconTool.config.description).toContain(text)
		}
	})

	it.each(["submit_icon", "propose_icon_update"])("refuses anonymous %s callers without touching PocketBase", async (name) => {
		const result = await register(null)(name, { name: "my-app", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("needs a signed-in dashboardicons.com account")
		expect(pb.authRefresh).not.toHaveBeenCalled()
	})

	it("validates inputs the way the site does", () => {
		const { inputSchema } = submitIconTool.config
		expect(inputSchema.safeParse({ name: "My App", svg: SVG }).success).toBe(false)
		expect(inputSchema.safeParse({ name: "my--app", svg: SVG }).success).toBe(false)
		expect(inputSchema.safeParse({ name: " my-app ", svg: SVG, categories: ["ai"] }).success).toBe(false)
		expect(inputSchema.parse({ name: " my-app ", svg: SVG, categories: ["media"] })).toMatchObject({ name: "my-app" })
		expect(inputSchema.safeParse({ name: "my-app", svg: SVG, variants: { white: SVG } }).success).toBe(false)
		expect(listMySubmissionsTool.config.inputSchema.parse({})).toEqual({ limit: 20 })
	})
})

describe("submit_icon", () => {
	it("creates a pending submission as the user with the site's record shape", async () => {
		pb.create.mockResolvedValue({ id: "rec1", name: "my-app", status: "pending" })
		const result = await register(SESSION)("submit_icon", {
			name: "my-app",
			svg: `  ${SVG}\n`,
			aliases: ["My App", "My App", "myapp"],
			categories: ["media", "media", "tools"],
			description: "A self-hosted app",
		})

		expect(pb.tokens).toEqual(["pb-old", "pb-fresh", "pb-fresh", "pb-fresh"])
		const [body, options] = pb.create.mock.calls[0] ?? []
		expect(options).toEqual({ requestKey: null })
		expect(body).toMatchObject({
			name: "my-app",
			created_by: "user_1",
			status: "pending",
			description: "A self-hosted app",
			target_submission: "",
			extras: { aliases: ["My App", "myapp"], categories: ["media", "tools"], base: "svg" },
		})
		const [asset] = body.assets as File[]
		expect(asset).toBeInstanceOf(File)
		expect(asset?.name).toBe("my-app.svg")
		expect(asset?.type).toBe("image/svg+xml")
		expect(await asset?.text()).toBe(SVG)

		expect(result.structuredContent).toEqual({
			id: "rec1",
			name: "my-app",
			status: "pending",
			url: "https://dashboardicons.com/community/submissions/rec1",
			dashboard_url: "https://dashboardicons.com/dashboard",
		})
	})

	it("defaults optional fields like the site form", async () => {
		pb.create.mockResolvedValue({ id: "rec2", name: "bare", status: "pending" })
		await register(SESSION)("submit_icon", { name: "bare", svg: SVG })
		expect(pb.create.mock.calls[0]?.[0]).toMatchObject({ description: "", extras: { aliases: [], categories: [], base: "svg" } })
	})

	it("omits explicitly undefined optional SVG fields", async () => {
		pb.create.mockResolvedValue({ id: "bare", name: "bare", status: "pending" })
		const input = submitIconTool.config.inputSchema.parse({ name: "bare", svg: SVG, variants: { light: undefined } })
		const result = await register(SESSION)("submit_icon", input)
		expect(result.isError).toBeUndefined()
		expect(pb.create.mock.calls[0]?.[0].assets.map((file: File) => file.name)).toEqual(["bare.svg"])
		expect(pb.create.mock.calls[0]?.[0].extras).not.toHaveProperty("colors")
	})

	it("rejects more than 99 files before querying pending submissions or writing", async () => {
		const custom = Object.fromEntries(Array.from({ length: 99 }, (_, index) => [`variant-${index}`, SVG]))
		const input = submitIconTool.config.inputSchema.parse({ name: "my-app", svg: SVG, variants: { custom } })
		const result = await register(SESSION)("submit_icon", input)
		expect(result.isError).toBe(true)
		expect(textOf(result)).toBe("The submission was not accepted: Upload at most 99 files per Icon.")
		expect(pb.getFullList).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
		expect(pb.update).not.toHaveBeenCalled()
	})

	it("accepts the 99-file limit as one Submission", async () => {
		const custom = Object.fromEntries(Array.from({ length: 98 }, (_, index) => [`variant-${index}`, SVG]))
		pb.create.mockResolvedValue({ id: "maximum", name: "my-app", status: "pending" })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: { custom } })
		expect(result.structuredContent).toMatchObject({ id: "maximum", status: "pending" })
		expect(pb.create).toHaveBeenCalledTimes(1)
		expect(pb.create.mock.calls[0]?.[0].assets).toHaveLength(99)
		expect(pb.create.mock.calls[0]?.[0].extras.variants).toEqual(
			Object.fromEntries(Object.keys(custom).map((key) => [key, `my-app-${key}.svg`])),
		)
	})

	const rejected = {
		id: "own-rejected",
		name: "my-app",
		status: "rejected",
		created_by: "user_1",
		round: 1,
		updated: "2026-10-19 17:00:00.000Z",
		description: "Original description",
		target_submission: "original-target",
		assets: ["my_app_0123456789.svg", "my_app_light_0123456789.svg", "my_app_4k_0123456789.svg"],
		extras: {
			aliases: ["Original alias"],
			categories: ["tools"],
			colors: { light: "my-app-light.svg" },
			variants: { "4k": "my-app-4k.svg" },
		},
	}

	it("resubmits the owner's rejected record through the shared helper with all supplied files and fetched revision", async () => {
		pb.getList.mockResolvedValue({ items: [rejected] })
		pb.getOne.mockResolvedValue(rejected)
		pb.update.mockResolvedValue({ ...rejected, status: "pending", round: 2 })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: { light: SVG, custom: { "4k": SVG } } })
		expect(result.structuredContent).toMatchObject({ id: rejected.id, status: "pending" })
		expect(pb.getList).toHaveBeenCalledWith(1, 1, {
			filter: "created_by = 'user_1' && name = 'my-app' && status = 'rejected'",
			sort: "-updated,-id",
			requestKey: null,
		})
		expect(pb.getOne).toHaveBeenCalledWith(rejected.id, { requestKey: null })
		expect(pb.update).toHaveBeenCalledExactlyOnceWith(
			rejected.id,
			expect.objectContaining({
				status: "pending",
				target_submission: "original-target",
				description: "Original description",
				"assets-": rejected.assets,
				extras: expect.objectContaining({
					aliases: ["Original alias"],
					categories: ["tools"],
					colors: { light: "my-app-light.svg" },
					variants: { "4k": "my-app-4k.svg" },
				}),
			}),
			{ requestKey: null, headers: { "X-Submission-Updated": rejected.updated } },
		)
		expect(pb.update.mock.calls[0]?.[1].assets.map((file: File) => file.name)).toEqual(["my-app.svg", "my-app-light.svg", "my-app-4k.svg"])
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("requires an explicit full variant set before replacing legacy optional or unresolved files", async () => {
		for (const current of [rejected, { ...rejected, extras: {}, assets: ["unknown.svg", "ambiguous.svg"] }]) {
			pb.getList.mockResolvedValue({ items: [current] })
			const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG })
			expect(textOf(result)).toContain("omitted optional Variants are removed")
			expect(textOf(result)).toContain("No files were changed")
		}
		expect(pb.update).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("allows explicitly removing all optional variants while keeping Base required", async () => {
		pb.getList.mockResolvedValue({ items: [rejected] })
		pb.getOne.mockResolvedValue(rejected)
		pb.update.mockResolvedValue({ ...rejected, status: "pending", round: 2 })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: {} })
		expect(result.isError).toBeUndefined()
		expect(pb.update.mock.calls[0]?.[1].assets).toHaveLength(1)
		expect(pb.update.mock.calls[0]?.[1].extras).not.toHaveProperty("colors")
		expect(pb.update.mock.calls[0]?.[1].extras).not.toHaveProperty("variants")
		expect(submitIconTool.config.inputSchema.safeParse({ name: "my-app", variants: {} }).success).toBe(false)
	})

	it("does not overwrite a rejected record that changed after lookup", async () => {
		pb.getList.mockResolvedValue({ items: [rejected] })
		pb.getOne.mockResolvedValue({ ...rejected, updated: "2026-10-19 17:01:00.000Z" })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: {} })
		expect(textOf(result)).toContain("Submission changed")
		expect(pb.update).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("resubmits a Base-only legacy record without requiring optional Variants", async () => {
		const current = {
			...rejected,
			target_submission: undefined,
			description: undefined,
			extras: undefined,
			assets: ["my_app_0123456789.svg"],
		}
		pb.getList.mockResolvedValue({ items: [current] })
		pb.getOne.mockResolvedValue(current)
		pb.getFullList.mockResolvedValue([{ id: current.id, name: current.name }])
		pb.update.mockResolvedValue({ ...current, status: "pending" })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG })
		expect(result.structuredContent).toMatchObject({ id: current.id, status: "pending" })
		expect(pb.update.mock.calls[0]?.[1]).toMatchObject({
			description: "",
			target_submission: "",
			extras: { aliases: [], categories: [], base: "svg" },
		})
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("replaces rejected metadata with explicitly supplied values", async () => {
		pb.getList.mockResolvedValue({ items: [rejected] })
		pb.getOne.mockResolvedValue(rejected)
		pb.update.mockResolvedValue({ ...rejected, status: "pending" })
		const result = await register(SESSION)("submit_icon", {
			name: "my-app",
			svg: SVG,
			variants: {},
			aliases: [],
			categories: ["media"],
			description: "Replacement description",
		})
		expect(result.isError).toBeUndefined()
		expect(pb.update.mock.calls[0]?.[1]).toMatchObject({
			description: "Replacement description",
			extras: { aliases: [], categories: ["media"] },
		})
	})

	it("fails atomically when the resubmission update is rejected", async () => {
		pb.getList.mockResolvedValue({ items: [rejected] })
		pb.getOne.mockResolvedValue(rejected)
		pb.update.mockRejectedValue(new ClientResponseError({ status: 409, response: { message: "Submission changed" } }))
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: {} })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("Submission changed")
		expect(pb.update).toHaveBeenCalledTimes(1)
		expect(pb.create).not.toHaveBeenCalled()
	})

	it.each([
		"pending",
		"approved",
		"added_to_collection",
		"other-owner",
	])("does not route %s records to the own-rejected update helper", async (state) => {
		let current = { ...rejected, status: state }
		if (state === "other-owner") current = { ...rejected, created_by: "another-user" }
		pb.getList.mockResolvedValue({ items: [current] })
		pb.getAllIcons.mockResolvedValue({ "my-app": {} })
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: {} })
		expect(textOf(result)).toContain("already exists")
		expect(pb.getOne).not.toHaveBeenCalled()
		expect(pb.update).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("rejects unsafe SVGs before calling PocketBase", async () => {
		const result = await register(SESSION)("submit_icon", {
			name: "my-app",
			svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
		})
		expect(result.isError).toBe(true)
		expect(textOf(result)).toBe("The Base SVG was not accepted: <script> elements are not allowed.")
		expect(pb.authRefresh).not.toHaveBeenCalled()
	})

	it("points existing native icons to the site's update proposal flow", async () => {
		const result = await register(SESSION)("submit_icon", { name: "plex", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("https://dashboardicons.com/submit")
		expect(textOf(result)).toContain("update proposal")
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("rejects embedded raster images with actionable submission errors", async () => {
		const result = await register(SESSION)("submit_icon", {
			name: "my-app",
			svg: '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AAAA"/></svg>',
		})
		expect(result.isError).toBe(true)
		expect(textOf(result)).toBe(
			"The Base SVG was not accepted: external references and embedded images are not allowed (data:image/png;base64,AAAA); use local #ids only.",
		)
		expect(pb.getAllIcons).not.toHaveBeenCalled()
		expect(pb.authRefresh).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("saves all well-known and Custom SVGs as one labelled Submission", async () => {
		pb.create.mockResolvedValue({ id: "variants", name: "my-app", status: "pending" })
		const variants = {
			light: SVG,
			dark: SVG,
			wordmark: SVG,
			wordmark_light: SVG,
			wordmark_dark: SVG,
			custom: { "4k": SVG, "animated-dark": SVG },
		}
		const parsed = submitIconTool.config.inputSchema.parse({ name: "my-app", svg: SVG, variants })
		const result = await register(SESSION)("submit_icon", parsed)
		expect(result.isError).toBeUndefined()
		expect(pb.create).toHaveBeenCalledTimes(1)
		const body = pb.create.mock.calls[0]?.[0]
		expect(body.assets.map((file: File) => file.name)).toEqual([
			"my-app.svg",
			"my-app-light.svg",
			"my-app-dark.svg",
			"my-app-wordmark.svg",
			"my-app-wordmark-light.svg",
			"my-app-wordmark-dark.svg",
			"my-app-4k.svg",
			"my-app-animated-dark.svg",
		])
		expect(body.extras).toMatchObject({
			colors: { light: "my-app-light.svg", dark: "my-app-dark.svg" },
			wordmark: { default: "my-app-wordmark.svg", light: "my-app-wordmark-light.svg", dark: "my-app-wordmark-dark.svg" },
			variants: { "4k": "my-app-4k.svg", "animated-dark": "my-app-animated-dark.svg" },
		})
		for (const file of body.assets as File[]) expect(await file.text()).toBe(SVG)
	})

	it.each([
		["light", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>', "Light", "event handler"],
		["wordmark_dark", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "Wordmark dark", "<script>"],
		["custom", '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/a.svg"/></svg>', "animated", "external references"],
		["dark", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>', "Dark", "foreignObject"],
	])("rejects unsafe %s SVGs atomically with labelled errors", async (key, markup, label, reason) => {
		let variants: Record<string, unknown> = { [key]: markup }
		if (key === "custom") variants = { custom: { animated: markup } }
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain(`${label} SVG was not accepted`)
		expect(textOf(result)).toContain(reason)
		expect(pb.authRefresh).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("checks the 48 KiB UTF-8 cap for every SVG, not just character count", async () => {
		const prefix = '<svg xmlns="http://www.w3.org/2000/svg"><text>'
		const suffix = "</text></svg>"
		const exact = prefix + "x".repeat(MAX_SUBMITTED_SVG_BYTES - prefix.length - suffix.length) + suffix
		pb.create.mockResolvedValue({ id: "large", name: "my-app", status: "pending" })
		expect(
			(await register(SESSION)("submit_icon", { name: "my-app", svg: exact, variants: { custom: { "4k": exact } } })).isError,
		).toBeUndefined()
		pb.create.mockClear()
		for (const markup of [exact.replace("</text>", "x</text>"), prefix + "é".repeat(MAX_SUBMITTED_SVG_BYTES / 2) + suffix]) {
			const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: { custom: { "4k": markup } } })
			expect(textOf(result)).toContain("4k SVG was not accepted: the SVG is larger than 48 KB")
		}
		expect(pb.create).not.toHaveBeenCalled()
	})

	it.each([
		"dark",
		"wordmark-light",
		"base",
		"UPPER",
		"a--b",
		"x".repeat(33),
	])("rejects invalid Custom name %s before writes", async (key) => {
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: { custom: { [key]: SVG } } })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain(`Custom variant "${key}"`)
		expect(pb.create).not.toHaveBeenCalled()
	})

	it.each([
		"plex-dark",
		"plex-white",
		"plex-wordmark-light",
		"plex-4k",
		"plex-animated-dark",
	])("blocks split Variant slug %s with a confirmed published parent", async (name) => {
		const result = await register(SESSION)("submit_icon", { name, svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain('Variant of "plex"')
		expect(textOf(result)).toContain("never split")
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("blocks splits of pending Icons and learns their Custom suffixes", async () => {
		pb.getFullList.mockResolvedValue([{ id: "parent", name: "self-host", extras: { variants: { outline: "outline.svg" } } }])
		for (const name of ["self-host-dark", "self-host-outline"]) {
			const result = await register(SESSION)("submit_icon", { name, svg: SVG })
			expect(textOf(result)).toContain('Variant of "self-host"')
		}
		expect(pb.getFullList).toHaveBeenCalledWith({
			filter: "status = 'pending' || status = 'approved'",
			fields: "id,name,extras",
			requestKey: null,
		})
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("points duplicate community slugs to update proposals without treating them as split Variants", async () => {
		pb.getFullList.mockResolvedValue([
			{ id: "existing", name: "plex-dark" },
			{ id: "other", name: "unrelated" },
		])
		const result = await register(SESSION)("submit_icon", { name: "plex-dark", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("https://dashboardicons.com/community/submissions/existing")
		expect(textOf(result)).toContain("update proposal")
		expect(textOf(result)).not.toContain("looks like")
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("allows a compound brand when a pending parent has no Custom metadata", async () => {
		pb.getAllIcons.mockResolvedValue({})
		pb.getFullList.mockResolvedValue([{ id: "parent", name: "proton" }])
		pb.create.mockResolvedValue({ id: "new", name: "proton-mail", status: "pending" })
		const result = await register(SESSION)("submit_icon", { name: "proton-mail", svg: SVG })
		expect(result.structuredContent).toMatchObject({ name: "proton-mail", status: "pending" })
		expect(pb.create).toHaveBeenCalledTimes(1)
	})

	it("rejects published and pending file-stem collisions before any write", async () => {
		for (const pending of [false, true]) {
			pb.getAllIcons.mockResolvedValue({ plex: {}, "my-app-4k": {} })
			if (pending) {
				pb.getAllIcons.mockResolvedValue({ plex: {} })
				pb.getFullList.mockResolvedValue([{ id: "other", name: "my-app-4k", extras: {} }])
			}
			const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG, variants: { custom: { "4k": SVG } } })
			expect(textOf(result)).toContain("Variant custom:4k would overwrite the existing Icon my-app-4k")
		}
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("does not mistake arbitrary hyphenated brands or unconfirmed parents for Variants", async () => {
		pb.getAllIcons.mockResolvedValue({ proton: {}, plex: {} })
		for (const name of ["proton-mail", "new-app-dark"]) {
			pb.create.mockResolvedValue({ id: "new", name, status: "pending" })
			expect((await register(SESSION)("submit_icon", { name, svg: SVG })).isError).toBeUndefined()
		}
		expect(pb.create).toHaveBeenCalledTimes(2)
	})

	it.each(["published", "pending"])("does not apply an unrelated %s Icon's Custom suffix to a compound brand", async (source) => {
		pb.getAllIcons.mockResolvedValue({ proton: {} })
		if (source === "published") pb.getAllIcons.mockResolvedValue({ proton: {}, unrelated: { variants: { mail: "unrelated-mail" } } })
		if (source === "pending")
			pb.getFullList.mockResolvedValue([{ name: "unrelated", extras: { variants: { mail: "unrelated-mail.svg" } } }])
		pb.create.mockResolvedValue({ id: "new", name: "proton-mail", status: "pending" })
		const result = await register(SESSION)("submit_icon", { name: "proton-mail", svg: SVG })
		expect(result.isError).toBeUndefined()
		expect(pb.create).toHaveBeenCalledTimes(1)
	})

	it.each(["published", "pending"])("blocks a Custom suffix declared by its own %s parent Icon", async (source) => {
		pb.getAllIcons.mockResolvedValue({})
		if (source === "published") pb.getAllIcons.mockResolvedValue({ proton: { variants: { mail: "proton-mail" } } })
		if (source === "pending") pb.getFullList.mockResolvedValue([{ name: "proton", extras: { variants: { mail: "proton-mail.svg" } } }])
		const result = await register(SESSION)("submit_icon", { name: "proton-mail", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain('Variant of "proton"')
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("keeps already-published independent slugs on the existing-Icon path", async () => {
		pb.getAllIcons.mockResolvedValue({ sonarr: {}, "sonarr-4k": {}, proton: {}, "proton-mail": {} })
		for (const name of ["sonarr-4k", "proton-mail"]) {
			const result = await register(SESSION)("submit_icon", { name, svg: SVG })
			expect(textOf(result)).toContain("already exists")
			expect(textOf(result)).not.toContain("looks like")
		}
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("fails closed when pending Icon identities cannot be checked", async () => {
		pb.getFullList.mockRejectedValue(new ClientResponseError({ status: 502 }))
		expect((await register(SESSION)("submit_icon", { name: "new-dark", svg: SVG })).isError).toBe(true)
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("refuses to submit when the native catalog cannot be checked for duplicates", async () => {
		pb.getAllIcons.mockRejectedValue(new Error("offline"))
		const result = await register(SESSION)("submit_icon", { name: "plex", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("native icon catalog is unavailable")
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("asks to reconnect when the PocketBase session is gone", async () => {
		pb.authRefresh.mockRejectedValue(new ClientResponseError({ status: 401 }))
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG })
		expect(result).toEqual({ content: [{ type: "text", text: SIGN_IN_EXPIRED }], isError: true })
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("reports PocketBase outages during sign-in refresh", async () => {
		pb.authRefresh.mockRejectedValue(new ClientResponseError({ status: 0 }))
		const result = await register(SESSION)("submit_icon", { name: "my-app", svg: SVG })
		expect(textOf(result)).toContain("could not be reached")
	})

	it("maps PocketBase create failures to tool errors", async () => {
		const call = register(SESSION)
		const cases: [unknown, string][] = [
			[new ClientResponseError({ status: 403, response: { message: "Sign in to submit icons" } }), SIGN_IN_EXPIRED],
			[new ClientResponseError({ status: 401 }), SIGN_IN_EXPIRED],
			[
				new ClientResponseError({ status: 400, response: { message: "Failed to create record." } }),
				"dashboardicons.com rejected the request: Failed to create record.",
			],
			[new ClientResponseError({ status: 502 }), "dashboardicons.com could not be reached. Try again in a minute."],
			[new Error("socket hang up"), "dashboardicons.com could not be reached. Try again in a minute."],
		]
		for (const [error, message] of cases) {
			pb.create.mockRejectedValueOnce(error)
			const result = await call("submit_icon", { name: "my-app", svg: SVG })
			expect(result).toEqual({ content: [{ type: "text", text: message }], isError: true })
		}
	})
})

describe("propose_icon_update", () => {
	it("describes an authenticated, non-idempotent review proposal with explicit preservation semantics", () => {
		expect(proposeIconUpdateTool.config.annotations).toEqual(submitIconTool.config.annotations)
		for (const text of ["sign in", "48 KiB", "512 KiB", "Omitted files are preserved", "FINAL desired lists", "resubmits it in place"])
			expect(proposeIconUpdateTool.config.description).toContain(text)
	})

	it("accepts partial file updates, metadata-only updates and explicit removals without requiring Base", () => {
		const { inputSchema } = proposeIconUpdateTool.config
		for (const changes of [
			{ svg: SVG },
			{ variants: { light: SVG, dark: SVG, wordmark: SVG, wordmark_light: SVG, wordmark_dark: SVG, custom: { "4k": SVG } } },
			{ aliases: [], categories: ["tools"] },
			{ remove: ["light", "dark", "wordmark", "wordmark_light", "wordmark_dark", "custom:4k"].map((key) => ({ key })) },
		])
			expect(inputSchema.safeParse({ name: "my-app", ...changes }).success).toBe(true)
		expect(inputSchema.parse({ name: " my-app ", submission_id: "abc123abc123abc", aliases: [] })).toEqual({
			name: "my-app",
			submission_id: "abc123abc123abc",
			aliases: [],
		})
		const omitted = inputSchema.parse({ name: "my-app", variants: { light: SVG } })
		expect(omitted.aliases).toBeUndefined()
		expect(omitted.categories).toBeUndefined()
		expect(
			inputSchema.parse({ name: "my-app", remove: [{ key: "custom:4k", note: " Obsolete artwork " }, { key: "light" }] }).remove,
		).toEqual([{ key: "custom:4k", note: "Obsolete artwork" }, { key: "light" }])
	})

	it("rejects malformed targets and removal keys at the public schema boundary", () => {
		for (const input of [
			{ name: "My App" },
			{ name: "my-app", submission_id: "../bad" },
			{ name: "my-app", variants: { white: SVG } },
			{ name: "my-app", remove: ["light"] },
			{ name: "my-app", remove: [{ note: "Missing key" }] },
			{ name: "my-app", remove: [{ key: "light", note: 123 }] },
			{ name: "my-app", remove: [{ key: "light", file: "other.svg" }] },
			{ name: "my-app", remove: [{ key: "light", destination: "other.svg" }] },
			{ name: "my-app", remove: [{ key: "light", action: "remove" }] },
			...["base", "white", "custom:base", "custom:UPPER", "custom:a--b", "custom:", `custom:${"x".repeat(33)}`].map((key) => ({
				name: "my-app",
				remove: [{ key }],
			})),
		])
			expect(proposeIconUpdateTool.config.inputSchema.safeParse(input).success).toBe(false)
	})

	it("checks every supplied SVG before authenticating or writing", async () => {
		for (const changes of [
			{ svg: '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>' },
			{ variants: { light: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>' } },
			{ variants: { wordmark_dark: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>' } },
			{ variants: { custom: { "4k": '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AAAA"/></svg>' } } },
		]) {
			const result = await register(SESSION)("propose_icon_update", { name: "my-app", ...changes })
			expect(result.isError).toBe(true)
			expect(textOf(result)).toContain("SVG was not accepted")
		}
		expect(pb.authRefresh).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("enforces the 48 KiB UTF-8 boundary on replacements and Custom additions", async () => {
		const prefix = '<svg xmlns="http://www.w3.org/2000/svg"><text>'
		const suffix = "</text></svg>"
		const exact = prefix + "x".repeat(MAX_SUBMITTED_SVG_BYTES - prefix.length - suffix.length) + suffix
		const accepted = await register(SESSION)("propose_icon_update", { name: "my-app", svg: exact, variants: { custom: { "4k": exact } } })
		expect(accepted.isError).toBeUndefined()
		for (const markup of [exact.replace("</text>", "x</text>"), prefix + "é".repeat(MAX_SUBMITTED_SVG_BYTES / 2) + suffix]) {
			const result = await register(SESSION)("propose_icon_update", { name: "my-app", variants: { custom: { "4k": markup } } })
			expect(textOf(result)).toContain("4k SVG was not accepted: the SVG is larger than 48 KB")
		}
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("rejects invalid Custom names, contradictory changes and empty proposals before sign-in refresh", async () => {
		for (const changes of [
			{ variants: { custom: { dark: SVG } } },
			{ variants: { light: SVG }, remove: [{ key: "light", note: "Conflicting replacement" }] },
			{ variants: { custom: { "4k": SVG } }, remove: [{ key: "custom:4k" }] },
			{ variants: {} },
		])
			expect((await register(SESSION)("propose_icon_update", { name: "my-app", ...changes })).isError).toBe(true)
		expect(pb.authRefresh).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("rejects duplicate removal keys even when their reviewer notes differ", async () => {
		for (const key of ["light", "custom:4k"]) {
			const result = await register(SESSION)("propose_icon_update", {
				name: "my-app",
				remove: [
					{ key, note: "First reason" },
					{ key, note: "Different reason" },
				],
			})
			expect(result.isError).toBe(true)
			expect(textOf(result)).toContain(`Variant "${key}" is listed for removal more than once`)
		}
		expect(pb.authRefresh).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
		expect(pb.update).not.toHaveBeenCalled()
	})

	it("files a revision-pinned update through the shared service as the signed-in user", async () => {
		const result = await register(SESSION)("propose_icon_update", {
			name: "my-app",
			svg: SVG,
			variants: { wordmark: SVG, custom: { "5k": SVG } },
			remove: [{ key: "custom:4k", note: "Obsolete artwork" }],
			categories: [],
			description: "Refresh",
		})
		expect(result.isError).toBeUndefined()
		expect(result.structuredContent).toMatchObject({ id: "upd1", status: "pending", url: expect.stringContaining("upd1") })
		const [, userId, input] = update.createIconUpdate.mock.calls[0] ?? []
		expect(userId).toBe("user_1")
		expect(input).toMatchObject({
			name: "my-app",
			kind: "update",
			revision: "rev-1",
			targetSubmission: "",
			description: "Refresh",
			aliases: ["My App"],
			categories: [],
			removeVariants: [{ key: "custom:4k", note: "Obsolete artwork" }],
		})
		expect(Object.keys(input.assets)).toEqual(["base", "wordmark", "custom:5k"])
		expect(input.assets["custom:5k"].name).toBe("my-app-5k.svg")
		expect(pb.tokens).toEqual(["pb-old", "pb-fresh"])
		expect(pb.create).not.toHaveBeenCalled()
		expect(update.updateOwnIconUpdate).not.toHaveBeenCalled()
	})

	it("ignores Variants left undefined and reports target service outages", async () => {
		await register(SESSION)("propose_icon_update", { name: "my-app", variants: { light: undefined, wordmark: SVG } })
		expect(Object.keys(update.createIconUpdate.mock.calls[0]?.[2].assets)).toEqual(["wordmark"])
		update.loadUpdateTarget.mockRejectedValueOnce(new ClientResponseError({ status: 502 }))
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: [] }))).toContain("could not be reached")
	})

	it("targets a community Submission and preserves omitted alias and category lists", async () => {
		await register(SESSION)("propose_icon_update", { name: "my-app", submission_id: "abc123abc123abc", variants: { light: SVG } })
		expect(update.loadUpdateTarget.mock.calls[0]?.slice(1)).toEqual(["my-app", "abc123abc123abc"])
		expect(update.createIconUpdate.mock.calls[0]?.[2]).toMatchObject({
			targetSubmission: "abc123abc123abc",
			aliases: ["My App"],
			categories: ["media"],
		})
	})

	it("resubmits the caller's own rejected proposal in place instead of creating another", async () => {
		pb.getList.mockResolvedValue({
			items: [
				{ id: "other", created_by: "user_1", status: "rejected", updated: "u0", icon_update: { target: { id: "different" } } },
				{ id: "rej1", created_by: "user_1", status: "rejected", updated: "u1", icon_update: { target: { id: "" } } },
			],
			totalItems: 2,
		})
		const result = await register(SESSION)("propose_icon_update", { name: "my-app", variants: { light: SVG } })
		expect(result.structuredContent).toMatchObject({ id: "rej1", url: expect.stringContaining("rej1") })
		expect(update.createIconUpdate).not.toHaveBeenCalled()
		expect(update.updateOwnIconUpdate.mock.calls[0]?.slice(1, 3)).toEqual(["user_1", "rej1"])
		expect(update.updateOwnIconUpdate.mock.calls[0]?.[3]).toMatchObject({
			updated: "u1",
			revision: "rev-1",
			refreshTarget: true,
			retainVariants: [],
		})
		expect(pb.getList.mock.calls[0]?.[2]).toMatchObject({ filter: expect.stringContaining("status = 'rejected'") })
	})

	it("explains unknown icons, missing Variants and shared-service refusals without storing anything", async () => {
		update.loadUpdateTarget.mockRejectedValueOnce(
			new ClientResponseError({ status: 400, response: { message: "Published Icon not found" } }),
		)
		const unknown = textOf(await register(SESSION)("propose_icon_update", { name: "nope", aliases: [] }))
		expect(unknown).toContain('Cannot propose an update for "nope": Published Icon not found')
		expect(unknown).toContain("search_icons")
		update.loadUpdateTarget.mockRejectedValueOnce(new ClientResponseError({ status: 404 }))
		expect((await register(SESSION)("propose_icon_update", { name: "nope", aliases: [] })).isError).toBe(true)

		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", remove: [{ key: "dark" }] }))).toContain(
			'"my-app" has no dark Variant to remove',
		)

		update.createIconUpdate.mockResolvedValueOnce({ ok: false, error: "No change was proposed." })
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: ["My App"] }))).toBe(
			"The update proposal was not accepted: No change was proposed. Nothing was stored.",
		)
		expect(update.updateOwnIconUpdate).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})

	it("reports stale revisions and rejected edits with actionable messages", async () => {
		update.updateOwnIconUpdate.mockRejectedValueOnce(
			new ClientResponseError({ status: 409, response: { message: "Target Icon changed." } }),
		)
		pb.getList.mockResolvedValue({
			items: [{ id: "rej1", created_by: "user_1", status: "rejected", updated: "u1", icon_update: { target: { id: "" } } }],
			totalItems: 1,
		})
		const stale = textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: [] }))
		expect(stale).toBe("Target Icon changed. Call propose_icon_update again to review the latest version. Nothing was stored.")

		update.createIconUpdate.mockRejectedValueOnce(new ClientResponseError({ status: 400, response: { message: "Bad delta" } }))
		pb.getList.mockResolvedValue({ items: [], totalItems: 0 })
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: [] }))).toBe(
			"The update proposal was not accepted: Bad delta",
		)

		update.createIconUpdate.mockRejectedValueOnce(new ClientResponseError({ status: 502 }))
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: [] }))).toContain("could not be reached")
	})

	it("returns account refresh failures before loading the target", async () => {
		pb.authRefresh.mockRejectedValueOnce(new ClientResponseError({ status: 401 }))
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", aliases: [] }))).toBe(SIGN_IN_EXPIRED)
		pb.authRefresh.mockRejectedValueOnce(new ClientResponseError({ status: 502 }))
		expect(textOf(await register(SESSION)("propose_icon_update", { name: "my-app", categories: [] }))).toContain("could not be reached")
		expect(update.loadUpdateTarget).not.toHaveBeenCalled()
		expect(pb.create).not.toHaveBeenCalled()
	})
})

describe("list_my_submissions", () => {
	const item = {
		id: "rec1",
		name: "my-app",
		status: "rejected",
		admin_comment: "Please send a square icon",
		created: "2026-10-15 10:00:00.000Z",
		updated: "2026-10-15 11:00:00.000Z",
	}

	it("lists the user's own submissions newest first", async () => {
		pb.getList.mockResolvedValue({ items: [item], totalItems: 3 })
		const result = await register(SESSION)("list_my_submissions", { limit: 5 })

		expect(pb.tokens).toEqual(["pb-old", "pb-fresh"])
		expect(pb.getList).toHaveBeenCalledWith(1, 5, {
			filter: "created_by = 'user_1'",
			sort: "-created,-id",
			fields: "id,name,status,admin_comment,created,updated",
			requestKey: null,
		})
		expect(result.structuredContent).toEqual({
			submissions: [
				{
					...item,
					url: "https://dashboardicons.com/community/submissions/rec1",
					resubmit_url: "https://dashboardicons.com/submit?submission=rec1",
					next_step: "Rejections are never final. Fix the feedback and resubmit this same Submission; its id and history are kept.",
				},
			],
			total: 3,
			dashboard_url: "https://dashboardicons.com/dashboard",
		})
	})

	it("filters by status and tolerates PocketBase schemas without admin_comment", async () => {
		const { admin_comment: _omitted, ...withoutComment } = item
		pb.getList.mockResolvedValue({ items: [{ ...withoutComment, status: "pending" }], totalItems: 1 })
		const result = await register(SESSION)("list_my_submissions", { status: "pending", limit: 20 })
		expect(pb.getList.mock.calls[0]?.[2]).toMatchObject({ filter: "created_by = 'user_1' && status = 'pending'" })
		expect(result.structuredContent).toMatchObject({
			submissions: [expect.objectContaining({ status: "pending", admin_comment: "" })],
		})
	})

	it("asks to reconnect instead of listing nothing for a revoked session", async () => {
		pb.authRefresh.mockRejectedValue(new ClientResponseError({ status: 401 }))
		expect(textOf(await register(SESSION)("list_my_submissions", { limit: 20 }))).toBe(SIGN_IN_EXPIRED)
		expect(pb.getList).not.toHaveBeenCalled()
	})

	it("maps list failures to tool errors", async () => {
		pb.getList.mockRejectedValue(new ClientResponseError({ status: 403 }))
		expect(await register(SESSION)("list_my_submissions", { limit: 20 })).toEqual({
			content: [{ type: "text", text: SIGN_IN_EXPIRED }],
			isError: true,
		})
	})
})
