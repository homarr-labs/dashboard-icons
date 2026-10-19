import { z } from "zod"
import { WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/icons/service"
import { checkSubmittedSvg, MAX_SUBMITTED_SVG_BYTES } from "@/lib/icons/svg-safety"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"
import { createSubmission } from "@/lib/submission-service"
import { DASHBOARD_URL, pocketBaseAsUser, pocketBaseFailure, submissionUrl, toolError } from "@/mcp/tools/account"
import { type AccountTool, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1)
		.max(MAX_NAME_LENGTH)
		.regex(ICON_NAME_REGEX, "Use a lowercase kebab-case slug such as 'my-app'")
		.describe("New icon slug: lowercase letters, digits and single hyphens, e.g. 'my-app'. Becomes the file name."),
	svg: z
		.string()
		.min(1)
		.max(MAX_SUBMITTED_SVG_BYTES)
		.describe(
			`Complete SVG markup from <svg xmlns="http://www.w3.org/2000/svg" ...> to </svg>, at most ${MAX_SUBMITTED_SVG_BYTES / 1024} KB. No scripts, event handlers, foreignObject, external references or embedded raster images.`,
		),
	aliases: z
		.array(z.string().trim().min(1).max(MAX_NAME_LENGTH))
		.max(20)
		.optional()
		.describe("Other names people search for, e.g. 'Plex Media Server'"),
	categories: z.array(z.enum(SUBMISSION_CATEGORIES)).max(SUBMISSION_CATEGORIES.length).optional(),
	description: z.string().trim().max(2000).optional().describe("What the icon represents, for the reviewers"),
})

const outputSchema = z.looseObject({
	id: z.string().describe("Submission id"),
	name: z.string(),
	status: z.string().describe("pending until a maintainer reviews it"),
	url: z.string().describe("Public page of the submission; give it to the user"),
	dashboard_url: z.string().describe("Where the user follows all their submissions while signed in"),
})

async function existsNatively(name: string): Promise<boolean | null> {
	try {
		return Object.hasOwn(await getAllIcons(), name)
	} catch {
		return null
	}
}

function alreadyExists(name: string) {
	return toolError(
		`"${name}" already exists on dashboardicons.com (${WEB_URL}/icons/${name}); submit_icon only adds new icons. To change an existing icon, the user opens ${WEB_URL}/submit, picks "${name}" from the icon name list and uploads the new file, which files an update proposal for review.`,
	)
}

export const submitIconTool: AccountTool<typeof inputSchema, typeof outputSchema> = {
	name: "submit_icon",
	access: "account",
	config: {
		title: "Submit a new icon",
		description:
			"Submit a new icon to dashboardicons.com as the signed-in user. It goes to the maintainers' review queue as a pending community submission and is published once approved. Only submit icons the user asked for and has the right to share, and check with search_icons first that it does not exist yet. Needs the user to sign in to this MCP server. Returns the submission page URL to share with the user; track it later with list_my_submissions.",
		inputSchema,
		outputSchema,
		annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		_meta: { category: "account" },
	},
	async handler({ name, svg, aliases = [], categories = [], description = "" }, { pbToken }) {
		const checked = checkSubmittedSvg(svg)
		if (!checked.ok) return toolError(`The SVG was not accepted: ${checked.reason}.`)
		const existing = await existsNatively(name)
		if (existing === null) return toolError("The native icon catalog is unavailable. Try again before submitting a new icon.")
		if (existing) return alreadyExists(name)

		const session = await pocketBaseAsUser(pbToken)
		if (!session.ok) return session.result
		try {
			const outcome = await createSubmission(session.pb, session.user.id, {
				name,
				description,
				aliases,
				categories,
				targetSubmission: "",
				assets: { base: new File([checked.svg], `${name}.svg`, { type: "image/svg+xml" }) },
			})
			if (!outcome.ok) return toolError(`The submission was not accepted: ${outcome.error}.`)
			const { record } = outcome
			const result: z.output<typeof outputSchema> = {
				id: record.id,
				name: record.name,
				status: record.status,
				url: submissionUrl(record.id),
				dashboard_url: DASHBOARD_URL,
			}
			return structuredResult(result)
		} catch (error) {
			return pocketBaseFailure(error)
		}
	},
}
