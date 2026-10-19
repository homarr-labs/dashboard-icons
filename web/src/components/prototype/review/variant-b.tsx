// PROTOTYPE (throwaway): pass 2 Variant B "Contact sheet" — every pending Submission's variants in one grid for spotting bad assets and bulk-approving clean ones; drill into one for fix-ups or a reasoned reject.
"use client"
import { Check, Maximize2, Send, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { blocking, type Hint, hints, reasons, type Submission } from "./mock"
import {
	type Backdrop,
	batches,
	DecisionBadge,
	FinalToggle,
	Hints,
	MetadataFields,
	minutesAgo,
	ReasonPicker,
	reasonFor,
	VariantTile,
} from "./shared"
import type { Review } from "./state"

function flagged(sub: Submission, review: Review) {
	const view = review.effective(sub)
	return (
		view.issues.length > 0 || view.rows.some((row) => row.proposed && !row.dropped && row.change !== "unchanged" && blocking(row.proposed))
	)
}

function clean(sub: Submission, review: Review) {
	return sub.type === "new" && !review.decisions[sub.id] && !flagged(sub, review) && !hints(sub, review.subs).length
}

export function VariantB({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const groups = useMemo(() => batches(review.subs), [review.subs])
	const order = useMemo(() => groups.flatMap((group) => group.subs.map((sub) => sub.id)), [groups])
	const [selected, setSelected] = useState<string[]>([])
	const [anchor, setAnchor] = useState<string | null>(null)
	const [backdrop, setBackdrop] = useState<Backdrop>("intended")
	const [hideDecided, setHideDecided] = useState(false)
	const [picker, setPicker] = useState(false)
	const [openId, setOpenId] = useState<string | null>(null)
	const opened = review.subs.find((sub) => sub.id === openId)
	const cleanPending = review.subs.filter((sub) => clean(sub, review))

	function toggle(id: string, event: React.MouseEvent) {
		if (event.shiftKey && anchor) {
			const [from, to] = [order.indexOf(anchor), order.indexOf(id)].sort((a, b) => a - b)
			setSelected([...new Set([...selected, ...order.slice(from, to + 1)])])
			return
		}
		setAnchor(id)
		if (selected.includes(id)) setSelected(selected.filter((entry) => entry !== id))
		else setSelected([...selected, id])
	}
	const approveSelected = useCallback(() => {
		for (const id of selected) review.approve(id)
		setSelected([])
	}, [selected, review])
	const rejectSelected = useCallback(
		(text: string, final: boolean) => {
			for (const id of selected) review.reject(id, text, final)
			setSelected([])
			setPicker(false)
		},
		[selected, review],
	)

	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (target.closest("input,textarea,select,[role=dialog]")) return
			const key = event.key.toLowerCase()
			if (key === "escape") {
				setSelected([])
				setPicker(false)
			}
			if (key === "o" && anchor) setOpenId(anchor)
			if (!selected.length) return
			if (picker && /^[1-9]$/.test(key)) {
				const reason = reasons[Number(key) - 1]
				rejectSelected(reason.text, reason.final)
				return
			}
			if (key === "a") approveSelected()
			if (key === "x") setPicker((open) => !open)
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [selected.length, picker, anchor, approveSelected, rejectSelected])

	const stagedCount = Object.keys(review.decisions).length
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2">
			<div className="flex flex-wrap items-center gap-1.5 text-xs">
				{(["intended", "checker"] as Backdrop[]).map((mode) => (
					<button
						type="button"
						key={mode}
						onClick={() => setBackdrop(mode)}
						className={cn("rounded-md border px-2 py-1", backdrop === mode && "bg-foreground text-background")}
					>
						{mode === "intended" && "Background it's for"}
						{mode === "checker" && "Checkerboard"}
					</button>
				))}
				<label className="ml-2 flex items-center gap-1">
					<input type="checkbox" checked={hideDecided} onChange={(event) => setHideDecided(event.target.checked)} />
					Hide decided
				</label>
				<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(cleanPending.map((sub) => sub.id))}>
					Select all clean ({cleanPending.length})
				</Button>
				<span className="ml-auto flex items-center gap-2">
					<span className="text-muted-foreground">
						{stagedCount} staged · {review.payload.publishQueue.length} files → publish queue
					</span>
					<Button size="sm" className="h-7 text-xs" disabled={!stagedCount} onClick={onSubmit}>
						<Send className="size-3" />
						Submit review
					</Button>
				</span>
			</div>
			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-40">
				{groups.map((group) => {
					const subs = group.subs.filter((sub) => !hideDecided || !review.decisions[sub.id])
					if (!subs.length) return null
					const cleanInGroup = subs.filter((sub) => clean(sub, review))
					return (
						<section key={group.key}>
							<h3 className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
								<span className="font-semibold">@{group.contributor}</span>
								{group.subs.length > 1 && <span className="rounded bg-muted px-1.5">sent together · {group.subs.length}</span>}
								<span className="text-muted-foreground">{minutesAgo(group.created)}</span>
								{group.subs.length > 1 && !!cleanInGroup.length && (
									<button
										type="button"
										className="text-muted-foreground underline hover:text-foreground"
										onClick={() => setSelected([...new Set([...selected, ...cleanInGroup.map((sub) => sub.id)])])}
									>
										select {cleanInGroup.length} clean
									</button>
								)}
							</h3>
							<div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
								{subs.map((sub) => {
									const view = review.effective(sub)
									const isSelected = selected.includes(sub.id)
									const bad = flagged(sub, review)
									const hintCount = hints(sub, review.subs).length
									const decision = review.decisions[sub.id]
									const shown = view.rows.filter((row) => row.change !== "unchanged")
									return (
										<div
											key={sub.id}
											className={cn(
												"relative rounded-lg border bg-background p-2",
												isSelected && "ring-2 ring-primary",
												bad && "border-red-500/60",
												decision?.outcome === "approve" && "border-emerald-500/50 bg-emerald-500/5",
												decision?.outcome === "reject" && "opacity-60",
											)}
										>
											<button
												type="button"
												aria-pressed={isSelected}
												aria-label={`Select ${view.slug}`}
												onClick={(event) => toggle(sub.id, event)}
												className="absolute inset-0 z-0 rounded-lg"
											/>
											<div className="pointer-events-none relative z-10 mb-1.5 flex items-center gap-1.5">
												<span
													className={cn(
														"flex size-4 shrink-0 items-center justify-center rounded border",
														isSelected && "border-primary bg-primary text-primary-foreground",
													)}
												>
													{isSelected && <Check className="size-3" />}
												</span>
												<span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{view.slug}</span>
												<button
													type="button"
													aria-label={`Open ${view.slug}`}
													onClick={() => setOpenId(sub.id)}
													className="pointer-events-auto rounded p-0.5 hover:bg-muted"
												>
													<Maximize2 className="size-3.5" />
												</button>
											</div>
											<div className="pointer-events-none relative z-10 grid grid-cols-3 gap-1">
												{shown.map((row) => (
													<VariantTile
														key={`${row.originalKind}-${row.proposed?.id || row.published?.id}`}
														row={row}
														slug={view.slug}
														mode={backdrop}
														compact
														update={sub.type === "update"}
													/>
												))}
											</div>
											<div className="pointer-events-none relative z-10 mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
												{sub.type === "update" && <span className="rounded bg-blue-500/10 px-1 text-blue-600">update</span>}
												{sub.round > 1 && <span className="rounded bg-violet-500/10 px-1 text-violet-600">round {sub.round}</span>}
												{!!hintCount && <span className="rounded bg-amber-500/10 px-1 text-amber-600">{hintCount} hint</span>}
												{bad && <span className="rounded bg-red-500/10 px-1 text-red-600">flagged</span>}
												{decision && <DecisionBadge decision={decision} className="ml-auto px-1 py-0 text-[9px]" />}
											</div>
										</div>
									)
								})}
							</div>
						</section>
					)
				})}
			</div>

			{!!selected.length && (
				<div className="fixed inset-x-3 bottom-16 z-50 mx-auto max-w-3xl space-y-2 rounded-2xl border bg-background p-2 shadow-2xl">
					{picker && <ReasonPicker onPick={rejectSelected} />}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="px-2 text-xs font-medium">{selected.length} selected</span>
						<Button size="sm" className="h-8" onClick={approveSelected}>
							<Check className="size-3.5" />
							Approve <kbd className="opacity-60">A</kbd>
						</Button>
						<Button size="sm" variant="outline" className="h-8" onClick={() => setPicker(!picker)}>
							<X className="size-3.5" />
							Reject… <kbd className="opacity-60">X</kbd>
						</Button>
						<Button size="sm" variant="ghost" className="ml-auto h-8" onClick={() => setSelected([])}>
							Clear · Esc
						</Button>
					</div>
				</div>
			)}

			<Sheet open={!!opened} onOpenChange={(value) => !value && setOpenId(null)}>
				<SheetContent className="w-full gap-0 overflow-y-auto bg-background p-0 sm:max-w-xl">
					<SheetTitle className="sr-only">Submission detail</SheetTitle>
					<SheetDescription className="sr-only">Fix-ups and decision for one submission</SheetDescription>
					{opened && <Drill key={opened.id} sub={opened} review={review} backdrop={backdrop} onOpen={setOpenId} />}
				</SheetContent>
			</Sheet>
		</div>
	)
}

function Drill({ sub, review, backdrop, onOpen }: { sub: Submission; review: Review; backdrop: Backdrop; onOpen: (id: string) => void }) {
	const view = review.effective(sub)
	const [picker, setPicker] = useState(false)
	const variantHint = hints(sub, review.subs).find((hint) => hint.type === "variant-of")
	function rejectAsVariant(hint: Hint) {
		const reason = reasons.find((entry) => entry.key === "variant-of")
		if (reason) review.reject(sub.id, reasonFor(reason, hint), reason.final)
	}
	return (
		<div className="space-y-3 p-4">
			<div>
				<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
					{sub.type === "update" && "Update proposal"}
					{sub.type === "new" && "New icon"} · @{sub.contributor} · round {sub.round}
				</p>
				<h2 className="font-mono text-xl font-semibold">{view.slug}</h2>
				{sub.note && <p className="text-xs text-muted-foreground">“{sub.note}”</p>}
			</div>
			<Hints sub={sub} review={review} onOpen={onOpen} onRejectAsVariant={rejectAsVariant} />
			{!!view.issues.length && <p className="text-xs text-red-600">⚠ {view.issues.join(" · ")}</p>}
			<div className="grid grid-cols-2 gap-2">
				{view.rows.map((row) => (
					<VariantTile
						key={`${row.originalKind}-${row.proposed?.id || row.published?.id}`}
						row={row}
						slug={view.slug}
						mode={backdrop}
						review={review}
						submissionId={sub.id}
						update={sub.type === "update"}
					/>
				))}
			</div>
			<MetadataFields sub={sub} review={review} />
			<Textarea
				rows={2}
				value={review.comments[sub.id] || ""}
				onChange={(event) => review.comment(sub.id, event.target.value)}
				placeholder="Note to contributor (optional)"
				className="text-xs"
			/>
			<div className="flex flex-wrap items-center gap-2">
				<Button size="sm" onClick={() => review.approve(sub.id)}>
					<Check className="size-3.5" />
					Approve{!!review.fixupLines(sub).length && " with fix-ups"}
				</Button>
				<Button size="sm" variant="outline" onClick={() => setPicker(!picker)}>
					<X className="size-3.5" />
					Reject…
				</Button>
				<DecisionBadge decision={review.decisions[sub.id]} />
			</div>
			<FinalToggle review={review} id={sub.id} />
			{picker && (
				<ReasonPicker
					columns={1}
					hint={variantHint}
					onPick={(text, final) => {
						review.reject(sub.id, text, final)
						setPicker(false)
					}}
				/>
			)}
		</div>
	)
}
