import { z } from "zod"
import { DASHBOARD_URL, pocketBaseAsUser, pocketBaseFailure, submissionUrl } from "@/mcp/tools/account"
import { type AccountTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const STATUSES = ["pending", "approved", "rejected", "added_to_collection"] as const

const inputSchema = z.object({
	status: z
		.enum(STATUSES)
		.optional()
		.describe(
			"Only this state: pending (waiting for review), approved (accepted, not published yet), added_to_collection (published), rejected",
		),
	limit: z.number().int().min(1).max(50).default(20),
})

const submissionSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.enum(STATUSES),
	admin_comment: z.string().describe("Reviewer feedback, mostly on rejections; empty when there is none"),
	created: z.string(),
	updated: z.string(),
	url: z.string().describe("Public page of the submission"),
})

const outputSchema = z.looseObject({
	submissions: z.array(submissionSchema).describe("Newest first"),
	total: z.number().int().describe("Number of matching submissions before the limit"),
	dashboard_url: z.string().describe("Where the user sees every submission while signed in"),
})

export const listMySubmissionsTool: AccountTool<typeof inputSchema, typeof outputSchema> = {
	name: "list_my_submissions",
	access: "account",
	config: {
		title: "List my icon submissions",
		description:
			"List the icons the signed-in user submitted to dashboardicons.com, newest first, with their review status and reviewer comments. Use it to check on icons sent with submit_icon or on the website. Needs the user to sign in to this MCP server.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "account" },
	},
	async handler({ status, limit }, { pbToken }) {
		const session = await pocketBaseAsUser(pbToken)
		if (!session.ok) return session.result
		const { pb, user } = session
		let filter = pb.filter("created_by = {:user}", { user: user.id })
		if (status) filter = pb.filter("created_by = {:user} && status = {:status}", { user: user.id, status })
		try {
			const page = await pb.collection("submissions").getList(1, limit, {
				filter,
				sort: "-created,-id",
				fields: "id,name,status,admin_comment,created,updated",
				requestKey: null,
			})
			const result: z.output<typeof outputSchema> = {
				submissions: page.items.map((item) => ({
					id: item.id,
					name: item.name,
					status: item.status,
					admin_comment: item.admin_comment ?? "",
					created: item.created,
					updated: item.updated,
					url: submissionUrl(item.id),
				})),
				total: page.totalItems,
				dashboard_url: DASHBOARD_URL,
			}
			return structuredResult(result)
		} catch (error) {
			return pocketBaseFailure(error)
		}
	},
}
