// PROTOTYPE (throwaway): Variant A "Triage board" — Submission cards move across Incoming → Sent back / Declined / Approved → Publish batch; whole-Submission decisions with per-Icon overrides; sibling clusters merge in place.
"use client"
import { AlertTriangle, ArrowRight, Check, GitMerge, Layers, RotateCcw, Scissors, Send, Trash2, Undo2, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { blocking, collisions, fileName, type MockSubmission, reasons, siblingClusters, smartMerge } from "./mock"
import { DualSwatch, describeFixup, KindBadge, minutesAgo, OutcomeBadge, Swatch } from "./shared"
import type { Outcome, Review } from "./state"

type Column = "incoming" | "changes" | "declined" | "approved"
const columns: { id: Column; title: string; hint: string }[] = [
	{ id: "incoming", title: "Incoming", hint: "Undecided or partly triaged" },
	{ id: "changes", title: "Sent back", hint: "Contributor edits the same submission" },
	{ id: "declined", title: "Declined", hint: "Closed with feedback" },
	{ id: "approved", title: "Approved → publish batch", hint: "Joins the next publish run" },
]

export function VariantA({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const [selectedId, setSelectedId] = useState(review.subs[0]?.id || "")
	const [dismissed, setDismissed] = useState<string[]>([])
	const clusters = siblingClusters(review.subs).filter((cluster) => !dismissed.includes(cluster.root))
	const clustered = new Set(clusters.flatMap((cluster) => cluster.ids))
	const clashes = collisions(review.subs)
	function columnOf(sub: MockSubmission): Column {
		const outcomes = sub.icons.map((entry) => review.decision(entry.id)?.outcome)
		if (outcomes.includes("changes")) return "changes"
		if (outcomes.includes(undefined)) return "incoming"
		if (outcomes.every((outcome) => outcome === "reject")) return "declined"
		return "approved"
	}
	const selected = review.subs.find((sub) => sub.id === selectedId)
	const approvedFiles = review.payload.publishQueue
	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
			<div className="flex min-h-0 min-w-0 flex-col gap-2">
				<div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
					{columns.map((column) => {
						const cards = review.subs.filter((sub) => columnOf(sub) === column.id && !(column.id === "incoming" && clustered.has(sub.id)))
						return (
							<section
								key={column.id}
								className={cn(
									"flex min-h-[320px] w-64 shrink-0 flex-col rounded-xl border bg-muted/20 xl:w-auto xl:min-w-52 xl:flex-1",
									column.id === "approved" && "border-emerald-500/30",
								)}
							>
								<header className="border-b px-3 py-2">
									<h2 className="flex items-center justify-between text-sm font-semibold">
										{column.title}
										<span className="rounded bg-muted px-1.5 text-[10px] tabular-nums">
											{cards.length + (column.id === "incoming" ? clusters.reduce((sum, cluster) => sum + cluster.ids.length, 0) : 0)}
										</span>
									</h2>
									<p className="text-[11px] text-muted-foreground">{column.hint}</p>
								</header>
								<div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
									{column.id === "incoming" &&
										clusters.map((cluster) => {
											const members = review.subs.filter((sub) => cluster.ids.includes(sub.id))
											const preview = smartMerge(members)
											return (
												<div
													key={cluster.root}
													className="relative rounded-lg border border-amber-500/40 bg-background p-3 mb-3 mr-2 shadow-[4px_4px_0_0_rgba(245,158,11,0.25),8px_8px_0_0_rgba(245,158,11,0.12)]"
												>
													<p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
														<Layers className="size-3.5" />
														{cluster.ids.length} uploads · @{cluster.contributor} · {cluster.spanMinutes} min
													</p>
													<p className="mt-1 text-[11px] text-muted-foreground">
														Same prefix <span className="font-mono">{cluster.root}</span>. Looks like one submission:
													</p>
													<div className="mt-2 flex flex-wrap gap-1">
														{members.map((sub) => (
															<Swatch key={sub.id} variant={sub.icons[0].variants[0]} className="size-8 rounded border p-1" />
														))}
													</div>
													<ul className="mt-2 space-y-1 text-[11px]">
														{preview.merged.icons.map((entry) => (
															<li key={entry.slug} className="flex flex-wrap items-center gap-1">
																<span className="font-mono font-medium">{entry.slug}</span>
																{entry.variants.map((variant) => (
																	<KindBadge
																		key={variant.id}
																		variant={variant}
																		className={cn(preview.drops[variant.id] && "line-through opacity-50")}
																	/>
																))}
															</li>
														))}
													</ul>
													<div className="mt-3 flex gap-1">
														<Button
															size="sm"
															className="h-7 flex-1 text-xs"
															onClick={() => {
																const id = review.merge(cluster.ids)
																if (id) setSelectedId(id)
															}}
														>
															<GitMerge className="size-3.5" />
															Merge into 1
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="h-7 text-xs"
															onClick={() => setDismissed([...dismissed, cluster.root])}
														>
															Keep separate
														</Button>
													</div>
												</div>
											)
										})}
									{cards.map((sub) => {
										const flagged = sub.icons.filter((entry) => entry.variants.some(blocking)).length
										const clash = clashes.some((entry) => entry.entries.some((item) => item.submissionId === sub.id))
										return (
											<button
												type="button"
												key={sub.id}
												onClick={() => setSelectedId(sub.id)}
												className={cn(
													"w-full rounded-lg border bg-background p-2.5 text-left transition hover:border-foreground/30",
													selectedId === sub.id && "border-primary ring-2 ring-primary/20",
												)}
											>
												<span className="flex items-center justify-between gap-2 text-xs">
													<span className="truncate font-medium">{sub.icons.map((entry) => entry.slug).join(", ")}</span>
													<span className="shrink-0 text-[10px] text-muted-foreground">{minutesAgo(sub.created)}</span>
												</span>
												<span className="mt-0.5 block text-[11px] text-muted-foreground">
													@{sub.contributor} · {sub.icons.length} icon{sub.icons.length > 1 && "s"} ·{" "}
													{sub.icons.reduce((sum, entry) => sum + entry.variants.length, 0)} files
												</span>
												<span className="mt-2 flex flex-wrap gap-1">
													{sub.icons.slice(0, 7).map((entry) => (
														<Swatch key={entry.id} variant={entry.variants[0]} className="size-7 rounded border p-0.5" />
													))}
													{sub.icons.length > 7 && (
														<span className="flex size-7 items-center justify-center rounded border text-[10px]">
															+{sub.icons.length - 7}
														</span>
													)}
												</span>
												<span className="mt-2 flex flex-wrap gap-1 text-[10px]">
													{sub.mergedFrom && <Chip tone="violet">merged · {sub.mergedFrom.length}</Chip>}
													{sub.round > 1 && <Chip tone="blue">round {sub.round}</Chip>}
													{sub.icons.some((entry) => entry.mode === "update") && <Chip tone="blue">update</Chip>}
													{clash && <Chip tone="amber">slug collision</Chip>}
													{!!flagged && <Chip tone="red">{flagged} flagged</Chip>}
												</span>
											</button>
										)
									})}
									{column.id === "approved" && !!approvedFiles.length && (
										<div className="rounded-lg border border-dashed border-emerald-500/40 p-2 text-[11px]">
											<p className="font-medium text-emerald-700 dark:text-emerald-300">Next publish run · {approvedFiles.length} files</p>
											<p className="mt-1 break-all font-mono text-muted-foreground">{approvedFiles.join(" ")}</p>
										</div>
									)}
								</div>
							</section>
						)
					})}
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs">
					<span className="font-medium">Changeset</span>
					<span className="text-muted-foreground">
						{review.decidedIcons}/{review.totalIcons} icons decided · {review.fixups.length} fix-ups · {review.payload.submissions.length}{" "}
						submissions affected
					</span>
					<details className="relative">
						<summary className="cursor-pointer text-muted-foreground underline">fix-ups</summary>
						<ul className="absolute bottom-6 left-0 z-30 w-96 max-w-[80vw] space-y-1 rounded-lg border bg-background p-2 shadow-lg">
							{!review.fixups.length && <li className="text-muted-foreground">None yet</li>}
							{review.fixups.map((fix, index) => (
								<li key={index} className="flex items-start gap-1 font-mono text-[11px]">
									<span className="flex-1">{describeFixup(fix)}</span>
									<button type="button" aria-label="Undo fix-up" onClick={() => review.undoFixup(index)}>
										<Undo2 className="size-3" />
									</button>
								</li>
							))}
						</ul>
					</details>
					<Button size="sm" className="ml-auto h-8" disabled={!review.payload.submissions.length} onClick={onSubmit}>
						<Send className="size-3.5" />
						Submit review
					</Button>
				</div>
			</div>
			<aside className="min-h-0 overflow-y-auto rounded-xl border bg-background">
				{!selected && <p className="p-6 text-sm text-muted-foreground">Pick a card.</p>}
				{selected && <Detail key={selected.id} sub={selected} review={review} onSelect={setSelectedId} />}
			</aside>
		</div>
	)
}

function Chip({ tone, children }: { tone: "violet" | "blue" | "amber" | "red"; children: React.ReactNode }) {
	return (
		<span
			className={cn("rounded px-1.5 py-0.5 font-medium", {
				"bg-violet-500/10 text-violet-700 dark:text-violet-300": tone === "violet",
				"bg-blue-500/10 text-blue-700 dark:text-blue-300": tone === "blue",
				"bg-amber-500/10 text-amber-700 dark:text-amber-300": tone === "amber",
				"bg-red-500/10 text-red-700 dark:text-red-300": tone === "red",
			})}
		>
			{children}
		</span>
	)
}

function Detail({ sub, review, onSelect }: { sub: MockSubmission; review: Review; onSelect: (id: string) => void }) {
	const [picking, setPicking] = useState<Exclude<Outcome, "approve"> | null>(null)
	const [renaming, setRenaming] = useState<Record<string, string>>({})
	const subDecision = review.subDecisions[sub.id]
	const flagged = sub.icons.filter((entry) => entry.variants.some((variant) => blocking(variant) && !review.dropped[variant.id]))
	const clashes = useMemo(
		() => collisions(review.subs).filter((entry) => entry.entries.some((item) => item.submissionId === sub.id)),
		[review.subs, sub.id],
	)
	return (
		<div>
			<header className="sticky top-0 z-10 space-y-2 border-b bg-background p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
							Submission · {sub.icons.length} icon{sub.icons.length > 1 && "s"}
						</p>
						<h2 className="truncate text-lg font-semibold">@{sub.contributor}</h2>
						<p className="text-xs text-muted-foreground">{sub.note || "No note"}</p>
					</div>
					{subDecision && <OutcomeBadge outcome={subDecision.outcome} />}
				</div>
				<div className="flex flex-wrap gap-1.5">
					<Button size="sm" className="h-8" onClick={() => review.decideSubmission(sub.id, "approve")}>
						<Check className="size-3.5" />
						Approve all
					</Button>
					<Button size="sm" variant="outline" className="h-8" onClick={() => setPicking(picking === "changes" ? null : "changes")}>
						<RotateCcw className="size-3.5" />
						Request changes
					</Button>
					<Button size="sm" variant="outline" className="h-8" onClick={() => setPicking(picking === "reject" ? null : "reject")}>
						<X className="size-3.5" />
						Reject
					</Button>
					{subDecision && (
						<Button size="sm" variant="ghost" className="h-8" onClick={() => review.decideSubmission(sub.id, null)}>
							<Undo2 className="size-3.5" />
						</Button>
					)}
				</div>
				{!!flagged.length && flagged.length < sub.icons.length && (
					<Button
						size="sm"
						variant="secondary"
						className="h-8 w-full justify-start"
						onClick={() => {
							review.decideSubmission(sub.id, "approve")
							for (const entry of flagged) review.decideIcon(entry.id, "changes", reasons[2].text)
						}}
					>
						<Check className="size-3.5" />
						Approve {sub.icons.length - flagged.length}, send back {flagged.length} flagged
					</Button>
				)}
				{picking && (
					<div className="grid gap-1">
						{reasons
							.filter((reason) => reason.outcome === picking)
							.map((reason) => (
								<button
									type="button"
									key={reason.text}
									className="rounded border px-2 py-1.5 text-left text-xs hover:bg-muted"
									onClick={() => {
										review.decideSubmission(sub.id, picking, reason.text)
										setPicking(null)
									}}
								>
									{reason.text}
								</button>
							))}
					</div>
				)}
			</header>
			<div className="space-y-3 p-4">
				{clashes.map((clash) => (
					<div key={clash.slug} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
						<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
						<div className="flex-1">
							<span className="font-mono">{clash.slug}</span> is also pending from{" "}
							{clash.entries
								.filter((item) => item.submissionId !== sub.id)
								.map((item) => (
									<button key={item.submissionId} type="button" className="underline" onClick={() => onSelect(item.submissionId)}>
										@{item.contributor} ({minutesAgo(item.created)})
									</button>
								))}
							. First come wins unless you rename one.
						</div>
					</div>
				))}
				{sub.history && (
					<div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5 text-xs">
						<p className="font-medium">
							Round {sub.round} · you requested changes {minutesAgo(sub.history.at)}
						</p>
						<p className="mt-1 text-muted-foreground">“{sub.history.feedback}”</p>
						<div className="mt-2 flex items-center gap-2">
							{sub.history.previous.map((variant) => (
								<Swatch key={variant.id} variant={variant} className="size-12 rounded border p-1" />
							))}
							<ArrowRight className="size-4 text-muted-foreground" />
							{sub.icons[0].variants.map((variant) => (
								<Swatch key={variant.id} variant={variant} className="size-12 rounded border p-1" />
							))}
						</div>
						<ul className="mt-2 list-inside list-disc">
							{sub.history.changes.map((change) => (
								<li key={change}>{change}</li>
							))}
						</ul>
					</div>
				)}
				{sub.icons.map((entry, index) => {
					const effective = review.decision(entry.id)
					const override = review.iconDecisions[entry.id]
					return (
						<details key={entry.id} open={sub.icons.length < 4 || index === 0} className="rounded-lg border">
							<summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
								<Swatch variant={entry.variants[0]} className="size-8 shrink-0 rounded border p-0.5" />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-mono text-sm font-medium">{entry.slug}</span>
									<span className="text-[11px] text-muted-foreground">
										{entry.mode === "update" && "Update · "}
										{entry.variants.length} variant{entry.variants.length > 1 && "s"}
										{override && " · override"}
									</span>
								</span>
								<OutcomeBadge outcome={effective?.outcome || "undecided"} />
							</summary>
							<div className="space-y-3 border-t p-3">
								<div className="flex gap-1">
									{(["approve", "changes", "reject"] as Outcome[]).map((outcome) => (
										<Button
											key={outcome}
											size="sm"
											variant={override?.outcome === outcome ? "default" : "outline"}
											className="h-7 flex-1 px-1 text-[11px]"
											onClick={() => review.decideIcon(entry.id, override?.outcome === outcome ? null : outcome)}
										>
											{{ approve: "Approve icon", changes: "Changes", reject: "Reject icon" }[outcome]}
										</Button>
									))}
								</div>
								{entry.target && (
									<div className="grid grid-cols-2 gap-2 text-[11px]">
										<div>
											<p className="mb-1 text-muted-foreground">Published</p>
											<div className="flex gap-1">
												{entry.target.published.map((variant) => (
													<DualSwatch key={variant.id} variant={variant} className="h-16 flex-1" />
												))}
											</div>
										</div>
										<div>
											<p className="mb-1 text-muted-foreground">Proposed</p>
											<div className="flex gap-1">
												<DualSwatch variant={entry.variants[0]} className="h-16 flex-1" />
											</div>
										</div>
									</div>
								)}
								<div className="grid grid-cols-2 gap-2">
									{entry.variants.map((variant) => {
										const drop = review.dropped[variant.id]
										return (
											<figure key={variant.id} className={cn("space-y-1", drop && "opacity-40")}>
												<DualSwatch variant={variant} className="h-20" />
												<figcaption className="flex items-center gap-1 text-[10px]">
													<KindBadge variant={variant} />
													<span className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={drop}>
														{fileName(entry.slug, variant)}
													</span>
													<button type="button" aria-label="Drop variant" onClick={() => review.toggleDrop(variant.id)}>
														{drop && <Undo2 className="size-3" />}
														{!drop && <Trash2 className="size-3" />}
													</button>
												</figcaption>
												{variant.asset.checks.map((check) => (
													<p key={check.id} className="text-[10px] text-red-600">
														⚠ {check.label}
													</p>
												))}
											</figure>
										)
									})}
								</div>
								<div className="flex gap-1">
									<Input
										className="h-7 font-mono text-xs"
										aria-label="Rename slug"
										value={renaming[entry.id] ?? entry.slug}
										onChange={(event) => setRenaming({ ...renaming, [entry.id]: event.target.value })}
									/>
									<Button
										size="sm"
										variant="outline"
										className="h-7 text-xs"
										onClick={() => review.rename(entry.id, renaming[entry.id] || "")}
									>
										Rename
									</Button>
									{sub.icons.length > 1 && (
										<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => review.split(entry.id)}>
											<Scissors className="size-3" />
											Split
										</Button>
									)}
								</div>
							</div>
						</details>
					)
				})}
			</div>
		</div>
	)
}
