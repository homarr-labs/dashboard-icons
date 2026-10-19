// PROTOTYPE (throwaway): pass 3 reference design, the review bench on /dashboard?view=review&variant=A with a stub admin and in-memory data.
"use client"
import { Clock3, FlaskConical, GitPullRequest, LayoutDashboard, ListFilter, Rss } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { PayloadDialog } from "./shared"
import { useReview } from "./state"
import { VariantA } from "./variant-a"

const nav = [
	{ label: "Overview", Icon: LayoutDashboard },
	{ label: "Review", Icon: Clock3 },
	{ label: "Publish", Icon: GitPullRequest },
	{ label: "Submissions", Icon: ListFilter },
	{ label: "Activity", Icon: Rss },
]

export function ReviewPrototype(_: { variant: string }) {
	const review = useReview()
	const [confirm, setConfirm] = useState(false)
	return (
		<div data-review-bench className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-2 sm:px-6 lg:px-8">
			<div className="mb-4 flex shrink-0 flex-wrap items-center gap-2 border-b pb-2">
				<nav aria-label="Dashboard views" className="hidden items-center gap-1 md:flex">
					{nav.map(({ label, Icon }) => (
						<span
							key={label}
							className={cn(
								"flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-foreground/60",
								label === "Review" && "border-primary text-foreground",
							)}
						>
							<Icon className="size-3.5" />
							{label}
							{label === "Review" && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{review.subs.length}</span>}
						</span>
					))}
				</nav>
				<h1 className="text-base font-semibold md:sr-only">Review</h1>
				<span className="ml-auto flex items-center gap-1.5 rounded-md border border-dashed border-violet-500/40 bg-violet-500/5 px-2 py-1 text-xs text-violet-800 dark:text-violet-300">
					<FlaskConical className="size-3.5" />
					Prototype · mock data
				</span>
			</div>
			<VariantA review={review} onSubmit={() => setConfirm(true)} />
			<PayloadDialog open={confirm} onOpenChange={setConfirm} payload={review.payload} onRemove={review.unflag} onConfirm={review.reset} />
		</div>
	)
}
