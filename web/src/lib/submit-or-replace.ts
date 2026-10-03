import { ClientResponseError } from "pocketbase"
import { pb } from "@/lib/pb"

interface SubmissionPayload {
	name: string
	assets: File[]
	created_by: string
	status: "pending"
	description?: string
	extras: Record<string, any>
}

function sanitizeFilterValue(value: string): string {
	return value.replace(/'/g, "\\'")
}

// A submission name is unique across the collection. Updating the record the
// caller already owns (pending, rejected, approved or published) lets authors
// refresh an icon they submitted, e.g. after a rebrand, instead of hitting the
// unique constraint with a duplicate create.
export async function submitOrReplace(data: SubmissionPayload) {
	const safeName = sanitizeFilterValue(data.name)
	const existing = await pb
		.collection("community_gallery")
		.getFirstListItem(`name = '${safeName}'`, { requestKey: null })
		.catch(() => null)

	if (!existing) return pb.collection("submissions").create(data)

	try {
		return await pb.collection("submissions").update(existing.id, data, { requestKey: null })
	} catch (error) {
		if (error instanceof ClientResponseError && (error.status === 403 || error.status === 404)) {
			throw new Error(`The icon ID "${data.name}" already belongs to another contributor. Choose a different ID or ask them to update it.`)
		}
		throw error
	}
}
