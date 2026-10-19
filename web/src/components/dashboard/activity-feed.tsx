"use client"
import {
	Bot,
	Check,
	ChevronRight,
	GitPullRequest,
	Library,
	type LucideIcon,
	MessageSquare,
	Pencil,
	Plus,
	RotateCcw,
	Rss,
	X,
} from "lucide-react"
import { savedReviewFixups } from "@/lib/dashboard/review-fixup-draft"
import { actionLabels, type SubmissionEvent } from "@/lib/dashboard/types"
import { cn } from "@/lib/utils"
import { Empty, statusStyles, Time } from "./primitives"

function actionStyle(action: string): { Icon: LucideIcon; tone: string } {
	if (action === "approved") return { Icon: Check, tone: statusStyles.added_to_collection.badge }
	if (action === "rejected") return { Icon: X, tone: statusStyles.rejected.badge }
	if (action === "submitted") return { Icon: Plus, tone: "border-primary/20 bg-primary/10 text-primary" }
	if (action === "resubmitted") return { Icon: RotateCcw, tone: statusStyles.approved.badge }
	if (action === "published" || action === "publish_succeeded") return { Icon: Library, tone: statusStyles.added_to_collection.badge }
	if (action.startsWith("publish")) return { Icon: GitPullRequest, tone: statusStyles.pending.badge }
	return { Icon: Pencil, tone: "bg-muted text-muted-foreground" }
}
const actionIcon = "flex size-7 shrink-0 items-center justify-center rounded-md border [&>svg]:size-3.5"

function ActivityItem({ event, onOpen }: { event: SubmissionEvent; onOpen: (id: string) => void }) {
	const { Icon, tone } = actionStyle(event.action)
	return (
		<div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
			<span className={cn(actionIcon, "mt-0.5", tone)}>
				<Icon />
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
							className="rounded-sm text-left font-mono font-medium underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
							onClick={() => onOpen(event.submission_id)}
						>
							{event.submission_name}
						</button>
					</div>
					<Time value={event.created} />
				</div>
				{event.feedback && ["approved", "rejected"].includes(event.action) && (
					<p className="mt-1 line-clamp-2 border-l-2 pl-2.5 text-xs leading-5 text-muted-foreground">
						<MessageSquare className="mr-1 inline size-3" />
						{event.feedback}
					</p>
				)}
				{Object.keys(event.changes || {}).length > 0 && event.action === "edited" && (
					<details className="mt-1 text-xs text-muted-foreground">
						<summary className="w-fit rounded-sm py-1 hover:text-foreground">View changes</summary>
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
				{!!savedReviewFixups(event.changes).length && (
					<ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
						{savedReviewFixups(event.changes).map((text) => (
							<li key={text} className="[overflow-wrap:anywhere]">
								{text}
							</li>
						))}
					</ul>
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
			<Empty title="No activity recorded yet" icon={Rss} tone="border-primary/20 bg-primary/10 text-primary">
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
				const { Icon, tone } = actionStyle(first.action)
				return (
					<details key={first.id} className="group">
						<summary className="flex list-none items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
							<span className={cn(actionIcon, tone)}>
								<Icon />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-baseline justify-between gap-3">
									<span className="min-w-0 truncate" title={`${first.actor_name} ${actionLabels[first.action]} ${rows.length} icons`}>
										<strong className="font-medium">{first.actor_name}</strong>{" "}
										<span className="text-muted-foreground">{actionLabels[first.action]}</span> {rows.length} icons
									</span>
									<Time value={first.created} />
								</span>
								<span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
									<ChevronRight className="size-3 transition-transform group-open:rotate-90" />
									Show the {rows.length} icons
								</span>
							</span>
						</summary>
						<div className="border-t bg-muted/30 pl-4">
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
