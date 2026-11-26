import { ChevronLeft, ChevronRight, ImageOff, Search } from "lucide-react"
import type { MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { VariantPreview } from "@/components/variant-preview"
import { cn, formatIconName } from "@/lib/utils"
import type { ServiceListAction, ServiceListCandidate, ServiceListRow } from "./model"

type RowControls = {
	onAction: (id: number, action: ServiceListAction) => void
	onFind: (id: number, event: MouseEvent<HTMLButtonElement>) => void
}

type ReviewLayoutProps = RowControls & { rows: ServiceListRow[] }

const STATUSES = {
	confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
	pending: { label: "Needs review", className: "bg-accent text-foreground" },
	unmatched: { label: "Needs an icon", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
	skipped: { label: "Skipped", className: "bg-secondary text-muted-foreground" },
}

const CONFIRM_ACTIONS = {
	pending: { label: "Confirm", type: "confirm", variant: "default" },
	confirmed: { label: "Undo confirmation", type: "reopen", variant: "outline" },
	skipped: null,
} as const

export function candidateName({ icon }: ServiceListCandidate) {
	return formatIconName(icon.name, { capitalize: true, aliases: icon.data.aliases })
}

function RowStatus({ row }: { row: ServiceListRow }) {
	let status = STATUSES[row.status]
	if (row.status === "pending" && !row.candidate) status = STATUSES.unmatched

	return (
		<span className={cn("w-fit shrink-0 rounded-full px-2 py-1 text-xs font-medium leading-none", status.className)}>{status.label}</span>
	)
}

function MatchDetails({ candidate }: { candidate: ServiceListCandidate | null }) {
	if (!candidate) return <p className="text-sm text-muted-foreground">No match</p>

	return (
		<div className="min-w-0">
			<p className="break-words text-sm font-medium">{candidateName(candidate)}</p>
			<p className="break-all text-xs text-muted-foreground">{candidate.slug}</p>
		</div>
	)
}

function MatchPreview({ row, size }: { row: ServiceListRow; size: "small" | "medium" | "large" }) {
	const heights = { small: "h-9", medium: "h-24", large: "h-40 sm:h-52" }
	const height = heights[size]

	if (!row.candidate) {
		return (
			<div className={cn("grid place-items-center rounded-md border border-dashed bg-muted", height)}>
				<ImageOff aria-hidden="true" className="size-5 text-muted-foreground" />
			</div>
		)
	}

	return (
		<figure>
			<VariantPreview src={row.candidate.url} alt={`${candidateName(row.candidate)} icon`} background="any" className={height} />
			{size !== "small" && (
				<figcaption className="mt-1.5 grid grid-cols-2 text-center text-xs text-muted-foreground">
					<span>Light</span>
					<span>Dark</span>
				</figcaption>
			)}
		</figure>
	)
}

function RowActions({ row, onAction, onFind }: RowControls & { row: ServiceListRow }) {
	const skipped = row.status === "skipped"
	const confirm = CONFIRM_ACTIONS[row.status]
	const find = row.candidate ? ({ label: "Change icon", variant: "ghost" } as const) : ({ label: "Find icon", variant: "outline" } as const)
	const skip = skipped ? ({ label: "Undo skip", type: "undo-skip" } as const) : ({ label: "Skip", type: "skip" } as const)

	return (
		<div className="flex flex-wrap items-center gap-x-1 gap-y-2">
			{confirm && row.candidate && (
				<Button
					type="button"
					size="sm"
					variant={confirm.variant}
					className="min-h-11 motion-reduce:transition-none motion-reduce:hover:scale-100"
					onClick={() => onAction(row.id, { type: confirm.type })}
				>
					{confirm.label}
					<span className="sr-only"> {row.name}</span>
				</Button>
			)}
			{!skipped && (
				<Button
					type="button"
					size="sm"
					variant={find.variant}
					className="min-h-11 motion-reduce:transition-none motion-reduce:hover:scale-100"
					onClick={(event) => onFind(row.id, event)}
				>
					{!row.candidate && <Search aria-hidden="true" />}
					{find.label}
					<span className="sr-only"> for {row.name}</span>
				</Button>
			)}
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="min-h-11 motion-reduce:transition-none motion-reduce:hover:scale-100"
				onClick={() => onAction(row.id, { type: skip.type })}
			>
				{skip.label}
				<span className="sr-only"> {row.name}</span>
			</Button>
		</div>
	)
}

export function TileReview({ rows, ...controls }: ReviewLayoutProps) {
	return (
		<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{rows.map((row) => (
				<li key={row.id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4">
					<MatchPreview row={row} size="medium" />
					<div className="flex flex-wrap items-start justify-between gap-2">
						<h3 className="min-w-0 break-words font-semibold">{row.name}</h3>
						<RowStatus row={row} />
					</div>
					<MatchDetails candidate={row.candidate} />
					<div className="mt-auto border-t pt-2">
						<RowActions row={row} {...controls} />
					</div>
				</li>
			))}
		</ul>
	)
}

export function ListReview({ rows, ...controls }: ReviewLayoutProps) {
	return (
		<div className="overflow-hidden rounded-lg border">
			<div
				aria-hidden="true"
				className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_8rem_minmax(16rem,1fr)] gap-4 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground lg:grid"
			>
				<span>Pasted name</span>
				<span>Icon match</span>
				<span>Status</span>
				<span>Actions</span>
			</div>
			<ul className="list-none divide-y">
				{rows.map((row) => (
					<li
						key={row.id}
						className="grid min-w-0 items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_8rem_minmax(16rem,1fr)] lg:gap-4 lg:py-2"
					>
						<h3 className="min-w-0 break-words text-sm font-semibold">{row.name}</h3>
						<div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
							<MatchPreview row={row} size="small" />
							<MatchDetails candidate={row.candidate} />
						</div>
						<RowStatus row={row} />
						<RowActions row={row} {...controls} />
					</li>
				))}
			</ul>
		</div>
	)
}

export function FocusReview({
	rows,
	index,
	onIndexChange,
	...controls
}: ReviewLayoutProps & { index: number; onIndexChange: (index: number) => void }) {
	const row = rows[index]
	if (!row) return null

	return (
		<div className="grid min-w-0 overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)]">
			<nav aria-label="Services to review" className="min-w-0 border-b bg-muted/70 md:border-r md:border-b-0">
				<ol className="flex max-h-[30rem] list-none flex-nowrap gap-1 overflow-auto p-2 md:flex-col">
					{rows.map((entry, position) => (
						<li key={entry.id} className="max-w-[16rem] shrink-0 md:max-w-none">
							<button
								type="button"
								aria-current={position === index}
								className="flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=true]:bg-accent aria-[current=true]:font-semibold"
								onClick={() => onIndexChange(position)}
							>
								<span className="min-w-0 flex-1 break-words text-sm">{entry.name}</span>
								<RowStatus row={entry} />
							</button>
						</li>
					))}
				</ol>
			</nav>
			<div className="min-w-0 p-4 sm:p-6">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<h3 className="min-w-0 break-words text-xl font-semibold tracking-tight">{row.name}</h3>
					<RowStatus row={row} />
				</div>
				<MatchPreview row={row} size="large" />
				<div className="my-4 flex flex-wrap items-center justify-between gap-3">
					<MatchDetails candidate={row.candidate} />
					<RowActions row={row} {...controls} />
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="motion-reduce:transition-none motion-reduce:hover:scale-100"
						disabled={index === 0}
						onClick={() => onIndexChange(index - 1)}
					>
						<ChevronLeft aria-hidden="true" />
						Previous
					</Button>
					<span className="text-sm tabular-nums text-muted-foreground">
						{index + 1} of {rows.length}
					</span>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="motion-reduce:transition-none motion-reduce:hover:scale-100"
						disabled={index === rows.length - 1}
						onClick={() => onIndexChange(index + 1)}
					>
						Next
						<ChevronRight aria-hidden="true" />
					</Button>
				</div>
			</div>
		</div>
	)
}
