import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import PocketBase, { ClientResponseError } from "pocketbase"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { McpSession } from "@/mcp/caller"
import { DASHBOARD_ICONS_TOOLS, registerDashboardIconsTools } from "@/mcp/tools"
import { SIGN_IN_EXPIRED } from "@/mcp/tools/account"
import { listMySubmissionsTool } from "@/mcp/tools/list-my-submissions"
import { submitIconTool } from "@/mcp/tools/submit-icon"

const pb = vi.hoisted(() => ({
	authRefresh: vi.fn(),
	create: vi.fn(),
	getList: vi.fn(),
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
			return { create: as(pb.create), getList: as(pb.getList) }
		}) as never
		return client
	},
}))

vi.mock("@/lib/icons/service", () => ({ getAllIcons: pb.getAllIcons }))

const SESSION: McpSession = { caller: { userId: "user_1", username: "iconfan", admin: false }, pbToken: "pb-old" }
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>'

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
	pb.authRefresh.mockResolvedValue({ token: "pb-fresh", record: { id: "user_1", username: "iconfan", admin: false } })
})

describe("account tool registry", () => {
	it("flags account tools and describes submit_icon as a non-idempotent write", () => {
		expect(DASHBOARD_ICONS_TOOLS.filter((tool) => tool.access === "account").map((tool) => tool.name)).toEqual([
			"submit_icon",
			"list_my_submissions",
		])
		expect(submitIconTool.config.annotations).toEqual({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		})
	})

	it("refuses anonymous callers without touching PocketBase", async () => {
		const result = await register(null)("submit_icon", { name: "my-app", svg: SVG })
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

		expect(pb.tokens).toEqual(["pb-old", "pb-fresh"])
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

	it("rejects unsafe SVGs before calling PocketBase", async () => {
		const result = await register(SESSION)("submit_icon", {
			name: "my-app",
			svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
		})
		expect(result.isError).toBe(true)
		expect(textOf(result)).toBe("The SVG was not accepted: <script> elements are not allowed.")
		expect(pb.authRefresh).not.toHaveBeenCalled()
	})

	it("points existing native icons to the site's update proposal flow", async () => {
		const result = await register(SESSION)("submit_icon", { name: "plex", svg: SVG })
		expect(result.isError).toBe(true)
		expect(textOf(result)).toContain("https://dashboardicons.com/submit")
		expect(textOf(result)).toContain("update proposal")
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
			submissions: [{ ...item, url: "https://dashboardicons.com/community/submissions/rec1" }],
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
