import { pb } from "@/lib/pb"
import type { SubmissionInput } from "@/lib/submission-service"

export interface SentSubmission {
	id: string
	name: string
}

export class SubmissionSendError extends Error {
	constructor(
		message: string,
		readonly cardErrors: Record<string, string> = {},
	) {
		super(message)
		this.name = "SubmissionSendError"
	}
}

export async function submitMany(inputs: SubmissionInput[]): Promise<SentSubmission[]> {
	const body = new FormData()
	body.set(
		"icons",
		JSON.stringify(
			inputs.map((input) => ({
				name: input.name,
				description: input.description,
				aliases: input.aliases,
				categories: input.categories,
				variants: Object.keys(input.assets),
			})),
		),
	)
	for (const [index, input] of inputs.entries()) {
		for (const [variant, file] of Object.entries(input.assets)) {
			if (file) body.set(`icons.${index}.${variant}`, file)
		}
	}
	const response = await fetch("/api/submissions/many", { method: "POST", headers: { Authorization: pb.authStore.token }, body })
	const result: unknown = await response.json().catch(() => null)
	if (typeof result !== "object" || result === null)
		throw new SubmissionSendError(`Could not read the server response (HTTP ${response.status}). Check your Submissions before retrying.`)
	if (!response.ok) {
		let message = `Could not send the Submissions (HTTP ${response.status})`
		if ("error" in result && typeof result.error === "string") message = result.error
		const errors: Record<string, string> = {}
		if ("errors" in result && typeof result.errors === "object" && result.errors !== null) {
			for (const [key, value] of Object.entries(result.errors)) if (typeof value === "string") errors[key] = value
		}
		throw new SubmissionSendError(message, errors)
	}
	if (!("submissions" in result) || !Array.isArray(result.submissions))
		throw new SubmissionSendError("The server response is incomplete. Check your Submissions before retrying.")
	return result.submissions.map((record: unknown) => {
		if (
			typeof record !== "object" ||
			record === null ||
			!("id" in record) ||
			typeof record.id !== "string" ||
			!("name" in record) ||
			typeof record.name !== "string"
		)
			throw new SubmissionSendError("The server response is incomplete. Check your Submissions before retrying.")
		return { id: record.id, name: record.name }
	})
}
