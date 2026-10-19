"use client"
import { ChevronDown, History } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useDashboardActivity } from "@/hooks/use-dashboard"
import { savedReviewFixups } from "@/lib/dashboard/review-fixup-draft"
import { actionLabels, type DashboardFilters } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { LoadMore, Time } from "./primitives"

export function ReviewHistory({ record, filters }: { record: Submission; filters: DashboardFilters }) {
	const [open, setOpen] = useState(false)
	const [limit, setLimit] = useState(25)
	const history = useDashboardActivity({ ...filters, actor: "", action: "", submission: "", from: "", to: "" }, open, record.id, limit)
	return (
		<details onToggle={(event) => setOpen(event.currentTarget.open)} className="group rounded-lg border bg-background/50 shadow-sm">
			<summary className="flex list-none items-center gap-2 rounded-lg p-3 text-sm font-semibold outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 max-lg:min-h-11 [&::-webkit-details-marker]:hidden">
				<History className="size-4 text-primary" />
				Record history
				<ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<div className="space-y-3 px-3 pb-3">
				{history.isLoading && <p className="text-xs text-muted-foreground">Loading history…</p>}
				{history.error && (
					<div role="alert" className="text-xs text-destructive">
						History could not be loaded.{" "}
						<Button variant="ghost" size="sm" onClick={() => void history.refetch()}>
							Retry history
						</Button>
					</div>
				)}
				{history.data && !history.data.items.length && (
					<p className="text-xs text-muted-foreground">
						No recorded history. Older Submissions show their current state, not a reconstructed round.
					</p>
				)}
				<ol className="relative space-y-3 border-l pl-4">
					{history.data?.items.map((event) => (
						<li key={event.id} className="relative space-y-1 text-xs [overflow-wrap:anywhere]">
							<span className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-background bg-muted-foreground/60" />
							<p className="flex flex-wrap items-center gap-x-1.5">
								<span className="font-medium">{event.actor_name || "Automation"}</span>
								<span className="text-muted-foreground">{actionLabels[event.action] || event.action}</span>
								<Time value={event.created} />
							</p>
							{event.feedback && <p className="whitespace-pre-wrap leading-5 text-muted-foreground">{event.feedback}</p>}
							{!!savedReviewFixups(event.changes).length && (
								<ul className="list-disc space-y-1 pl-4 leading-5 text-muted-foreground">
									{savedReviewFixups(event.changes).map((text) => (
										<li key={text}>{text}</li>
									))}
								</ul>
							)}
						</li>
					))}
				</ol>
				{history.data && (
					<LoadMore
						shown={history.data.items.length}
						total={history.data.totalItems}
						loading={history.isFetching}
						onMore={() => setLimit((current) => current + 25)}
					/>
				)}
			</div>
		</details>
	)
}
