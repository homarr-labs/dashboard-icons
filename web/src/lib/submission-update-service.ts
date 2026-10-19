import { ClientResponseError } from "pocketbase"
import type { createServerPB, Submission } from "@/lib/pb"
import { prepareSubmission, type SubmissionInput } from "@/lib/submission-service"

export type OwnSubmissionInput = SubmissionInput & { updated?: string }

export async function updateOwnSubmission(
	pb: ReturnType<typeof createServerPB>,
	userId: string,
	submissionId: string,
	input: OwnSubmissionInput,
): Promise<Submission> {
	const current = await pb
		.collection("submissions")
		.getOne(submissionId, { requestKey: null })
		.catch((error: unknown) => {
			if (error instanceof ClientResponseError && error.status === 404)
				throw new ClientResponseError({ status: 403, response: { message: "Only your own submissions can be edited" } })
			throw error
		})
	if (current.created_by !== userId)
		throw new ClientResponseError({ status: 403, response: { message: "Only your own submissions can be edited" } })
	if (!["pending", "rejected"].includes(current.status))
		throw new ClientResponseError({
			status: 403,
			response: { message: "Approved and published submissions are locked. Propose an update instead." },
		})
	if (input.updated && input.updated !== current.updated)
		throw new ClientResponseError({
			status: 409,
			response: { message: "Submission changed. Reload before saving; your edits have not been applied." },
		})
	if (input.targetSubmission !== (current.target_submission || ""))
		throw new ClientResponseError({ status: 400, response: { message: "A proposal's target cannot be changed" } })
	const prepared = prepareSubmission(userId, input)
	if (!prepared.ok) throw new ClientResponseError({ status: 400, response: { message: prepared.error } })
	return pb.collection("submissions").update(
		submissionId,
		{
			...prepared.data,
			"assets-": current.assets,
		},
		{ requestKey: null, headers: { "X-Submission-Updated": input.updated || current.updated } },
	)
}
