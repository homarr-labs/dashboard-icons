"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useDashboardActivity } from "@/hooks/use-dashboard"
import type { DashboardFilters } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { Time } from "./primitives"

export function ReviewHistory({ record, filters }: { record: Submission; filters: DashboardFilters }) {
	const [open, setOpen] = useState(false)
	const [page, setPage] = useState(1)
	const history = useDashboardActivity(
		{ ...filters, page, actor: "", action: "", submission: "", from: "", to: "" },
		open,
		record.id,
		undefined,
	)
	return (
		<details onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-lg bg-muted/40">
			<summary className="min-h-11 cursor-pointer rounded-lg p-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
				Record history
			</summary>
			<div className="space-y-3 px-3 pb-3">
				{history.isLoading && <p className="text-xs text-muted-foreground">Loading history…</p>}
				{history.error && (
					<div role="alert" className="text-xs text-destructive">
						History could not be loaded.{" "}
						<Button variant="ghost" onClick={() => void history.refetch()}>
							Retry history
						</Button>
					</div>
				)}
				{history.data && !history.data.items.length && (
					<p className="text-xs leading-5 text-muted-foreground">
						No recorded history. Older Submissions show their current state, not a reconstructed round.
					</p>
				)}
				<ul className="space-y-3">
					{history.data?.items.map((event) => (
						<li key={event.id} className="space-y-1 text-xs [overflow-wrap:anywhere]">
							<p>
								<span className="font-medium">{event.actor_name || "Automation"}</span> · {event.action} · <Time value={event.created} />
							</p>
							{event.feedback && <p className="whitespace-pre-wrap leading-5 text-muted-foreground">{event.feedback}</p>}
						</li>
					))}
				</ul>
				{history.data && history.data.totalPages > 1 && (
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" disabled={page <= 1 || history.isFetching} onClick={() => setPage(page - 1)}>
							Previous history
						</Button>
						<span className="text-xs">
							{page} / {history.data.totalPages}
						</span>
						<Button variant="outline" disabled={page >= history.data.totalPages || history.isFetching} onClick={() => setPage(page + 1)}>
							Next history
						</Button>
					</div>
				)}
			</div>
		</details>
	)
}
