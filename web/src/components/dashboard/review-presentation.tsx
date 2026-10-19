import { AlertTriangle, Check, ChevronDown, Clock, Keyboard, Layers, Wand2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ReviewFixups } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { statusStyles } from "./primitives"

export type ReviewDraft = {
	id: string
	name: string
	updated: string
	status?: "approved" | "rejected"
	comment: string
	reason?: string
	note?: string
	fixups?: ReviewFixups
	fixupSummary?: string[]
}

export const reviewReasons = [
	"Please provide a clean SVG vector file.",
	"Please remove the background and use transparency.",
	"The icon is too small or blurry. Please upload a higher-quality asset.",
	"This icon is already in the collection.",
	"Please use the official logo and correct its proportions.",
	"Political submissions are not accepted.",
	"This is a personal or non-public resource.",
	"This icon is not relevant for our collection.",
	"Please submit this as a Variant of the existing Icon instead of a separate Icon.",
]

export type ReviewCandidate = { id: string; name: string; contributor?: string }

export function sentTogether(rows: Submission[]) {
	const groups: { key: string; rows: Submission[]; time: number }[] = []
	for (const row of rows) {
		const time = Date.parse(row.created)
		const group = groups.find((entry) => entry.rows[0].created_by === row.created_by && Math.abs(entry.time - time) <= 5 * 60 * 1000)
		if (group) group.rows.push(row)
		else groups.push({ key: row.id, rows: [row], time })
	}
	return groups
}

export function variantSibling(record: Submission | undefined, rows: ReviewCandidate[]) {
	if (!record || record.target_submission) return undefined
	return rows
		.filter((row) => row.id !== record.id && record.name.startsWith(`${row.name}-`))
		.sort((a, b) => b.name.length - a.name.length)[0]
}

export function variantRejection(name: string) {
	return `Please submit this as a Variant of ${name} instead of a separate Icon. You can fix and resubmit this Submission.`
}

export function DecisionBadge({ draft }: { draft?: ReviewDraft }) {
	let label = "Awaiting review"
	let tone = statusStyles.pending.badge
	let Icon = Clock
	if (draft?.fixupSummary?.length) {
		label = "Fix-ups staged"
		tone = "border-primary/20 bg-primary/10 text-primary"
		Icon = Wand2
	}
	if (draft?.status === "approved") {
		label = "Approval staged"
		tone = statusStyles.added_to_collection.badge
		Icon = Check
	}
	if (draft?.status === "rejected") {
		label = "Rejection staged"
		tone = statusStyles.rejected.badge
		Icon = X
	}
	return (
		<Badge variant="outline" className={tone}>
			<Icon aria-hidden />
			{label}
		</Badge>
	)
}

export function ReviewHints({ record, rows }: { record: Submission; rows: ReviewCandidate[] }) {
	const sibling = variantSibling(record, rows)
	const contributor = record.expand?.created_by?.username
	const collisions = rows.filter(
		(row) => row.id !== record.id && row.name === record.name && contributor && row.contributor && row.contributor !== contributor,
	)
	if (!sibling && !collisions.length) return null
	return (
		<ul
			aria-label="Informational hints"
			className={cn("space-y-1 rounded-lg border border-l-2 p-3 text-sm", statusStyles.pending.accent, statusStyles.pending.tint)}
		>
			{sibling && (
				<li className="flex items-start gap-2.5">
					<Layers className={cn("mt-0.5 size-4 shrink-0", statusStyles.pending.text)} />
					<span className="min-w-0 leading-6 [overflow-wrap:anywhere]">
						{record.name} looks like a Variant of{" "}
						<a
							href={`/community/submissions/${sibling.id}`}
							target="_blank"
							rel="noreferrer"
							className="rounded-sm font-mono font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							{sibling.name}
						</a>
						. Reject it as a Variant with V or the reject menu. Submissions stay separate.
					</span>
				</li>
			)}
			{collisions.map((row) => (
				<li key={row.id} className="flex items-start gap-2.5">
					<AlertTriangle className={cn("mt-0.5 size-4 shrink-0", statusStyles.pending.text)} />
					<span className="min-w-0 leading-6 [overflow-wrap:anywhere]">
						This slug is also pending from another contributor.{" "}
						<a
							href={`/community/submissions/${row.id}`}
							target="_blank"
							rel="noreferrer"
							className="rounded-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							View {row.contributor || "their Submission"}
						</a>
					</span>
				</li>
			))}
		</ul>
	)
}

export function ShortcutLegend() {
	return (
		<details className="group rounded-lg border bg-background/50 text-xs text-muted-foreground">
			<summary className="flex list-none items-center gap-2 rounded-lg px-3 py-2.5 font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-lg:min-h-11 [&::-webkit-details-marker]:hidden">
				<Keyboard className="size-4" />
				Keyboard shortcuts
				<ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
			</summary>
			<ul aria-label="Keyboard shortcuts" className="grid gap-1.5 px-3 pb-3">
				{[
					["J / K", "next / previous"],
					["P", "approve & next"],
					["X → X", "reject without a reason"],
					["X → 1–9", "reject with a reason"],
					["V", "reject as a Variant"],
					["C", "note"],
					["E", "rename slug"],
					["D", "drop selected Variant"],
					["U", "undo this review"],
					["Esc", "dismiss picker"],
				].map(([key, label]) => (
					<li key={key} className="flex items-center justify-between gap-2">
						{label}
						<kbd className="inline-flex h-5 items-center rounded-sm border border-border/80 bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-foreground">
							{key}
						</kbd>
					</li>
				))}
			</ul>
		</details>
	)
}
