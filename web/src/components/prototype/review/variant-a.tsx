// PROTOTYPE (throwaway): pass 2 Variant A "Keyboard bench" — queue of one-icon Submissions grouped by "sent together", variant tiles + metadata + fix-ups inline, staged decisions rail.
"use client"
import { Check, History, MessageSquare, RotateCcw, Send, Undo2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { type Hint, hints, reasons, rows } from "./mock"
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
	Swatch,
	VariantTile,
} from "./shared"
import type { Review } from "./state"

export function VariantA({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const groups = useMemo(() => batches(review.subs), [review.subs])
	const order = useMemo(() => groups.flatMap((group) => group.subs), [groups])
	const [currentId, setCurrentId] = useState(order[0]?.id || "")
	const [picker, setPicker] = useState(false)
	const [selectedTile, setSelectedTile] = useState(0)
	const [backdrop, setBackdrop] = useState<Backdrop>("intended")
	const commentRef = useRef<HTMLTextAreaElement>(null)
	const index = Math.max(
		0,
		order.findIndex((sub) => sub.id === currentId),
	)
	const sub = order[index]
	const view = review.effective(sub)
	const group = groups.find((entry) => entry.subs.includes(sub))
	const variantHint = hints(sub, review.subs).find((hint) => hint.type === "variant-of")
	const visibleRows = view.rows

	const go = useCallback(
		(direction: number) => {
			const next = order[Math.min(order.length - 1, Math.max(0, index + direction))]
			setCurrentId(next.id)
			setSelectedTile(0)
			setPicker(false)
		},
		[order, index],
	)
	const rejectWith = useCallback(
		(text: string, final: boolean) => {
			review.reject(sub.id, text, final)
			go(1)
		},
		[review, sub.id, go],
	)
	const rejectAsVariant = useCallback(
		(hint: Hint) => {
			const reason = reasons.find((entry) => entry.key === "variant-of")
			if (reason) rejectWith(reasonFor(reason, hint), reason.final)
		},
		[rejectWith],
	)

	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.key === "Escape" && target === commentRef.current) {
				commentRef.current?.blur()
				return
			}
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (target.closest("input,textarea,select,[role=dialog]")) return
			const key = event.key.toLowerCase()
			if (picker && /^[1-9]$/.test(key)) {
				event.preventDefault()
				const reason = reasons[Number(key) - 1]
				rejectWith(reasonFor(reason, variantHint), reason.final)
				return
			}
			if (key === "escape") setPicker(false)
			if (/^[1-9]$/.test(key)) setSelectedTile(Number(key) - 1)
			if (key === "j") go(1)
			if (key === "k") go(-1)
			if (key === "p") {
				review.approve(sub.id)
				go(1)
			}
			if (key === "x") setPicker((open) => !open)
			if (key === "v" && variantHint) rejectAsVariant(variantHint)
			if (key === "f") {
				const decision = review.decisions[sub.id]
				if (decision?.outcome === "reject") review.setFinal(sub.id, !decision.final)
			}
			if (key === "u") review.unflag(sub.id)
			if (key === "g") setBackdrop((mode) => (mode === "intended" ? "checker" : "intended"))
			if (key === "d") {
				const row = visibleRows[selectedTile]
				if (row?.proposed && row.change !== "unchanged" && row.change !== "removed") review.toggleDrop(sub.id, row.proposed.id)
			}
			if (key === "c") {
				event.preventDefault()
				commentRef.current?.focus()
			}
			if (key === "e") {
				event.preventDefault()
				document.getElementById(`meta-slug-${sub.id}`)?.focus()
			}
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [picker, rejectWith, variantHint, go, review, sub.id, rejectAsVariant, visibleRows, selectedTile])

	const decision = review.decisions[sub.id]
	const staged = order.filter((entry) => review.decisions[entry.id])
	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
			<aside aria-label="Queue" className="flex max-h-56 min-h-0 flex-col overflow-hidden rounded-xl border bg-background lg:max-h-none">
				<p className="border-b px-3 py-2 text-xs text-muted-foreground">
					{order.length} submissions · {staged.length} staged
				</p>
				<div className="min-h-0 flex-1 overflow-y-auto p-1.5">
					{groups.map((entry) => (
						<div key={entry.key} className={cn("mb-1.5", entry.subs.length > 1 && "rounded-lg bg-muted/40 p-1")}>
							{entry.subs.length > 1 && (
								<p className="px-1.5 py-1 text-[10px] font-medium text-muted-foreground">
									Sent together · {entry.subs.length} · @{entry.contributor} · {minutesAgo(entry.created)}
								</p>
							)}
							{entry.subs.map((item) => {
								const staged = review.decisions[item.id]
								const thumb = rows(item).find((row) => row.proposed)?.proposed
								return (
									<button
										type="button"
										key={item.id}
										onClick={() => {
											setCurrentId(item.id)
											setSelectedTile(0)
										}}
										className={cn(
											"flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted",
											item.id === sub.id && "bg-primary/10 ring-1 ring-primary/30",
										)}
									>
										{thumb && <Swatch variant={thumb} className="size-6 shrink-0 rounded border p-0.5" />}
										<span className="min-w-0 flex-1 truncate font-mono">{item.slug}</span>
										{item.type === "update" && <span className="rounded bg-blue-500/10 px-1 text-[9px] text-blue-600">update</span>}
										{item.round > 1 && <span className="rounded bg-violet-500/10 px-1 text-[9px] text-violet-600">r{item.round}</span>}
										{entry.subs.length === 1 && <span className="text-[10px] text-muted-foreground">@{item.contributor}</span>}
										{staged?.outcome === "approve" && <Check className="size-3.5 text-emerald-600" />}
										{staged?.outcome === "reject" && (
											<X className={cn("size-3.5", staged.final && "text-red-600", !staged.final && "text-amber-600")} />
										)}
									</button>
								)
							})}
						</div>
					))}
				</div>
			</aside>

			<main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>
						{index + 1} of {order.length}
					</span>
					<span className="rounded-full border bg-background px-2 py-0.5">@{sub.contributor}</span>
					{group && group.subs.length > 1 && (
						<span className="rounded-full border bg-background px-2 py-0.5">sent together with {group.subs.length - 1} others</span>
					)}
					<span>{minutesAgo(sub.created)}</span>
					<DecisionBadge decision={decision} />
				</div>
				<div className="flex flex-wrap items-end gap-3">
					<h2 className="break-all font-mono text-2xl font-semibold sm:text-3xl">{view.slug}</h2>
					{view.slug !== sub.slug && <span className="pb-1 text-xs text-blue-600">renamed from {sub.slug}</span>}
					<span className="pb-1 text-xs text-muted-foreground">
						{sub.type === "update" && "Update proposal to a published icon"}
						{sub.type === "new" && "New icon"}
						{sub.round > 1 && ` · round ${sub.round}`}
					</span>
				</div>
				{sub.note && <p className="text-sm text-muted-foreground">“{sub.note}”</p>}
				{sub.delta && (
					<div className="flex flex-wrap gap-1.5 text-[11px]">
						{sub.delta.add.map((entry) => (
							<span key={entry.id} className="rounded bg-emerald-500/10 px-1.5 text-emerald-700 dark:text-emerald-300">
								+ {entry.kind}
							</span>
						))}
						{sub.delta.replace.map((entry) => (
							<span key={entry.id} className="rounded bg-amber-500/10 px-1.5 text-amber-700 dark:text-amber-300">
								~ {entry.kind}
							</span>
						))}
						{sub.delta.remove.map((kind) => (
							<span key={kind} className="rounded bg-red-500/10 px-1.5 text-red-700 dark:text-red-300">
								− {kind}
							</span>
						))}
						{sub.delta.aliases.add.map((alias) => (
							<span key={alias} className="rounded bg-emerald-500/10 px-1.5 font-mono">
								+ alias {alias}
							</span>
						))}
						{sub.delta.aliases.remove.map((alias) => (
							<span key={alias} className="rounded bg-red-500/10 px-1.5 font-mono line-through">
								alias {alias}
							</span>
						))}
					</div>
				)}
				{sub.history && (
					<div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs">
						<p className="flex items-center gap-1.5 font-medium">
							<History className="size-3.5" />
							Round {sub.round}: resubmitted after rejection by @{sub.history.reviewer} ({minutesAgo(sub.history.at)})
						</p>
						<p className="mt-0.5 text-muted-foreground">“{sub.history.reason}”</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							{sub.history.previous.map((entry) => (
								<Swatch key={entry.id} variant={entry} mode={backdrop} className="size-12 rounded border p-1 opacity-70" />
							))}
							<span className="text-muted-foreground">→</span>
							{sub.variants.map((entry) => (
								<Swatch key={entry.id} variant={entry} mode={backdrop} className="size-12 rounded border p-1" />
							))}
							<span className="text-muted-foreground">{sub.history.changes.join(" · ")}</span>
						</div>
					</div>
				)}
				<Hints sub={sub} review={review} onOpen={(id) => setCurrentId(id)} onRejectAsVariant={rejectAsVariant} />
				{!!view.issues.length && <p className="text-xs text-red-600">⚠ {view.issues.join(" · ")}</p>}

				<div className="flex items-center gap-2 text-xs">
					<span className="text-muted-foreground">Background (G)</span>
					{(["intended", "checker"] as Backdrop[]).map((mode) => (
						<button
							type="button"
							key={mode}
							onClick={() => setBackdrop(mode)}
							className={cn("rounded-md border px-2 py-0.5", backdrop === mode && "bg-foreground text-background")}
						>
							{mode === "intended" && "Background it's for"}
							{mode === "checker" && "Checkerboard"}
						</button>
					))}
				</div>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
					{visibleRows.map((row, position) => (
						<VariantTile
							key={`${row.originalKind}-${row.proposed?.id || row.published?.id}`}
							row={row}
							slug={view.slug}
							mode={backdrop}
							number={position + 1}
							selected={selectedTile === position}
							onSelect={() => setSelectedTile(position)}
							review={review}
							submissionId={sub.id}
							update={sub.type === "update"}
						/>
					))}
				</div>
				<MetadataFields key={sub.id} sub={sub} review={review} />
				<label htmlFor="bench-note" className="block text-[11px] text-muted-foreground">
					Note to contributor (C)
					<Textarea
						id="bench-note"
						ref={commentRef}
						rows={2}
						value={review.comments[sub.id] || ""}
						onChange={(event) => review.comment(sub.id, event.target.value)}
						placeholder="Optional, sent with the decision"
						className="mt-0.5 text-xs text-foreground"
					/>
				</label>

				<div className="sticky bottom-0 z-20 mt-auto space-y-2 rounded-xl border bg-background p-3 shadow-lg">
					{picker && <ReasonPicker hint={variantHint} onPick={rejectWith} />}
					<FinalToggle review={review} id={sub.id} />
					<div className="flex flex-wrap gap-2">
						<Button
							className="flex-1"
							onClick={() => {
								review.approve(sub.id)
								go(1)
							}}
						>
							<Check className="size-4" />
							Approve & next <kbd className="text-xs opacity-70">P</kbd>
						</Button>
						<Button variant="outline" className="flex-1" onClick={() => setPicker(!picker)}>
							<X className="size-4" />
							Reject <kbd className="text-xs opacity-60">X</kbd>
						</Button>
						<Button variant="ghost" onClick={() => commentRef.current?.focus()}>
							<MessageSquare className="size-4" />
							<kbd className="text-xs opacity-60">C</kbd>
						</Button>
						<Button variant="ghost" disabled={!decision} onClick={() => review.unflag(sub.id)}>
							<RotateCcw className="size-4" />
							<kbd className="text-xs opacity-60">U</kbd>
						</Button>
					</div>
					<p className="text-center text-[11px] text-muted-foreground">
						J/K next/prev · P approve · X reject → 1–9 reason · F final · V reject as variant · C note · U unflag · E rename · 1–9 tile · D
						drop tile · G background · ←/→ prototype
					</p>
				</div>
			</main>

			<aside aria-label="Staged decisions" className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
				<div className="border-b p-3">
					<Button className="w-full" disabled={!staged.length} onClick={onSubmit}>
						<Send className="size-4" />
						Submit review · {staged.length}
					</Button>
					<p className="mt-2 text-[11px] text-muted-foreground">
						Approval doesn't publish. {review.payload.publishQueue.length} files will wait in the publish queue.
					</p>
				</div>
				<ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 text-xs">
					{!staged.length && <li className="p-2 text-muted-foreground">Decisions you stage appear here.</li>}
					{staged.map((item) => {
						const staged = review.decisions[item.id]
						const lines = review.fixupLines(item)
						return (
							<li key={item.id} className="rounded-md border p-2">
								<div className="flex items-center gap-1.5">
									<button type="button" className="min-w-0 flex-1 truncate text-left font-mono" onClick={() => setCurrentId(item.id)}>
										{review.effective(item).slug}
									</button>
									<DecisionBadge decision={staged} className="px-1 py-0 text-[10px]" />
									<button type="button" aria-label="Unflag" onClick={() => review.unflag(item.id)}>
										<Undo2 className="size-3" />
									</button>
								</div>
								{staged?.outcome === "reject" && <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{staged.reason}</p>}
								{staged?.outcome === "approve" && !!lines.length && (
									<p className="mt-0.5 text-[10px] text-blue-600">
										{lines.length} fix-up{lines.length > 1 && "s"}: {lines.join("; ")}
									</p>
								)}
							</li>
						)
					})}
				</ul>
			</aside>
		</div>
	)
}
