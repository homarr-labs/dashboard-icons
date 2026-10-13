import { pb } from "@/lib/pb"

interface SubmissionPayload {
	name: string
	assets: File[]
	created_by: string
	status: "pending"
	description?: string
	target_submission?: string
	extras: Record<string, any>
}

// Every proposal has its own record ID. The name is the destination icon filename,
// while target_submission identifies the exact community submission being updated.
export async function submitProposal(data: SubmissionPayload) {
	return pb.collection("submissions").create({ ...data, target_submission: data.target_submission || "" }, { requestKey: null })
}
