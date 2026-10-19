"use client"
import { Check, Flag, Loader2, Send, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { statusStyles } from "./primitives"
import { ReviewFixupSummary } from "./review-fixup-editors"
import { DecisionBadge, type ReviewDraft } from "./review-presentation"

export function ReviewSubmitDialog({
	open,
	onOpenChange,
	busy,
	decisions,
	errors,
	onRemove,
	onComment,
	onSubmit,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	busy: boolean
	decisions: ReviewDraft[]
	errors: Record<string, string>
	onRemove: (id: string) => void
	onComment: (draft: ReviewDraft, comment: string) => void
	onSubmit: () => void
}) {
	const approved = decisions.filter((draft) => draft.status === "approved").length
	const body = useRef<HTMLDivElement>(null)
	let label = `Submit ${decisions.length} decisions`
	if (decisions.length === 1) label = "Submit 1 decision"
	if (busy) label = "Submitting…"
	useEffect(() => {
		if (!open || !Object.keys(errors).length) return
		const alert = body.current?.querySelector<HTMLElement>("[role=alert]")
		alert?.focus()
		alert?.scrollIntoView({ block: "nearest" })
	}, [errors, open])
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!busy) onOpenChange(next)
			}}
		>
			<DialogContent className="flex max-h-[85dvh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col overflow-hidden sm:max-w-2xl max-lg:[&_button]:min-h-11 max-lg:[&_button]:min-w-11">
				<DialogTitle className="flex shrink-0 items-center gap-2 pr-12">
					<Flag className="size-5 text-muted-foreground" />
					Submit review
				</DialogTitle>
				<DialogDescription className="shrink-0">
					Contributors can fix and resubmit any rejected Submission. Approving does not publish.
				</DialogDescription>
				<div className="flex shrink-0 flex-wrap gap-2 text-sm">
					<p className="flex items-center gap-1.5">
						<Check className={cn("size-4", statusStyles.approved.text)} />
						<strong className="tabular-nums">{approved}</strong> to approve
					</p>
					<p className="flex items-center gap-1.5">
						<X className={cn("size-4", statusStyles.rejected.text)} />
						<strong className="tabular-nums">{decisions.length - approved}</strong> to reject
					</p>
				</div>
				<div ref={body} className="relative min-h-0 space-y-3 overflow-y-auto overscroll-contain p-1">
					{decisions.map((draft) => (
						<div key={draft.id} className="space-y-3 rounded-lg border p-3 [overflow-wrap:anywhere]">
							<div className="flex items-center justify-between gap-2">
								<span className="flex min-w-0 items-center gap-2">
									<DecisionBadge draft={draft} />
									<span className="min-w-0 break-words font-mono text-sm font-medium">{draft.fixups?.name || draft.name}</span>
								</span>
								<Button size="sm" variant="ghost" disabled={busy} onClick={() => onRemove(draft.id)}>
									Remove
								</Button>
							</div>
							{draft.status === "rejected" && (
								<p className="text-xs text-muted-foreground">The contributor can fix and resubmit this Submission.</p>
							)}
							<ReviewFixupSummary changes={(draft.fixupSummary || []).map((text) => ({ key: text, text }))} />
							<label htmlFor={`review-feedback-${draft.id}`} className="block space-y-1.5 text-xs text-muted-foreground">
								Feedback (optional)
								<Textarea
									maxLength={10000}
									disabled={busy}
									id={`review-feedback-${draft.id}`}
									value={draft.comment}
									onChange={(event) => onComment(draft, event.target.value)}
								/>
							</label>
							{errors[draft.id] && (
								<p
									role="alert"
									tabIndex={-1}
									className="rounded-sm text-sm text-destructive outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									{errors[draft.id]} Remove this draft and review the current Submission again if it changed.
								</p>
							)}
						</div>
					))}
				</div>
				<DialogFooter className="shrink-0">
					<Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
						Keep reviewing
					</Button>
					<Button disabled={busy || !decisions.length} onClick={onSubmit}>
						{busy && <Loader2 className="animate-spin motion-reduce:animate-none" />}
						{!busy && <Send />}
						{label}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
