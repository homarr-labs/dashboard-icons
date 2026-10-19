import { pb } from "@/lib/pb"
import type { SubmissionInput } from "@/lib/submission-service"

export async function submitProposal(input: SubmissionInput): Promise<{ id: string }> {
	const body = new FormData()
	body.set("name", input.name)
	body.set("description", input.description)
	body.set("target_submission", input.targetSubmission)
	for (const alias of input.aliases) body.append("aliases", alias)
	for (const category of input.categories) body.append("categories", category)
	for (const [variant, file] of Object.entries(input.assets)) {
		if (file) body.set(variant, file)
	}

	const response = await fetch("/api/submissions", {
		method: "POST",
		headers: { Authorization: pb.authStore.token },
		body,
	})
	const result = (await response.json().catch(() => null)) as { id?: string; error?: string } | null
	if (!response.ok || !result?.id) throw new Error(result?.error || `Submission failed (HTTP ${response.status})`)
	return { id: result.id }
}
