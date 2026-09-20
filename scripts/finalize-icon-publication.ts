// Called only after git push succeeds. Re-running the same batch is idempotent.
const base = process.env.PB_URL
const token = process.env.PB_ADMIN_TOKEN
if (!base || !token) throw new Error("PocketBase workflow credentials are missing")
const headers = { Authorization: token, "Content-Type": "application/json" }
const batchId = process.env.PUBLISH_BATCH_ID
const state = process.env.PUBLISH_STATE || "succeeded"
async function request(path: string, body: unknown) {
	const response = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) })
	if (!response.ok) throw new Error(`Publication callback failed (${response.status})`)
}
if (batchId) {
	await request(`/api/dashboard/publish/${batchId}/result`, {
		state,
		run_id: process.env.GITHUB_RUN_ID,
		run_url: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
		commit_sha: process.env.PUBLISHED_COMMIT || "",
		message: process.env.PUBLISH_MESSAGE || "",
	})
} else if (state === "succeeded") {
	// Backwards-compatible workflow_call / manual dispatch, without a dashboard batch.
	for (const id of (process.env.SUBMISSION_IDS || "").split(",").filter(Boolean)) {
		const response = await fetch(`${base}/api/collections/submissions/records/${encodeURIComponent(id)}`, {
			method: "PATCH",
			headers,
			body: JSON.stringify({ status: "added_to_collection" }),
		})
		if (!response.ok) throw new Error(`Could not mark submission ${id} as published (${response.status})`)
	}
}
