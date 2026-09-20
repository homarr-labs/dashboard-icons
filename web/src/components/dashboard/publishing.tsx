"use client"
import { AlertCircle, ArrowUpRight, CheckCircle2, Loader2, Rocket } from "lucide-react"
import type { PublishBatch } from "@/lib/dashboard/types"
import { Time } from "./primitives"

const labels: Record<string, string> = {
	requesting: "Requesting publication",
	queued: "Queued on GitHub",
	running: "Publishing",
	succeeded: "Added to collection",
	failed: "Publication failed",
	cancelled: "Publication cancelled",
	unknown: "Status needs reconciliation",
}
export function PublishRun({ batch, compact = false }: { batch: PublishBatch; compact?: boolean }) {
	let Icon = Rocket
	if (batch.active) Icon = Loader2
	if (batch.state === "succeeded") Icon = CheckCircle2
	if (["failed", "unknown"].includes(batch.state)) Icon = AlertCircle
	return (
		<article className="min-w-0 rounded-lg border bg-background p-4">
			<div className="flex items-start gap-3">
				<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
					<Icon className="size-4 text-muted-foreground" />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-medium">{labels[batch.state]}</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						{batch.items.length} icons · {batch.requester_name || "Automation"} · <Time value={batch.created} />
					</p>
				</div>
			</div>
			{batch.message && <p className="mt-3 break-words text-xs leading-5 text-muted-foreground">{batch.message}</p>}
			{!compact && (
				<details className="mt-3 text-xs">
					<summary className="cursor-pointer text-muted-foreground">Included icons</summary>
					<ul className="mt-2 space-y-1">
						{batch.items.map((item) => (
							<li key={item.id} className="flex justify-between gap-2">
								<span className="truncate">{item.name}</span>
								<span className="text-muted-foreground">
									{({ waiting: "Waiting", published: "Published", not_published: "Not published" } as Record<string, string>)[item.state] ||
										item.state}
								</span>
							</li>
						))}
					</ul>
				</details>
			)}
			{batch.run_url && (
				<a
					href={batch.run_url}
					target="_blank"
					rel="noreferrer"
					className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
				>
					View GitHub run
					<ArrowUpRight className="size-3" />
				</a>
			)}
			{batch.state === "succeeded" && !compact && (
				<p className="mt-2 text-[11px] text-muted-foreground">Committed to the collection. Website and CDN updates may follow.</p>
			)}
		</article>
	)
}
