import type { IconUpdateInput, OwnIconUpdateInput } from "@/lib/icon-update-service"
import { pb } from "@/lib/pb"
import type { SubmissionInput } from "@/lib/submission-service"

export async function submitProposal(
	input: SubmissionInput | IconUpdateInput,
	own?: Pick<OwnIconUpdateInput, "updated" | "refreshTarget" | "retainVariants"> & { id: string },
): Promise<{ id: string }> {
	const body = new FormData()
	if ("kind" in input && input.kind === "update") {
		body.set("kind", "update")
		body.set("revision", input.revision)
	}
	body.set("name", input.name)
	body.set("description", input.description)
	body.set("target_submission", input.targetSubmission)
	for (const alias of input.aliases) body.append("aliases", alias)
	for (const category of input.categories) body.append("categories", category)
	for (const [variant, file] of Object.entries(input.assets)) {
		if (file) body.set(variant, file)
	}
	if (own) {
		body.set("updated", own.updated)
		if (own.refreshTarget) body.set("refresh_target", "true")
		if (own.retainVariants) body.set("retain_variants", JSON.stringify(own.retainVariants))
	}

	let url = "/api/submissions"
	let method = "POST"
	if (own) {
		url += `/${encodeURIComponent(own.id)}`
		method = "PATCH"
	}
	const response = await fetch(url, {
		method,
		headers: { Authorization: pb.authStore.token },
		body,
	})
	const result = (await response.json().catch(() => null)) as { id?: string; error?: string } | null
	if (!response.ok || !result?.id) throw new Error(result?.error || `Submission failed (HTTP ${response.status})`)
	return { id: result.id }
}
