"use client"
import { Bot, Check, GitPullRequest, MessageSquare, Pencil, Plus, X } from "lucide-react"
import { actionLabels, type SubmissionEvent } from "@/lib/dashboard/types"
import { Empty, Time } from "./primitives"

function ActivityItem({ event, onOpen }: { event: SubmissionEvent; onOpen: (id: string) => void }) {
	let Icon = Pencil
	if (event.action === "approved") Icon = Check
	if (event.action === "rejected") Icon = X
	if (event.action === "submitted" || event.action === "resubmitted") Icon = Plus
	if (event.action.startsWith("publish")) Icon = GitPullRequest
	return (
		<div className="flex items-start gap-3 px-4 py-3.5">
			<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/30">
				<Icon className="size-3.5 text-muted-foreground" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline justify-between gap-3">
					<div
						className="min-w-0 truncate text-sm leading-6"
						title={`${event.actor_name || "Automation"} ${actionLabels[event.action] || event.action} ${event.submission_name}`}
					>
						<span className="font-medium">{event.actor_name || "Automation"}</span>
						{event.actor_kind === "automation" && <Bot aria-label="Automation" className="mx-1 inline size-3 text-muted-foreground" />}{" "}
						<span className="text-muted-foreground">{actionLabels[event.action] || event.action}</span>{" "}
						<button
							type="button"
							className="text-left font-medium underline-offset-4 hover:underline"
							onClick={() => onOpen(event.submission_id)}
						>
							{event.submission_name}
						</button>
					</div>
					<Time value={event.created} />
				</div>
				{event.feedback && ["approved", "rejected"].includes(event.action) && (
					<p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
						<MessageSquare className="mr-1 inline size-3" />
						{event.feedback}
					</p>
				)}
				{Object.keys(event.changes || {}).length > 0 && event.action === "edited" && (
					<details className="mt-1 text-xs text-muted-foreground">
						<summary className="cursor-pointer">View changes</summary>
						<dl className="mt-2 space-y-2">
							{Object.entries(event.changes).map(([key, value]) => (
								<div key={key}>
									<dt className="font-medium">{key}</dt>
									<dd className="break-all">
										<del>{JSON.stringify(value.before)}</del>
										<br />
										{JSON.stringify(value.after)}
									</dd>
								</div>
							))}
						</dl>
					</details>
				)}
			</div>
		</div>
	)
}
export function ActivityFeed({
	events,
	onOpen,
	group = true,
}: {
	events: SubmissionEvent[]
	onOpen: (id: string) => void
	group?: boolean
}) {
	if (!events.length)
		return (
			<Empty title="No activity recorded yet">
				History begins when activity tracking is enabled. Older submissions show their current state, not a reconstructed history.
			</Empty>
		)
	const groups: SubmissionEvent[][] = []
	const positions = new Map<string, number>()
	for (const event of events) {
		let key = event.id
		if (group && event.operation_id) key = `${event.operation_id}:${event.action}`
		const position = positions.get(key)
		if (position !== undefined) groups[position].push(event)
		else {
			positions.set(key, groups.length)
			groups.push([event])
		}
	}
	return (
		<div className="divide-y">
			{groups.map((rows) => {
				const first = rows[0]
				if (rows.length === 1) return <ActivityItem key={first.id} event={first} onOpen={onOpen} />
				return (
					<details key={first.id} className="group">
						<summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-sm">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/30">
								<GitPullRequest className="size-3.5" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-baseline justify-between gap-3">
									<span className="min-w-0 truncate" title={`${first.actor_name} ${actionLabels[first.action]} ${rows.length} icons`}>
										<strong className="font-medium">{first.actor_name}</strong>{" "}
										<span className="text-muted-foreground">{actionLabels[first.action]}</span> {rows.length} icons
									</span>
									<Time value={first.created} />
								</span>
								<span className="mt-1 block text-xs text-muted-foreground">Expand this group</span>
							</span>
						</summary>
						<div className="border-t bg-muted/10 pl-4">
							{rows.map((event) => (
								<ActivityItem key={event.id} event={event} onOpen={onOpen} />
							))}
						</div>
					</details>
				)
			})}
		</div>
	)
}
