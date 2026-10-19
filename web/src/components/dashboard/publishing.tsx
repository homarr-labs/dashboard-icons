"use client"
import { AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight, Loader2, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PublishBatch } from "@/lib/dashboard/types"
import { cn } from "@/lib/utils"
import { statusStyles, Time } from "./primitives"

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
	let tone = "text-muted-foreground"
	if (batch.active) {
		Icon = Loader2
		tone = "text-primary"
	}
	if (batch.state === "succeeded") {
		Icon = CheckCircle2
		tone = statusStyles.added_to_collection.text
	}
	if (["failed", "unknown", "cancelled"].includes(batch.state)) {
		Icon = AlertCircle
		tone = statusStyles.rejected.text
	}
	return (
		<article className={cn("min-w-0 rounded-lg border bg-background/50 p-4 shadow-sm", batch.active && "border-primary/50")}>
			<div className="flex items-start gap-3">
				<span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border bg-background", tone)}>
					<Icon className={cn("size-4", batch.active && "animate-spin motion-reduce:animate-none")} />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold">{labels[batch.state]}</h3>
					<p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
						{batch.items.length} icons · {batch.requester_name || "Automation"} · <Time value={batch.created} />
					</p>
				</div>
				{batch.run_url && (
					<Button asChild variant="outline" size="sm" className="shrink-0 max-lg:min-h-11">
						<a href={batch.run_url} target="_blank" rel="noreferrer">
							GitHub run
							<ArrowUpRight />
						</a>
					</Button>
				)}
			</div>
			{batch.message && <p className="mt-3 break-words text-xs leading-5 text-muted-foreground">{batch.message}</p>}
			{!compact && (
				<details className="group mt-3 text-xs">
					<summary className="flex w-fit list-none items-center gap-1 rounded-sm py-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
						<ChevronRight className="size-3 transition-transform group-open:rotate-90" />
						Included icons
					</summary>
					<ul className="mt-2 divide-y rounded-md border">
						{batch.items.map((item) => (
							<li key={item.id} className="flex justify-between gap-2 px-2 py-1.5">
								<span className="truncate font-mono">{item.name}</span>
								<span className="text-muted-foreground">
									{({ waiting: "Waiting", published: "Published", not_published: "Not published" } as Record<string, string>)[item.state] ||
										item.state}
								</span>
							</li>
						))}
					</ul>
				</details>
			)}
			{batch.state === "succeeded" && !compact && (
				<p className="mt-2 text-[11px] text-muted-foreground">Committed to the collection. Website and CDN updates may follow.</p>
			)}
		</article>
	)
}
