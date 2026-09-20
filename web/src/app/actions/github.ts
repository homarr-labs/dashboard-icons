"use server"
import { createServerPB } from "@/lib/pb"

// Compatibility for existing callers; all publication now uses server-side reservations.
export async function triggerAddIconWorkflow(authToken: string, submissionIds: string, dryRun = false) {
	if (dryRun) return { success: false, error: "Use the GitHub workflow dry-run option directly.", workflowUrl: undefined }
	try {
		const pb = createServerPB()
		pb.authStore.save(authToken, null)
		const auth = await pb.collection("users").authRefresh()
		if (!auth.record.admin) throw new Error("Administrator access required")
		const ids = submissionIds.split(",").filter(Boolean)
		const records = await Promise.all(ids.map((id) => pb.collection("submissions").getOne(id, { requestKey: null })))
		const batch = await pb.send<{ state: string; run_url?: string; message?: string }>("/api/dashboard/publish/dispatch", {
			method: "POST",
			body: { items: records.map((record) => ({ id: record.id, updated: record.updated })) },
		})
		return { success: batch.state !== "failed", error: batch.message, workflowUrl: batch.run_url }
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Could not request publication", workflowUrl: undefined }
	}
}
export async function triggerBulkAddIconWorkflow(authToken: string, submissionIds: string[], dryRun = false) {
	const result = await triggerAddIconWorkflow(authToken, submissionIds.join(","), dryRun)
	return { ...result, submissionCount: submissionIds.length }
}
