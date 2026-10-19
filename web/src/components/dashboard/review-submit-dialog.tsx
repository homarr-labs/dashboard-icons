"use client"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ReviewFixupSummary } from "./review-fixup-editors"
import type { ReviewDraft } from "./review-presentation"

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
			<DialogContent className="flex max-h-[85dvh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col overflow-hidden sm:max-w-2xl [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:hover:scale-100 [&_button]:motion-reduce:transition-none">
				<DialogTitle className="shrink-0 pr-12">Submit review</DialogTitle>
				<DialogDescription className="shrink-0">
					Approve: {approved} · Reject: {decisions.length - approved}. Contributors can fix and resubmit any rejected Submission. Approving
					does not publish.
				</DialogDescription>
				<div ref={body} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-1">
					{decisions.map((draft) => (
						<div key={draft.id} className="space-y-3 border-b pb-4 last:border-0 [overflow-wrap:anywhere]">
							<div className="flex items-center justify-between gap-2">
								<span className="min-w-0 break-words text-sm font-medium">
									{draft.fixups?.name || draft.name} · {draft.status}
								</span>
								<Button size="sm" variant="ghost" disabled={busy} onClick={() => onRemove(draft.id)}>
									Remove
								</Button>
							</div>
							{draft.status === "rejected" && (
								<p className="text-xs leading-5 text-muted-foreground">The contributor can fix and resubmit this Submission.</p>
							)}
							<ReviewFixupSummary changes={(draft.fixupSummary || []).map((text) => ({ key: text, text }))} />
							<label htmlFor={`review-feedback-${draft.id}`} className="block text-xs text-muted-foreground">
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
									className="rounded-sm text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
					<Button className="bg-foreground text-background hover:bg-foreground/90" disabled={busy || !decisions.length} onClick={onSubmit}>
						{busy ? "Submitting…" : "Submit review"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
