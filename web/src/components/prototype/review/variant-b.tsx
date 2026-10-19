// PROTOTYPE (throwaway): Variant B "Icon bench" — flattened keyboard-first queue where each Icon is the unit (grouped by Submission chip), a form × tone variant matrix, per-Variant drop/retag and a live changeset rail.
"use client"
import { AlertTriangle, Check, GitMerge, History, Pencil, RotateCcw, Send, Trash2, Undo2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { blocking, collisions, fileName, type IconVariant, reasons, siblingClusters, type Tone, tones, variantKind } from "./mock"
import { type Backdrop, describeFixup, KindBadge, minutesAgo, OutcomeBadge, Swatch } from "./shared"
import type { Outcome, Review } from "./state"

const toneLabels: Record<Tone, string> = { colour: "Colour · any background", light: "Light · for dark bg", dark: "Dark · for light bg" }
const backdrops: Backdrop[] = ["intended", "checker", "light", "dark"]
const kindOptions: { form: string; tone: Tone }[] = [
	{ form: "icon", tone: "colour" },
	{ form: "icon", tone: "light" },
	{ form: "icon", tone: "dark" },
	{ form: "wordmark", tone: "colour" },
	{ form: "wordmark", tone: "light" },
	{ form: "wordmark", tone: "dark" },
	{ form: "animated", tone: "colour" },
	{ form: "animated", tone: "dark" },
]

export function VariantB({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const queue = useMemo(() => review.subs.flatMap((sub) => sub.icons.map((icon, position) => ({ sub, icon, position }))), [review.subs])
	const [currentId, setCurrentId] = useState(queue[0]?.icon.id || "")
	const [picker, setPicker] = useState<Exclude<Outcome, "approve"> | null>(null)
	const [selectedVariant, setSelectedVariant] = useState(0)
	const [backdrop, setBackdrop] = useState<Backdrop>("intended")
	const [editing, setEditing] = useState(false)
	const [draftSlug, setDraftSlug] = useState("")
	const slugInput = useRef<HTMLInputElement>(null)
	const index = Math.max(
		0,
		queue.findIndex((entry) => entry.icon.id === currentId),
	)
	const current = queue[index]
	const cluster = current && siblingClusters(review.subs).find((entry) => entry.ids.includes(current.sub.id))
	const clash = current && collisions(review.subs).find((entry) => entry.slug === current.icon.slug)
	const variant: IconVariant | undefined = current?.icon.variants[selectedVariant]

	const move = useCallback(
		(direction: number) => {
			const next = queue[Math.min(queue.length - 1, Math.max(0, index + direction))]
			if (next) setCurrentId(next.icon.id)
			setSelectedVariant(0)
			setPicker(null)
		},
		[queue, index],
	)
	const decide = useCallback(
		(outcome: Outcome, reason?: string) => {
			if (!current) return
			review.decideIcon(current.icon.id, outcome, reason)
			setPicker(null)
			move(1)
		},
		[current, review, move],
	)
	const approveRest = useCallback(() => {
		if (!current) return
		for (const entry of current.sub.icons.slice(current.position)) {
			if (review.iconDecisions[entry.id]) continue
			if (entry.variants.some(blocking)) review.decideIcon(entry.id, "changes", reasons[2].text)
			else review.decideIcon(entry.id, "approve")
		}
		const after = queue.find((entry, position) => position > index && entry.sub.id !== current.sub.id)
		if (after) setCurrentId(after.icon.id)
	}, [current, review, queue, index])
	const mergeCluster = useCallback(() => {
		if (!cluster) return
		const merged = review.merge(cluster.ids)
		if (merged) setCurrentId(`ic-merged-${cluster.root}`)
	}, [cluster, review])

	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (target.closest("input,textarea,select,[role=dialog]")) return
			const key = event.key.toLowerCase()
			if (picker && /^[1-8]$/.test(key)) {
				event.preventDefault()
				decide(picker, reasons[Number(key) - 1].text)
				return
			}
			if (key === "escape") setPicker(null)
			if (/^[1-9]$/.test(key)) setSelectedVariant(Number(key) - 1)
			if (key === "j") move(1)
			if (key === "k") move(-1)
			if (key === "p" && event.shiftKey) approveRest()
			if (key === "p" && !event.shiftKey) decide("approve")
			if (key === "r") setPicker("changes")
			if (key === "x") setPicker("reject")
			if (key === "u" && current) review.decideIcon(current.icon.id, null)
			if (key === "d" && variant) review.toggleDrop(variant.id)
			if (key === "m") mergeCluster()
			if (key === "s" && current) review.split(current.icon.id)
			if (key === "g") setBackdrop((value) => backdrops[(backdrops.indexOf(value) + 1) % backdrops.length])
			if (key === "e" && current) {
				event.preventDefault()
				setDraftSlug(current.icon.slug)
				setEditing(true)
				requestAnimationFrame(() => slugInput.current?.select())
			}
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [picker, decide, move, approveRest, current, review, variant, mergeCluster])

	if (!current) return <p className="p-8 text-sm text-muted-foreground">Queue empty.</p>
	const decision = review.decision(current.icon.id)
	const forms = [...new Set(["icon", ...current.icon.variants.map((entry) => entry.form)])]
	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
			<aside
				aria-label="Icon queue"
				className="flex max-h-56 min-h-0 flex-col overflow-hidden rounded-xl border bg-background lg:max-h-none"
			>
				<p className="border-b px-3 py-2 text-xs text-muted-foreground">
					{queue.length} icons · {review.decidedIcons} decided
				</p>
				<div className="min-h-0 flex-1 overflow-y-auto p-1.5">
					{review.subs.map((sub) => (
						<div key={sub.id} className="mb-1.5">
							<p className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-medium text-muted-foreground">
								<span className="rounded bg-muted px-1">@{sub.contributor}</span>
								<span className="truncate font-mono">{sub.id}</span>
							</p>
							{sub.icons.map((entry) => {
								const outcome = review.decision(entry.id)?.outcome
								return (
									<button
										type="button"
										key={entry.id}
										onClick={() => {
											setCurrentId(entry.id)
											setSelectedVariant(0)
										}}
										className={cn(
											"flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted",
											entry.id === current.icon.id && "bg-primary/10 ring-1 ring-primary/30",
										)}
									>
										<Swatch variant={entry.variants[0]} className="size-6 shrink-0 rounded border p-0.5" />
										<span className="min-w-0 flex-1 truncate font-mono">{entry.slug}</span>
										{outcome === "approve" && <Check className="size-3.5 text-emerald-600" />}
										{outcome === "changes" && <RotateCcw className="size-3.5 text-amber-600" />}
										{outcome === "reject" && <X className="size-3.5 text-red-600" />}
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
						Icon {index + 1} of {queue.length}
					</span>
					<span className="rounded-full border bg-background px-2 py-0.5">
						@{current.sub.contributor} · {current.sub.id} · {current.position + 1}/{current.sub.icons.length}
					</span>
					<span>{minutesAgo(current.sub.created)}</span>
					{decision && <OutcomeBadge outcome={decision.outcome} />}
				</div>
				<div className="flex flex-wrap items-end gap-3">
					{editing && (
						<form
							onSubmit={(event) => {
								event.preventDefault()
								review.rename(current.icon.id, draftSlug)
								setEditing(false)
							}}
						>
							<input
								ref={slugInput}
								aria-label="Slug"
								value={draftSlug}
								onChange={(event) => setDraftSlug(event.target.value)}
								onBlur={() => setEditing(false)}
								onKeyDown={(event) => {
									if (event.key === "Escape") setEditing(false)
								}}
								className="rounded-md border bg-background px-2 font-mono text-2xl font-semibold"
							/>
						</form>
					)}
					{!editing && (
						<h2 className="break-all font-mono text-2xl font-semibold sm:text-3xl">
							{current.icon.slug}
							<button
								type="button"
								aria-label="Rename slug"
								className="ml-2 align-middle text-muted-foreground"
								onClick={() => {
									setDraftSlug(current.icon.slug)
									setEditing(true)
								}}
							>
								<Pencil className="size-4" />
							</button>
						</h2>
					)}
					<span className="pb-1 text-xs text-muted-foreground">
						{current.icon.mode === "update" && `Update to collection icon ${current.icon.target?.slug} · `}
						{current.icon.mode === "new" && "New icon · "}
						{current.icon.categories.join(", ") || "no categories"}
						{!!current.icon.aliases.length && ` · aka ${current.icon.aliases.join(", ")}`}
					</span>
				</div>

				{cluster && (
					<div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs">
						<GitMerge className="size-4 text-amber-600" />
						<span className="flex-1">
							{cluster.ids.length - 1} other pending submissions from @{cluster.contributor} share the prefix{" "}
							<span className="font-mono">{cluster.root}</span> (within {cluster.spanMinutes} min).
						</span>
						<Button size="sm" className="h-7 text-xs" onClick={mergeCluster}>
							Merge into one submission <kbd className="ml-1 opacity-70">M</kbd>
						</Button>
					</div>
				)}
				{clash && (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs">
						<AlertTriangle className="size-4 text-amber-600" />
						<span className="flex-1">
							Slug also pending in{" "}
							{clash.entries
								.filter((entry) => entry.submissionId !== current.sub.id)
								.map((entry) => `@${entry.contributor}'s submission (${minutesAgo(entry.created)})`)
								.join(", ")}
							. Rename (E) or decide which one wins.
						</span>
					</div>
				)}
				{current.sub.history && (
					<div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs">
						<p className="flex items-center gap-1.5 font-medium">
							<History className="size-3.5" />
							Resubmitted after changes requested by @{current.sub.history.reviewer}: {current.sub.history.changes.join(" · ")}
						</p>
						<p className="mt-0.5 text-muted-foreground">“{current.sub.history.feedback}”</p>
					</div>
				)}

				<div className="flex items-center gap-2 text-xs">
					<span className="text-muted-foreground">Background (G)</span>
					{backdrops.map((mode) => (
						<button
							type="button"
							key={mode}
							onClick={() => setBackdrop(mode)}
							className={cn("rounded-md border px-2 py-0.5", backdrop === mode && "bg-foreground text-background")}
						>
							{mode}
						</button>
					))}
				</div>
				<div className="overflow-x-auto rounded-xl border bg-background">
					<table className="w-full min-w-[560px] border-collapse text-xs">
						<thead>
							<tr className="border-b text-left text-muted-foreground">
								<th className="w-24 px-3 py-2 font-medium">Form</th>
								{tones.map((tone) => (
									<th key={tone} className="px-2 py-2 font-medium">
										{toneLabels[tone]}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{forms.map((form) => (
								<tr key={form} className="border-b last:border-0">
									<th className="px-3 py-2 text-left align-top font-mono font-medium">
										{form === "icon" && "icon"}
										{form !== "icon" && form}
										{form !== "icon" && form !== "wordmark" && (
											<span className="block text-[10px] font-normal text-violet-600">custom</span>
										)}
									</th>
									{tones.map((tone) => {
										const cell = current.icon.variants.find((entry) => entry.form === form && entry.tone === tone)
										const published = current.icon.target?.published.find((entry) => entry.form === form && entry.tone === tone)
										if (!cell)
											return (
												<td key={tone} className="p-2">
													<div className="flex h-28 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground">
														{published && "published, unchanged"}
														{!published && "—"}
													</div>
												</td>
											)
										const number = current.icon.variants.indexOf(cell) + 1
										const drop = review.dropped[cell.id]
										return (
											<td key={tone} className="p-2 align-top">
												<button
													type="button"
													onClick={() => setSelectedVariant(number - 1)}
													className={cn(
														"relative block w-full overflow-hidden rounded-lg border text-left",
														selectedVariant === number - 1 && "ring-2 ring-primary",
														drop && "opacity-40",
													)}
												>
													<span className="absolute left-1.5 top-1.5 z-10 rounded bg-background/90 px-1 font-mono text-[10px]">
														{number}
													</span>
													<span className="flex h-28">
														{published && <Swatch variant={published} mode={backdrop} className="w-1/3 border-r p-2 opacity-70" />}
														<Swatch variant={cell} mode={backdrop} className="flex-1 p-3" />
													</span>
													{published && (
														<span className="flex border-t text-[9px] uppercase tracking-wider text-muted-foreground">
															<span className="w-1/3 border-r px-1.5">now</span>
															<span className="px-1.5">proposed</span>
														</span>
													)}
												</button>
												<div className="mt-1 flex items-center gap-1">
													<select
														aria-label="Retag variant"
														value={`${cell.form}:${cell.tone}`}
														onChange={(event) => {
															const [nextForm, nextTone] = event.target.value.split(":")
															review.retag(cell.id, nextForm, nextTone as Tone)
														}}
														className="h-6 min-w-0 flex-1 rounded border bg-background font-mono text-[10px]"
													>
														{kindOptions.map((option) => (
															<option key={`${option.form}:${option.tone}`} value={`${option.form}:${option.tone}`}>
																{variantKind(option)}
															</option>
														))}
													</select>
													<button type="button" aria-label="Drop variant" onClick={() => review.toggleDrop(cell.id)} className="p-0.5">
														{drop && <Undo2 className="size-3.5" />}
														{!drop && <Trash2 className="size-3.5" />}
													</button>
												</div>
												<p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground" title={drop}>
													{fileName(current.icon.slug, cell)}
												</p>
												{cell.asset.checks.map((check) => (
													<p key={check.id} className={cn("text-[10px]", check.severity === "block" && "text-red-600")}>
														⚠ {check.label}
													</p>
												))}
											</td>
										)
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{!current.icon.variants.some((entry) => entry.form === "icon" && entry.tone === "colour" && !review.dropped[entry.id]) && (
					<p className="text-xs text-red-600">This icon has no Base variant. Retag one or request changes.</p>
				)}

				<div className="sticky bottom-0 z-20 mt-auto space-y-2 rounded-xl border bg-background p-3 shadow-lg">
					{picker && (
						<div className="grid gap-1 sm:grid-cols-2">
							{reasons.map((reason, position) => (
								<button
									type="button"
									key={reason.text}
									onClick={() => decide(picker, reason.text)}
									className={cn(
										"rounded border px-2 py-1.5 text-left text-xs hover:bg-muted",
										reason.outcome !== picker && "text-muted-foreground",
									)}
								>
									<kbd className="mr-1.5 font-mono">{position + 1}</kbd>
									{reason.text}
								</button>
							))}
						</div>
					)}
					<div className="flex flex-wrap gap-2">
						<Button className="flex-1" onClick={() => decide("approve")}>
							<Check className="size-4" />
							Approve icon <kbd className="text-xs opacity-70">P</kbd>
						</Button>
						<Button variant="outline" className="flex-1" onClick={() => setPicker("changes")}>
							<RotateCcw className="size-4" />
							Request changes <kbd className="text-xs opacity-60">R</kbd>
						</Button>
						<Button variant="outline" className="flex-1" onClick={() => setPicker("reject")}>
							<X className="size-4" />
							Reject <kbd className="text-xs opacity-60">X</kbd>
						</Button>
						{current.sub.icons.length > 1 && (
							<Button variant="secondary" className="flex-1" onClick={approveRest}>
								Approve rest of submission ({current.sub.icons.length - current.position}), flagged → changes{" "}
								<kbd className="text-xs opacity-60">⇧P</kbd>
							</Button>
						)}
					</div>
					<p className="text-center text-[11px] text-muted-foreground">
						J/K icon · 1–9 variant · D drop · E rename · M merge siblings · S split out · G background · 1–8 reason · U undo · ←/→ prototype
					</p>
				</div>
			</main>

			<aside aria-label="Changeset" className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
				<div className="border-b p-3">
					<Button className="w-full" disabled={!review.payload.submissions.length} onClick={onSubmit}>
						<Send className="size-4" />
						Submit review · {review.payload.submissions.length}
					</Button>
					<p className="mt-2 text-[11px] text-muted-foreground">
						{review.payload.publishQueue.length} files will join the publish queue after submit.
					</p>
				</div>
				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
					{review.payload.submissions.map((sub) => (
						<div key={sub.id}>
							<p className="mb-1 font-medium">
								@{sub.contributor} <span className="font-mono text-muted-foreground">{sub.id}</span>
							</p>
							{sub.icons
								.filter((entry) => entry.outcome !== "undecided" || entry.variants.some((variant) => !variant.keep))
								.map((entry) => (
									<div key={entry.slug} className="flex items-center gap-1.5 py-0.5">
										<span className="min-w-0 flex-1 truncate font-mono">{entry.slug}</span>
										<OutcomeBadge outcome={entry.outcome} className="px-1 py-0 text-[10px]" />
									</div>
								))}
							{sub.status === "closed_merged" && <p className="text-muted-foreground">{sub.message}</p>}
						</div>
					))}
					{!!review.fixups.length && (
						<div>
							<p className="mb-1 font-medium">Fix-ups</p>
							{review.fixups.map((fix, position) => (
								<div key={position} className="flex items-start gap-1 py-0.5 font-mono text-[10px]">
									<span className="flex-1">{describeFixup(fix)}</span>
									<button type="button" aria-label="Undo fix-up" onClick={() => review.undoFixup(position)}>
										<Undo2 className="size-3" />
									</button>
								</div>
							))}
						</div>
					)}
					{!review.payload.submissions.length && <p className="text-muted-foreground">Decisions you stage appear here.</p>}
				</div>
				{variant && (
					<div className="flex items-center gap-2 border-t p-3 text-[11px]">
						<span className="text-muted-foreground">Selected</span>
						<KindBadge variant={variant} />
						<span className="truncate font-mono">{fileName(current.icon.slug, variant)}</span>
					</div>
				)}
			</aside>
		</div>
	)
}
