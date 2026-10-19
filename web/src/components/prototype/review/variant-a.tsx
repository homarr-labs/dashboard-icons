// PROTOTYPE (throwaway): pass 3 reference design "Review bench": queue grouped by "sent together", variant tiles on their intended backgrounds, inline fix-ups, staged decisions; every rejection invites a resubmission.
"use client"
import { Check, ChevronDown, History, MessageSquare, RotateCcw, Send, Undo2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { type Hint, hints, reasons, rows, type Submission } from "./mock"
import {
	type Backdrop,
	batches,
	DecisionBadge,
	focusRing,
	Hints,
	MetadataFields,
	minutesAgo,
	plural,
	ReasonPicker,
	RoundDiff,
	reasonFor,
	Swatch,
	VariantTile,
} from "./shared"
import type { Review } from "./state"

const legend: [string[], string][] = [
	[["J", "K"], "next, previous"],
	[["P"], "approve"],
	[["X"], "reject, X again for no reason"],
	[["1", "9"], "reason after X, else select tile"],
	[["V"], "reject as variant"],
	[["D"], "drop tile"],
	[["E"], "rename"],
	[["C"], "note"],
	[["U"], "unstage"],
	[["G"], "background"],
]
export function VariantA({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const groups = useMemo(() => batches(review.subs), [review.subs])
	const order = useMemo(() => groups.flatMap((group) => group.subs), [groups])
	const [currentId, setCurrentId] = useState(order[0]?.id || "")
	const [picker, setPicker] = useState(false)
	const [selectedTile, setSelectedTile] = useState(0)
	const [backdrop, setBackdrop] = useState<Backdrop>("intended")
	const commentRef = useRef<HTMLTextAreaElement>(null)
	const mainRef = useRef<HTMLElement>(null)
	const index = Math.max(
		0,
		order.findIndex((sub) => sub.id === currentId),
	)
	const sub = order[index]
	const view = review.effective(sub)
	const group = groups.find((entry) => entry.subs.includes(sub))
	const variantHint = hints(sub, review.subs).find((hint) => hint.type === "variant-of")
	const decision = review.decisions[sub.id]
	const staged = order.filter((entry) => review.decisions[entry.id])

	const open = useCallback((id: string) => {
		setCurrentId(id)
		setSelectedTile(0)
		setPicker(false)
		mainRef.current?.scrollTo({ top: 0 })
	}, [])
	const go = useCallback(
		(direction: number) => {
			const next = order[Math.min(order.length - 1, Math.max(0, index + direction))]
			open(next.id)
		},
		[order, index, open],
	)
	const rejectWith = useCallback(
		(text?: string) => {
			review.reject(sub.id, text)
			go(1)
		},
		[review, sub.id, go],
	)
	const rejectAsVariant = useCallback(
		(hint: Hint) => {
			const reason = reasons.find((entry) => entry.key === "variant-of")
			if (reason) rejectWith(reasonFor(reason, hint))
		},
		[rejectWith],
	)
	const approve = useCallback(() => {
		review.approve(sub.id)
		go(1)
	}, [review, sub.id, go])

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
				rejectWith(reasonFor(reasons[Number(key) - 1], variantHint))
				return
			}
			if (key === "x") {
				event.preventDefault()
				if (picker) rejectWith()
				else setPicker(true)
				return
			}
			if (key === "escape") setPicker(false)
			if (/^[1-9]$/.test(key)) setSelectedTile(Number(key) - 1)
			if (key === "j") go(1)
			if (key === "k") go(-1)
			if (key === "p") approve()
			if (key === "v" && variantHint) rejectAsVariant(variantHint)
			if (key === "u") review.unflag(sub.id)
			if (key === "g") setBackdrop((mode) => (mode === "intended" ? "checker" : "intended"))
			if (key === "d") {
				const row = view.rows[selectedTile]
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
	}, [picker, rejectWith, variantHint, go, approve, review, sub.id, rejectAsVariant, view.rows, selectedTile])

	const queue = (
		<div className="space-y-2 p-2">
			{groups.map((entry) => (
				<div key={entry.key} className={cn(entry.subs.length > 1 && "rounded-lg bg-muted/50 p-1")}>
					{entry.subs.length > 1 && (
						<p className="min-w-0 px-2 pb-1 pt-1.5 text-xs text-muted-foreground">
							<span className="block font-medium text-foreground/80">Sent together · {entry.subs.length}</span>
							<span className="block truncate">
								@{entry.contributor} · {minutesAgo(entry.created)}
							</span>
						</p>
					)}
					<ul className="space-y-0.5">
						{entry.subs.map((item) => (
							<QueueRow
								key={item.id}
								item={item}
								review={review}
								active={item.id === sub.id}
								showContributor={entry.subs.length === 1}
								onOpen={open}
							/>
						))}
					</ul>
				</div>
			))}
		</div>
	)

	return (
		<div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_272px] 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
			<aside
				aria-label="Review queue"
				className="min-w-0 rounded-xl border bg-background lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden"
			>
				<div className="hidden items-center justify-between gap-2 border-b px-3 py-2.5 text-sm lg:flex">
					<span className="font-medium">Queue</span>
					<span className="text-xs text-muted-foreground">
						{order.length} waiting · {staged.length} staged
					</span>
				</div>
				<div className="hidden min-h-0 flex-1 overflow-y-auto overscroll-contain lg:block">{queue}</div>
				<details className="group lg:hidden">
					<summary
						className={cn(
							"flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm [&::-webkit-details-marker]:hidden",
							focusRing,
						)}
					>
						<span className="font-medium">Queue</span>
						<span className="min-w-0 flex-1 truncate text-muted-foreground">
							{index + 1} of {order.length} · {staged.length} staged
						</span>
						<ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
					</summary>
					<div className="max-h-[50dvh] overflow-y-auto overscroll-contain border-t">{queue}</div>
				</details>
			</aside>

			<main ref={mainRef} aria-label="Submission" className="flex min-w-0 flex-col gap-6 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
				<header className="space-y-2">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
						<span className="tabular-nums">
							{index + 1} of {order.length}
						</span>
						<span aria-hidden>·</span>
						<span className="min-w-0 max-w-full truncate">@{sub.contributor}</span>
						{group && group.subs.length > 1 && (
							<>
								<span aria-hidden>·</span>
								<span>sent with {group.subs.length - 1} others</span>
							</>
						)}
						<span aria-hidden>·</span>
						<span>{minutesAgo(sub.created)}</span>
						<DecisionBadge decision={decision} round={sub.round} className="ml-auto" />
					</div>
					<h2 className="font-mono text-2xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
						{view.slug}
					</h2>
					<p className="text-sm text-muted-foreground">
						{sub.type === "update" && `Update proposal for the published ${sub.slug} icon`}
						{sub.type === "new" && "New icon"}
						{view.slug !== sub.slug && <span className="text-blue-700 dark:text-blue-300"> · renamed from {sub.slug}</span>}
					</p>
					{sub.note && <p className="max-w-prose text-pretty text-sm leading-relaxed">“{sub.note}”</p>}
				</header>

				{sub.history && (
					<section
						aria-label="Changes since the rejected round"
						className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4"
					>
						<div className="flex items-start gap-2">
							<History className="mt-0.5 size-4 shrink-0 text-violet-700 dark:text-violet-300" />
							<div className="min-w-0 space-y-1">
								<h3 className="text-sm font-semibold">Resubmitted after changes were requested (round {sub.round})</h3>
								<p className="text-sm text-muted-foreground">
									Round {sub.history.round} was rejected by @{sub.history.reviewer} {minutesAgo(sub.history.at)}
									{sub.history.reason && `: “${sub.history.reason}”`}
								</p>
							</div>
						</div>
						<RoundDiff previous={sub.history.previous} current={sub.variants} mode={backdrop} />
					</section>
				)}

				{sub.delta && (
					<ul aria-label="Proposed changes" className="flex flex-wrap gap-1.5 text-xs">
						{sub.delta.add.map((entry) => (
							<li key={entry.id} className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-800 dark:text-emerald-300">
								Adds {entry.kind}
							</li>
						))}
						{sub.delta.replace.map((entry) => (
							<li key={entry.id} className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-900 dark:text-amber-300">
								Replaces {entry.kind}
							</li>
						))}
						{sub.delta.remove.map((kind) => (
							<li key={kind} className="rounded-md bg-red-500/10 px-2 py-1 text-red-800 dark:text-red-300">
								Removes {kind}
							</li>
						))}
						{sub.delta.aliases.add.map((alias) => (
							<li key={alias} className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-emerald-800 dark:text-emerald-300">
								+ alias {alias}
							</li>
						))}
						{sub.delta.aliases.remove.map((alias) => (
							<li key={alias} className="rounded-md bg-red-500/10 px-2 py-1 font-mono text-red-800 dark:text-red-300">
								− alias {alias}
							</li>
						))}
					</ul>
				)}

				<Hints sub={sub} review={review} onOpen={open} onRejectAsVariant={rejectAsVariant} />
				{!!view.issues.length && (
					<output className="block rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-800 dark:text-red-300">
						{view.issues.join(". ")}.
					</output>
				)}

				<section aria-labelledby="bench-variants" className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 id="bench-variants" className="text-sm font-semibold">
							Variants <span className="font-normal text-muted-foreground">({view.rows.length})</span>
						</h3>
						<fieldset className="inline-flex rounded-lg border bg-muted/40 p-0.5" aria-label="Preview background">
							{(["intended", "checker"] as Backdrop[]).map((mode) => (
								<button
									type="button"
									key={mode}
									aria-pressed={backdrop === mode}
									onClick={() => setBackdrop(mode)}
									className={cn(
										"h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground pointer-coarse:h-10",
										backdrop === mode && "bg-background text-foreground shadow-sm",
										focusRing,
									)}
								>
									{mode === "intended" && "Intended background"}
									{mode === "checker" && "Checkerboard"}
								</button>
							))}
						</fieldset>
					</div>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-3">
						{view.rows.map((row, position) => (
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
				</section>

				<section aria-label="Details and fix-ups" className="space-y-4">
					<MetadataFields key={sub.id} sub={sub} review={review} />
					<div className="space-y-1.5">
						<label htmlFor="bench-note" className="text-xs font-medium text-muted-foreground">
							Note to the contributor (optional)
						</label>
						<Textarea
							id="bench-note"
							ref={commentRef}
							rows={2}
							value={review.comments[sub.id] || ""}
							onChange={(event) => review.comment(sub.id, event.target.value)}
							placeholder="Sent with your decision"
							className="text-sm"
						/>
					</div>
				</section>

				<div className="sticky bottom-0 z-20 mt-auto -mx-px space-y-3 rounded-xl border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.25)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
					{picker && (
						<div className="space-y-2">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold">Reject and ask for a resubmission</p>
									<p className="text-xs text-muted-foreground">
										Pick a reason, or reject without one. The contributor can fix this submission and send it back.
									</p>
								</div>
								<Button size="sm" variant="ghost" className="h-8 hover:scale-100 pointer-coarse:h-11" onClick={() => setPicker(false)}>
									Cancel <kbd className="hidden font-mono text-[11px] text-muted-foreground lg:inline">Esc</kbd>
								</Button>
							</div>
							<div className="max-h-[40dvh] overflow-y-auto overscroll-contain pr-1">
								<ReasonPicker hint={variantHint} onPick={rejectWith} />
							</div>
							<Button variant="outline" className="w-full hover:scale-100 pointer-coarse:h-11" onClick={() => rejectWith()}>
								Reject without a reason <kbd className="hidden font-mono text-[11px] text-muted-foreground lg:inline">X</kbd>
							</Button>
						</div>
					)}
					<div className="flex flex-wrap gap-2">
						<Button className="min-w-32 flex-1 hover:scale-100 pointer-coarse:h-11" onClick={approve}>
							<Check className="size-4" />
							Approve
							<kbd className="hidden rounded bg-primary-foreground/15 px-1 font-mono text-[11px] lg:inline">P</kbd>
						</Button>
						<Button
							variant="outline"
							aria-expanded={picker}
							className="min-w-32 flex-1 hover:scale-100 pointer-coarse:h-11"
							onClick={() => setPicker(!picker)}
						>
							<X className="size-4" />
							Reject
							<kbd className="hidden rounded border px-1 font-mono text-[11px] text-muted-foreground lg:inline">X</kbd>
						</Button>
						<div className="flex gap-2 max-xl:w-full">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Write a note"
								className="hover:scale-100 pointer-coarse:size-11"
								onClick={() => commentRef.current?.focus()}
							>
								<MessageSquare className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Unstage this decision"
								disabled={!decision}
								className="hover:scale-100 pointer-coarse:size-11"
								onClick={() => review.unflag(sub.id)}
							>
								<RotateCcw className="size-4" />
							</Button>
							<Button
								variant="secondary"
								disabled={!staged.length}
								className="flex-1 hover:scale-100 pointer-coarse:h-11 xl:hidden"
								onClick={onSubmit}
							>
								<Send className="size-4" />
								Submit review · {staged.length}
							</Button>
						</div>
					</div>
					<ShortcutLegend className="hidden lg:flex xl:hidden" />
				</div>
			</main>

			<aside aria-label="Staged decisions" className="hidden min-h-0 flex-col overflow-hidden rounded-xl border bg-background xl:flex">
				<div className="space-y-2 border-b p-3">
					<Button className="w-full hover:scale-100" disabled={!staged.length} onClick={onSubmit}>
						<Send className="size-4" />
						Submit review · {staged.length}
					</Button>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Approving does not publish. {plural(review.payload.publishQueue.length, "file")} will wait in the publish queue.
					</p>
				</div>
				<ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2">
					{!staged.length && (
						<li className="p-3 text-sm text-muted-foreground">
							Approve with P or reject with X. Decisions collect here until you submit them together.
						</li>
					)}
					{staged.map((item) => {
						const entry = review.decisions[item.id]
						const lines = review.fixupLines(item)
						const slug = review.effective(item).slug
						return (
							<li key={item.id} className="rounded-lg border p-2">
								<div className="flex min-w-0 items-center gap-1.5">
									<button
										type="button"
										title={slug}
										className={cn("min-w-0 flex-1 truncate rounded text-left font-mono text-sm hover:underline", focusRing)}
										onClick={() => open(item.id)}
									>
										{slug}
									</button>
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Unstage ${slug}`}
										className="size-7 hover:scale-100"
										onClick={() => review.unflag(item.id)}
									>
										<Undo2 className="size-3.5" />
									</Button>
								</div>
								<div className="mt-1 space-y-1">
									<DecisionBadge decision={entry} />
									{entry?.outcome === "reject" && (
										<p className="line-clamp-3 text-xs text-muted-foreground">{entry.reason || "No reason, contributor can resubmit."}</p>
									)}
									{entry?.outcome === "approve" && !!lines.length && (
										<p className="line-clamp-3 text-xs text-blue-800 dark:text-blue-300">
											{lines.length} fix-up{lines.length > 1 && "s"}: {lines.join("; ")}
										</p>
									)}
								</div>
							</li>
						)
					})}
				</ul>
				<ShortcutLegend className="flex border-t p-3" />
			</aside>
		</div>
	)
}

function QueueRow({
	item,
	review,
	active,
	showContributor,
	onOpen,
}: {
	item: Submission
	review: Review
	active: boolean
	showContributor: boolean
	onOpen: (id: string) => void
}) {
	const staged = review.decisions[item.id]
	const thumb = rows(item).find((row) => row.proposed)?.proposed
	const slug = review.effective(item).slug
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(item.id)}
				aria-current={active || undefined}
				title={slug}
				className={cn(
					"flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted pointer-coarse:min-h-11",
					active && "bg-primary/10 ring-1 ring-primary/40 hover:bg-primary/10",
					focusRing,
				)}
			>
				{thumb && <Swatch variant={thumb} className="size-7 shrink-0 rounded border p-0.5" />}
				<span className="min-w-0 flex-1">
					<span className="block truncate font-mono text-[13px]">{slug}</span>
					{(showContributor || item.type === "update" || item.round > 1) && (
						<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
							{item.type === "update" && <span className="shrink-0 text-blue-700 dark:text-blue-300">Update</span>}
							{item.round > 1 && <span className="shrink-0 text-violet-700 dark:text-violet-300">Round {item.round}</span>}
							{showContributor && <span className="min-w-0 truncate">@{item.contributor}</span>}
						</span>
					)}
				</span>
				{staged?.outcome === "approve" && <Check aria-label="Approve staged" className="size-4 shrink-0 text-emerald-600" />}
				{staged?.outcome === "reject" && <X aria-label="Reject staged" className="size-4 shrink-0 text-amber-600" />}
			</button>
		</li>
	)
}

function ShortcutLegend({ className }: { className?: string }) {
	return (
		<ul aria-label="Keyboard shortcuts" className={cn("flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
			{legend.map(([keys, label]) => (
				<li key={label} className="flex items-center gap-1">
					{keys.map((key, position) => (
						<span key={key} className="flex items-center gap-1">
							{position > 0 && <span aria-hidden>{label.startsWith("reason") ? "to" : "/"}</span>}
							<kbd className="min-w-5 rounded border bg-muted px-1 text-center font-mono text-[11px] font-medium text-foreground">
								{key}
							</kbd>
						</span>
					))}
					<span>{label}</span>
				</li>
			))}
		</ul>
	)
}
