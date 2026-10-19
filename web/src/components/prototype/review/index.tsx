// PROTOTYPE (throwaway): four review-workflow variants on /dashboard?view=review&variant=A..D with a stub admin and in-memory data, sharing one staged changeset.
"use client"
import { Clock3, FlaskConical, GitPullRequest, LayoutDashboard, ListFilter, Rss } from "lucide-react"
import { useState } from "react"
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher"
import { cn } from "@/lib/utils"
import { PayloadDialog } from "./shared"
import { useReview } from "./state"
import { VariantA } from "./variant-a"
import { VariantB } from "./variant-b"
import { VariantC } from "./variant-c"
import { VariantD } from "./variant-d"

const variants = [
	{ key: "A", name: "Triage board", Component: VariantA },
	{ key: "B", name: "Icon bench", Component: VariantB },
	{ key: "C", name: "Contact sheet", Component: VariantC },
	{ key: "D", name: "Pull-request review", Component: VariantD },
]
const nav = [
	{ label: "Overview", Icon: LayoutDashboard },
	{ label: "Review", Icon: Clock3 },
	{ label: "Publish", Icon: GitPullRequest },
	{ label: "Submissions", Icon: ListFilter },
	{ label: "Activity", Icon: Rss },
]

export function ReviewPrototype({ variant }: { variant: string }) {
	const review = useReview()
	const [confirm, setConfirm] = useState(false)
	const active = variants.find((entry) => entry.key === variant.toUpperCase()) || variants[0]
	const pending = review.subs.length
	return (
		<div data-review-bench className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-2 pb-16 sm:px-6 lg:px-8">
			<div className="mb-3 flex shrink-0 items-center gap-2 border-b pb-2">
				<nav aria-label="Dashboard views" className="hidden items-center gap-1 md:flex">
					{nav.map(({ label, Icon }) => (
						<span
							key={label}
							className={cn(
								"flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-foreground/50",
								label === "Review" && "border-primary text-foreground",
							)}
						>
							<Icon className="size-3.5" />
							{label}
							{label === "Review" && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{pending}</span>}
						</span>
					))}
				</nav>
				<span className="ml-auto flex items-center gap-1.5 rounded-md border border-dashed border-violet-500/40 bg-violet-500/5 px-2 py-1 text-[11px] text-violet-700 dark:text-violet-300">
					<FlaskConical className="size-3" />
					Prototype · stub admin · mock data
				</span>
			</div>
			<active.Component key={active.key} review={review} onSubmit={() => setConfirm(true)} />
			<PayloadDialog open={confirm} onOpenChange={setConfirm} payload={review.payload} onConfirm={review.reset} />
			<PrototypeSwitcher variants={variants.map(({ key, name }) => ({ key, name }))} current={active.key} />
		</div>
	)
}
