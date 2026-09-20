"use client"
import { ChevronLeft, ChevronRight, CircleCheck, Inbox, Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { statusLabels } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
export function Time({ value }: { value: string }) {
	const date = new Date(value)
	const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
	let label = `${Math.floor(minutes / 1440)}d ago`
	if (minutes < 1440) label = `${Math.floor(minutes / 60)}h ago`
	if (minutes < 60) label = `${minutes}m ago`
	if (minutes < 1) label = "Just now"
	return (
		<time dateTime={date.toISOString()} title={date.toLocaleString()} className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
			{label}
		</time>
	)
}
export function Status({ status }: { status: string }) {
	return (
		<span
			className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", {
				"border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300": status === "pending",
				"border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300": status === "approved",
				"border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300": status === "rejected",
				"border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300": status === "added_to_collection",
			})}
		>
			<span className="size-1.5 rounded-full bg-current" />
			{statusLabels[status] || status}
		</span>
	)
}
export function Thumbnail({ submission }: { submission: Submission }) {
	return (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-1.5">
			{submission.assets?.[0] && (
				<UnoptimizedImage
					src={pb.files.getURL(submission, submission.assets[0], { thumb: "100x100" })}
					alt=""
					className="max-h-full max-w-full object-contain"
				/>
			)}
			{!submission.assets?.[0] && <Inbox className="size-4 text-muted-foreground" />}
		</span>
	)
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
			<CircleCheck className="mb-1 size-7 text-muted-foreground/50" />
			<p className="text-sm font-medium">{title}</p>
			<div className="max-w-sm text-xs leading-5 text-muted-foreground">{children}</div>
		</div>
	)
}
export function Loading() {
	return (
		<output className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
			<Loader2 className="size-4 animate-spin" />
			Loading workspace…
		</output>
	)
}
export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
	let message = "Something went wrong. Please try again."
	if (error instanceof Error) message = error.message
	return (
		<div role="alert" className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
			<p>{message}</p>
			<Button variant="outline" size="sm" className="mt-3" onClick={retry}>
				Try again
			</Button>
		</div>
	)
}
export function Pagination({
	page,
	totalPages,
	totalItems,
	perPage,
	onPage,
	onSize,
	disabled,
}: {
	page: number
	totalPages: number
	totalItems: number
	perPage: number
	onPage: (n: number) => void
	onSize?: (n: number) => void
	disabled?: boolean
}) {
	const start = totalItems ? (page - 1) * perPage + 1 : 0
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-3 text-xs text-muted-foreground">
			<span>
				{start}–{Math.min(page * perPage, totalItems)} of {totalItems.toLocaleString()}
			</span>
			<div className="flex items-center gap-2">
				{onSize && (
					<select
						aria-label="Rows per page"
						className="h-8 rounded border bg-background px-2"
						value={perPage}
						onChange={(e) => onSize(Number(e.target.value))}
					>
						{[25, 50, 100].map((n) => (
							<option key={n} value={n}>
								{n} / page
							</option>
						))}
					</select>
				)}
				<Button
					size="icon"
					variant="outline"
					className="size-8"
					aria-label="Previous page"
					disabled={disabled || page <= 1}
					onClick={() => onPage(page - 1)}
				>
					<ChevronLeft />
				</Button>
				<span>
					{page} / {Math.max(1, totalPages)}
				</span>
				<Button
					size="icon"
					variant="outline"
					className="size-8"
					aria-label="Next page"
					disabled={disabled || page >= totalPages}
					onClick={() => onPage(page + 1)}
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	)
}
export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
	return (
		<section className="min-w-0 overflow-hidden rounded-xl border bg-background">
			<div className="flex items-center justify-between gap-2 border-b px-4 py-3">
				<h2 className="text-sm font-semibold">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	)
}
