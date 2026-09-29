export type TakedownStatus = "requested" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "unknown"

export interface Takedown {
	id: string
	icon: string
	reason: string
	requester_name: string
	requester_email: string
	description: string
	status: TakedownStatus
	requested_by: string
	requested_by_name: string
	run_id: string
	run_url: string
	commit_sha: string
	message: string
	active: boolean
	created: string
	updated: string
}

export interface TakedownRequest {
	icon: string
	reason: string
	requester_name?: string
	requester_email?: string
	description?: string
}

export const takedownStatusLabels: Record<TakedownStatus, string> = {
	requested: "Requested",
	queued: "Queued",
	running: "Running",
	succeeded: "Removed",
	failed: "Failed",
	cancelled: "Cancelled",
	unknown: "Unknown",
}

export const takedownReasons = ["DMCA takedown request", "Trademark claim", "Rights holder request", "Other legal request"]
