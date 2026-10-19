import { AlertTriangle, Layers } from "lucide-react"
import type { ReviewFixups } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"

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

export function DecisionBadge({ draft, round }: { draft?: ReviewDraft; round?: number }) {
	let label = "Awaiting review"
	let tone = "bg-muted text-foreground"
	if (draft?.fixupSummary?.length) label = "Fix-ups staged"
	if (draft?.status === "approved") {
		label = "Approve staged"
		tone = "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
	}
	if (draft?.status === "rejected") {
		label = "Reject staged"
		tone = "bg-amber-500/10 text-amber-900 dark:text-amber-300"
	}
	if (round) label += ` · Round ${round}`
	return <span className={cn("inline-flex max-w-full rounded-md px-2 py-1 text-xs font-medium", tone)}>{label}</span>
}

export function ReviewHints({ record, rows }: { record: Submission; rows: ReviewCandidate[] }) {
	const sibling = variantSibling(record, rows)
	const contributor = record.expand?.created_by?.username
	const collisions = rows.filter(
		(row) => row.id !== record.id && row.name === record.name && contributor && row.contributor && row.contributor !== contributor,
	)
	if (!sibling && !collisions.length) return null
	return (
		<ul aria-label="Informational hints" className="space-y-2 rounded-lg bg-amber-500/5 p-3 text-sm text-amber-950 dark:text-amber-200">
			{sibling && (
				<li className="flex items-start gap-2">
					<Layers className="mt-3 size-4 shrink-0" />
					<span className="min-w-0 [overflow-wrap:anywhere]">
						{record.name} looks like a Variant of{" "}
						<a
							href={`/community/submissions/${sibling.id}`}
							target="_blank"
							rel="noreferrer"
							className="inline-flex min-h-11 min-w-11 max-w-full items-center rounded font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{sibling.name}
						</a>
						. Use V to stage that rejection. Submissions stay separate.
					</span>
				</li>
			)}
			{collisions.map((row) => (
				<li key={row.id} className="flex items-start gap-2">
					<AlertTriangle className="mt-3 size-4 shrink-0" />
					<span className="min-w-0 [overflow-wrap:anywhere]">
						This slug is also pending from another contributor.{" "}
						<a
							href={`/community/submissions/${row.id}`}
							target="_blank"
							rel="noreferrer"
							className="inline-flex min-h-11 min-w-11 max-w-full items-center rounded font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
		<ul aria-label="Keyboard shortcuts" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
				<li key={key} className="flex items-center gap-1.5">
					<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{key}</kbd>
					{label}
				</li>
			))}
		</ul>
	)
}
