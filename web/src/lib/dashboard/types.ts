import type { Submission } from "@/lib/pb"
export type DashboardView = "overview" | "review" | "publish" | "submissions" | "activity"
export interface DashboardFilters {
	view: DashboardView
	search: string
	status: string
	submitter: string
	reviewer: string
	from: string
	to: string
	sort: string
	page: number
	perPage: number
	actor: string
	action: string
	submission: string
}
export interface SubmissionEvent {
	id: string
	submission_id: string
	submission_name: string
	actor_id: string
	actor_name: string
	actor_kind: "admin" | "contributor" | "automation"
	action: string
	created: string
	changes: Record<string, { before: unknown; after: unknown }>
	feedback: string
	operation_id: string
	batch_id: string
}
export interface PublishBatch {
	id: string
	requester_id: string
	requester_name: string
	created: string
	updated: string
	items: { id: string; name: string; updated: string; state: string }[]
	state: "requesting" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "unknown"
	run_id: string
	run_url: string
	message: string
	commit_sha: string
	active: boolean
}
export interface DashboardSummary {
	counts: Record<Submission["status"], number>
	pending: Submission[]
	approved: Submission[]
	oldest: Submission | null
	batches: PublishBatch[]
}
export const views: { id: DashboardView; label: string }[] = [
	{ id: "overview", label: "Overview" },
	{ id: "review", label: "Review" },
	{ id: "publish", label: "Publish" },
	{ id: "submissions", label: "Submissions" },
	{ id: "activity", label: "Activity" },
]
export const statusLabels: Record<string, string> = {
	pending: "Needs review",
	approved: "Approved",
	rejected: "Rejected",
	added_to_collection: "Published",
}
export const actionLabels: Record<string, string> = {
	submitted: "submitted",
	resubmitted: "resubmitted",
	edited: "edited",
	approved: "approved",
	rejected: "rejected",
	published: "published",
	publish_requested: "requested publication of",
	publish_succeeded: "finished publishing",
	publish_failed: "failed to publish",
	publish_cancelled: "cancelled publication of",
	publish_unknown: "could not confirm publication of",
}
