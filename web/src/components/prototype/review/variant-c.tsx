// PROTOTYPE (throwaway): Variant C "Contact sheet" — every Variant of every pending Icon as one dense, selectable grid; multi-select drives per-Variant actions (approve, drop, retag, request changes, merge, split) from a floating bar.
"use client"
import { Check, GitMerge, RotateCcw, Scissors, Send, Tag, Trash2, Undo2, X } from "lucide-react"
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { blocking, collisions, fileName, reasons, siblingClusters, type Tone, variantKind } from "./mock"
import { type Backdrop, describeFixup, KindBadge, minutesAgo, OutcomeBadge, Swatch } from "./shared"
import type { Outcome, Review } from "./state"

const backdrops: Backdrop[] = ["intended", "checker", "light", "dark"]
const retagOptions: { form: string; tone: Tone }[] = [
	{ form: "icon", tone: "colour" },
	{ form: "icon", tone: "light" },
	{ form: "icon", tone: "dark" },
	{ form: "wordmark", tone: "colour" },
	{ form: "wordmark", tone: "light" },
	{ form: "wordmark", tone: "dark" },
	{ form: "animated", tone: "colour" },
]

export function VariantC({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const [selected, setSelected] = useState<string[]>([])
	const [anchor, setAnchor] = useState<string | null>(null)
	const [backdrop, setBackdrop] = useState<Backdrop>("intended")
	const [flaggedOnly, setFlaggedOnly] = useState(false)
	const [picker, setPicker] = useState<Exclude<Outcome, "approve"> | null>(null)
	const order = useMemo(
		() => review.subs.flatMap((sub) => sub.icons.flatMap((icon) => icon.variants.map((variant) => variant.id))),
		[review.subs],
	)
	const clusters = siblingClusters(review.subs)
	const clashes = collisions(review.subs)
	const selection = useMemo(() => selected.map((id) => review.findVariant(id)).filter((entry) => !!entry), [selected, review])
	const iconIds = useMemo(() => [...new Set(selection.map((entry) => entry.icon.id))], [selection])
	const subIds = [...new Set(selection.map((entry) => entry.sub.id))]

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
	const decide = useCallback(
		(outcome: Outcome, reason?: string) => {
			for (const iconId of iconIds) {
				const files = selection.filter((entry) => entry.icon.id === iconId).map((entry) => fileName(entry.icon.slug, entry.variant))
				const icon = review.findIcon(iconId)?.icon
				let text = reason
				if (reason && icon && files.length < icon.variants.length) text = `${files.join(", ")}: ${reason}`
				review.decideIcon(iconId, outcome, text)
			}
			setPicker(null)
			setSelected([])
		},
		[iconIds, selection, review],
	)
	const drop = useCallback(() => {
		for (const entry of selection) review.toggleDrop(entry.variant.id)
		setSelected([])
	}, [selection, review])

	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (target.closest("input,textarea,select,[role=dialog]")) return
			const key = event.key.toLowerCase()
			if (key === "escape") {
				setSelected([])
				setPicker(null)
			}
			if (!selected.length) return
			if (picker && /^[1-8]$/.test(key)) {
				decide(picker, reasons[Number(key) - 1].text)
				return
			}
			if (key === "a") decide("approve")
			if (key === "d") drop()
			if (key === "r") setPicker("changes")
			if (key === "x") setPicker("reject")
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [selected.length, picker, decide, drop])

	const cleanIds = review.subs.flatMap((sub) =>
		sub.icons.flatMap((icon) => icon.variants.filter((variant) => !blocking(variant)).map((variant) => variant.id)),
	)
	const flaggedIds = review.subs.flatMap((sub) => sub.icons.flatMap((icon) => icon.variants.filter(blocking).map((variant) => variant.id)))

	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
			<aside aria-label="Changeset ledger" className="order-last flex min-h-0 flex-col rounded-xl border bg-background lg:order-first">
				<div className="border-b p-3">
					<h2 className="text-sm font-semibold">Ledger</h2>
					<p className="text-[11px] text-muted-foreground">
						{review.decidedIcons}/{review.totalIcons} icons decided · {Object.keys(review.dropped).length} variants dropped
					</p>
				</div>
				<ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[10px]">
					{review.subs.flatMap((sub) =>
						sub.icons
							.filter((icon) => review.decision(icon.id))
							.map((icon) => (
								<li key={icon.id} className="flex items-center gap-1">
									<span className="min-w-0 flex-1 truncate">{icon.slug}</span>
									<OutcomeBadge outcome={review.decision(icon.id)?.outcome || "undecided"} className="px-1 py-0 text-[9px]" />
								</li>
							)),
					)}
					{review.fixups.map((fix, index) => (
						<li key={`fix-${index}`} className="flex items-start gap-1 text-muted-foreground">
							<span className="flex-1">{describeFixup(fix)}</span>
							<button type="button" aria-label="Undo fix-up" onClick={() => review.undoFixup(index)}>
								<Undo2 className="size-3" />
							</button>
						</li>
					))}
				</ol>
				<div className="space-y-2 border-t p-3">
					<p className="text-[11px] text-muted-foreground">Publish queue after submit: {review.payload.publishQueue.length} files</p>
					<Button className="w-full" size="sm" disabled={!review.payload.submissions.length} onClick={onSubmit}>
						<Send className="size-3.5" />
						Submit review
					</Button>
				</div>
			</aside>

			<div className="flex min-h-0 min-w-0 flex-col gap-2">
				<div className="flex flex-wrap items-center gap-1.5 text-xs">
					{backdrops.map((mode) => (
						<button
							type="button"
							key={mode}
							onClick={() => setBackdrop(mode)}
							className={cn("rounded-md border px-2 py-1", backdrop === mode && "bg-foreground text-background")}
						>
							{mode}
						</button>
					))}
					<label className="ml-2 flex items-center gap-1">
						<input type="checkbox" checked={flaggedOnly} onChange={(event) => setFlaggedOnly(event.target.checked)} />
						Flagged only
					</label>
					<span className="ml-auto flex gap-1">
						<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(cleanIds)}>
							Select all clean ({cleanIds.length})
						</Button>
						<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(flaggedIds)}>
							Select flagged ({flaggedIds.length})
						</Button>
					</span>
				</div>
				<div className="flex min-h-0 flex-1 flex-wrap content-start items-start gap-3 overflow-y-auto pb-40">
					{review.subs.map((sub) => {
						const cluster = clusters.find((entry) => entry.ids[0] === sub.id)
						const icons = sub.icons.filter((icon) => !flaggedOnly || icon.variants.some(blocking))
						if (!icons.length) return null
						return (
							<Fragment key={sub.id}>
								{cluster && (
									<div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 text-xs">
										<GitMerge className="size-3.5 text-amber-600" />
										<span className="flex-1">
											Next {cluster.ids.length} groups: @{cluster.contributor} uploaded {cluster.ids.length} submissions in{" "}
											{cluster.spanMinutes} min sharing <span className="font-mono">{cluster.root}</span>.
										</span>
										<Button size="sm" className="h-6 text-[11px]" onClick={() => review.merge(cluster.ids)}>
											Merge into one
										</Button>
									</div>
								)}
								<section className="space-y-1.5 rounded-lg border bg-background p-2">
									<h3 className="flex max-w-xl flex-wrap items-baseline gap-2 border-b pb-1 text-xs">
										<span className="font-semibold">@{sub.contributor}</span>
										<span className="font-mono text-muted-foreground">{sub.id}</span>
										<span className="text-muted-foreground">{minutesAgo(sub.created)}</span>
										{sub.round > 1 && (
											<span className="rounded bg-blue-500/10 px-1 text-blue-700 dark:text-blue-300">round {sub.round}</span>
										)}
										{sub.mergedFrom && (
											<span className="rounded bg-violet-500/10 px-1 text-violet-700 dark:text-violet-300">
												merged from {sub.mergedFrom.length}
											</span>
										)}
										<span className="max-w-56 truncate text-muted-foreground" title={sub.note}>
											{sub.note}
										</span>
									</h3>
									<div className="flex flex-wrap gap-x-4 gap-y-2">
										{icons.map((icon) => {
											const outcome = review.decision(icon.id)?.outcome || "undecided"
											const clash = clashes.find((entry) => entry.slug === icon.slug)
											return (
												<div key={icon.id} className="flex flex-col gap-1">
													<div className="flex max-w-80 flex-wrap items-center gap-x-2">
														<p className="truncate font-mono text-xs font-medium">{icon.slug}</p>
														<OutcomeBadge outcome={outcome} className="px-1 py-0 text-[10px]" />
														{icon.mode === "update" && <p className="text-[10px] text-blue-600">update proposal</p>}
														{clash && <p className="text-[10px] text-amber-600">slug also pending ({clash.entries.length})</p>}
														{sub.icons.length > 1 && (
															<button
																type="button"
																className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
																onClick={() => review.split(icon.id)}
															>
																<Scissors className="size-2.5" />
																split out
															</button>
														)}
													</div>
													<div className="flex flex-wrap gap-1.5">
														{icon.target?.published.map((variant) => (
															<figure key={variant.id} className="w-20 opacity-70">
																<Swatch variant={variant} mode={backdrop} className="size-20 rounded-md border-2 border-dashed p-3" />
																<figcaption className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
																	published now
																</figcaption>
															</figure>
														))}
														{sub.history?.previous.map((variant) => (
															<figure key={variant.id} className="w-20 opacity-50">
																<Swatch variant={variant} mode={backdrop} className="size-20 rounded-md border-2 border-dashed p-3" />
																<figcaption className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
																	round {sub.history?.round}
																</figcaption>
															</figure>
														))}
														{icon.variants.map((variant) => {
															const isSelected = selected.includes(variant.id)
															const dropped = review.dropped[variant.id]
															return (
																<figure key={variant.id} className="w-20">
																	<button
																		type="button"
																		aria-pressed={isSelected}
																		title={dropped || variant.asset.checks.map((check) => check.label).join(", ")}
																		onClick={(event) => toggle(variant.id, event)}
																		className={cn(
																			"relative block size-20 overflow-hidden rounded-md border",
																			isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
																			blocking(variant) && "border-red-500",
																		)}
																	>
																		<Swatch variant={variant} mode={backdrop} className={cn("size-full p-3", dropped && "opacity-25")} />
																		{blocking(variant) && (
																			<span className="absolute right-0 top-0 rounded-bl bg-red-600 px-1 text-[9px] font-medium text-white">
																				{variant.asset.checks[0].label.split(" ")[0]}
																			</span>
																		)}
																		{dropped && <X className="absolute inset-0 m-auto size-12 text-red-500" />}
																		{isSelected && (
																			<Check className="absolute bottom-1 left-1 size-4 rounded-full bg-primary p-0.5 text-primary-foreground" />
																		)}
																	</button>
																	<figcaption className="mt-0.5 space-y-0.5">
																		<KindBadge variant={variant} />
																		<p className="truncate font-mono text-[9px] text-muted-foreground">{fileName(icon.slug, variant)}</p>
																	</figcaption>
																</figure>
															)
														})}
													</div>
												</div>
											)
										})}
									</div>
								</section>
							</Fragment>
						)
					})}
				</div>
			</div>

			{!!selected.length && (
				<div className="fixed inset-x-3 bottom-16 z-50 mx-auto max-w-3xl space-y-2 rounded-2xl border bg-background p-2 shadow-2xl">
					{picker && (
						<div className="grid gap-1 sm:grid-cols-2">
							{reasons
								.map((reason, index) => ({ ...reason, index }))
								.filter((reason) => reason.outcome === picker)
								.map((reason) => (
									<button
										type="button"
										key={reason.text}
										className="rounded border px-2 py-1 text-left text-[11px] hover:bg-muted"
										onClick={() => decide(picker, reason.text)}
									>
										<kbd className="mr-1 font-mono">{reason.index + 1}</kbd>
										{reason.text}
									</button>
								))}
						</div>
					)}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="px-2 text-xs font-medium">
							{selected.length} variants · {iconIds.length} icons · {subIds.length} submissions
						</span>
						<Button size="sm" className="h-8" onClick={() => decide("approve")}>
							<Check className="size-3.5" />
							Approve icons <kbd className="opacity-60">A</kbd>
						</Button>
						<Button size="sm" variant="outline" className="h-8" onClick={drop}>
							<Trash2 className="size-3.5" />
							Drop <kbd className="opacity-60">D</kbd>
						</Button>
						<Button size="sm" variant="outline" className="h-8" onClick={() => setPicker("changes")}>
							<RotateCcw className="size-3.5" />
							Changes <kbd className="opacity-60">R</kbd>
						</Button>
						<Button size="sm" variant="outline" className="h-8" onClick={() => setPicker("reject")}>
							<X className="size-3.5" />
							Reject <kbd className="opacity-60">X</kbd>
						</Button>
						<label className="flex h-8 items-center gap-1 rounded-md border px-2 text-xs">
							<Tag className="size-3.5" />
							<select
								aria-label="Retag selected variants"
								className="bg-transparent"
								value=""
								onChange={(event) => {
									const [form, tone] = event.target.value.split(":")
									for (const entry of selection) review.retag(entry.variant.id, form, tone as Tone)
									setSelected([])
								}}
							>
								<option value="">Retag as…</option>
								{retagOptions.map((option) => (
									<option key={variantKind(option)} value={`${option.form}:${option.tone}`}>
										{variantKind(option)}
									</option>
								))}
							</select>
						</label>
						{subIds.length > 1 && (
							<Button
								size="sm"
								variant="secondary"
								className="h-8"
								onClick={() => {
									review.merge(subIds)
									setSelected([])
								}}
							>
								<GitMerge className="size-3.5" />
								Merge {subIds.length} submissions
							</Button>
						)}
						<Button size="sm" variant="ghost" className="ml-auto h-8" onClick={() => setSelected([])}>
							Clear · Esc
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
