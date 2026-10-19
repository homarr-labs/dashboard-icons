// PROTOTYPE (throwaway): pass 2 Variant C "Timeline" — one Submission as a conversation (opened, proposed delta now-vs-proposed, checks, hints, rejection → resubmission diff, staged fix-ups) with a compact queue; best for updates and resubmissions.
"use client"
import { Bot, Check, FileImage, GitCompare, History, Info, Pencil, Send, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { fileName, type Hint, hints, kindLabel, reasons, rows, type Submission, type Variant } from "./mock"
import {
	batches,
	DecisionBadge,
	FinalToggle,
	Hints,
	KindBadge,
	MetadataFields,
	minutesAgo,
	ReasonPicker,
	reasonFor,
	Swatch,
	VariantTile,
} from "./shared"
import type { Review } from "./state"

export function VariantC({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const groups = useMemo(() => batches(review.subs), [review.subs])
	const order = useMemo(() => groups.flatMap((group) => group.subs), [groups])
	const [currentId, setCurrentId] = useState(order.find((sub) => sub.type === "update")?.id || order[0].id)
	const sub = order.find((entry) => entry.id === currentId) || order[0]
	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (target.closest("input,textarea,select,[role=dialog]")) return
			const index = order.findIndex((entry) => entry.id === currentId)
			if (event.key === "j") setCurrentId(order[Math.min(order.length - 1, index + 1)].id)
			if (event.key === "k") setCurrentId(order[Math.max(0, index - 1)].id)
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [order, currentId])
	const stagedCount = Object.keys(review.decisions).length
	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
			<aside aria-label="Queue" className="flex max-h-56 min-h-0 flex-col overflow-hidden rounded-xl border bg-background lg:max-h-none">
				<div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs">
					<span className="text-muted-foreground">{order.length} open · J/K</span>
					<Button size="sm" className="h-7 text-xs" disabled={!stagedCount} onClick={onSubmit}>
						<Send className="size-3" />
						Submit {stagedCount}
					</Button>
				</div>
				<ul className="min-h-0 flex-1 overflow-y-auto py-1 text-xs">
					{groups.map((group) => (
						<li key={group.key}>
							{group.subs.length > 1 && (
								<p className="px-3 pb-0.5 pt-2 text-[10px] text-muted-foreground">
									@{group.contributor} sent {group.subs.length} together
								</p>
							)}
							<ul className={cn(group.subs.length > 1 && "ml-3 border-l")}>
								{group.subs.map((item) => {
									const decision = review.decisions[item.id]
									return (
										<li key={item.id}>
											<button
												type="button"
												onClick={() => setCurrentId(item.id)}
												className={cn(
													"flex w-full items-center gap-1.5 px-3 py-1 text-left hover:bg-muted",
													item.id === sub.id && "bg-primary/10",
												)}
											>
												<span
													className={cn(
														"size-2 shrink-0 rounded-full bg-muted-foreground/30",
														decision?.outcome === "approve" && "bg-emerald-500",
														decision?.outcome === "reject" && decision.final && "bg-red-500",
														decision?.outcome === "reject" && !decision.final && "bg-amber-500",
													)}
												/>
												<span className="min-w-0 flex-1 truncate font-mono">{item.slug}</span>
												{item.type === "update" && <span className="text-[9px] text-blue-600">update</span>}
												{item.round > 1 && <span className="text-[9px] text-violet-600">r{item.round}</span>}
												{group.subs.length === 1 && <span className="text-[10px] text-muted-foreground">@{item.contributor}</span>}
											</button>
										</li>
									)
								})}
							</ul>
						</li>
					))}
				</ul>
				<p className="border-t px-3 py-2 text-[10px] text-muted-foreground">
					Publish queue after submit: {review.payload.publishQueue.length} files
				</p>
			</aside>
			<main className="min-h-0 min-w-0 overflow-y-auto pb-24">
				<Thread key={sub.id} sub={sub} review={review} onOpen={setCurrentId} />
			</main>
		</div>
	)
}

function Event({ icon, who, children, tone }: { icon: React.ReactNode; who: React.ReactNode; children: React.ReactNode; tone?: string }) {
	return (
		<div className="relative flex gap-3 pb-4 before:absolute before:left-[15px] before:top-8 before:h-[calc(100%-2rem)] before:w-px before:bg-border last:before:hidden">
			<span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border bg-background", tone)}>{icon}</span>
			<div className="min-w-0 flex-1 rounded-lg border bg-background">
				<div className="border-b bg-muted/30 px-3 py-1.5 text-xs font-medium">{who}</div>
				<div className="space-y-2 px-3 py-2 text-xs">{children}</div>
			</div>
		</div>
	)
}

function revisionDiff(previous: Variant[], current: Variant[]) {
	const kinds = [...new Set([...previous.map((entry) => entry.kind), ...current.map((entry) => entry.kind)])]
	return kinds.map((kind) => {
		const before = previous.find((entry) => entry.kind === kind)
		const after = current.find((entry) => entry.kind === kind)
		let change = "replaced"
		if (!before) change = "added"
		if (!after) change = "removed"
		return { kind, before, after, change }
	})
}

function Thread({ sub, review, onOpen }: { sub: Submission; review: Review; onOpen: (id: string) => void }) {
	const view = review.effective(sub)
	const group = batches(review.subs).find((entry) => entry.subs.includes(sub))
	const variantHint = hints(sub, review.subs).find((hint) => hint.type === "variant-of")
	const [editing, setEditing] = useState(false)
	const [outcome, setOutcome] = useState<"approve" | "reject">("approve")
	const [reason, setReason] = useState<{ text: string; final: boolean } | null>(null)
	const decision = review.decisions[sub.id]
	const lines = review.fixupLines(sub)
	const staged = review.payload.items.find((item) => item.id === sub.id)
	const checks = view.rows.flatMap((row) =>
		(row.proposed && row.change !== "unchanged" ? row.proposed.asset.checks : []).map((check) => ({
			file: fileName(view.slug, { kind: row.kind, asset: (row.proposed as Variant).asset }),
			check,
		})),
	)
	function rejectAsVariant(hint: Hint) {
		const found = reasons.find((entry) => entry.key === "variant-of")
		if (!found) return
		setOutcome("reject")
		setReason({ text: reasonFor(found, hint), final: found.final })
	}
	return (
		<div className="max-w-3xl">
			<header className="mb-4 border-b pb-3">
				<h2 className="flex flex-wrap items-baseline gap-2 text-xl font-semibold">
					{sub.type === "update" && "Update"}
					{sub.type === "new" && "Add"} <span className="font-mono">{view.slug}</span>
					<span className="text-sm font-normal text-muted-foreground">{sub.id}</span>
					<DecisionBadge decision={decision} />
				</h2>
				<p className="text-xs text-muted-foreground">
					@{sub.contributor} · {minutesAgo(sub.created)} · round {sub.round}
				</p>
			</header>

			<Event icon={<FileImage className="size-4" />} who={`@${sub.contributor} opened this submission`}>
				<p>{sub.note || "No note."}</p>
				{group && group.subs.length > 1 && (
					<div className="flex flex-wrap items-center gap-1">
						<span className="text-muted-foreground">Sent together with</span>
						{group.subs
							.filter((entry) => entry.id !== sub.id)
							.map((entry) => (
								<button
									key={entry.id}
									type="button"
									className="rounded border px-1.5 font-mono hover:bg-muted"
									onClick={() => onOpen(entry.id)}
								>
									{entry.slug}
								</button>
							))}
					</div>
				)}
			</Event>

			{sub.history && (
				<>
					<Event
						icon={<X className="size-4 text-amber-600" />}
						who={`@${sub.history.reviewer} rejected round ${sub.history.round} (resubmittable) · ${minutesAgo(sub.history.at)}`}
					>
						<p>“{sub.history.reason}”</p>
					</Event>
					<Event icon={<History className="size-4 text-violet-600" />} who={`@${sub.contributor} resubmitted as round ${sub.round}`}>
						<div className="space-y-1.5">
							{revisionDiff(sub.history.previous, sub.variants).map((entry) => (
								<div key={entry.kind} className="flex items-center gap-2">
									<KindBadge kind={entry.kind} className="w-20 justify-center" />
									{entry.before && <Swatch variant={entry.before} className="size-14 rounded border p-1 opacity-70" />}
									{!entry.before && (
										<span className="flex size-14 items-center justify-center rounded border border-dashed text-[10px]">—</span>
									)}
									<span className="text-muted-foreground">→</span>
									{entry.after && <Swatch variant={entry.after} className="size-14 rounded border p-1" />}
									{!entry.after && (
										<span className="flex size-14 items-center justify-center rounded border border-dashed text-[10px]">—</span>
									)}
									<span
										className={cn(
											"rounded px-1 text-[10px] font-medium uppercase",
											entry.change === "added" && "bg-emerald-500/10 text-emerald-600",
											entry.change === "replaced" && "bg-amber-500/10 text-amber-600",
											entry.change === "removed" && "bg-red-500/10 text-red-600",
										)}
									>
										{entry.change}
									</span>
								</div>
							))}
						</div>
					</Event>
				</>
			)}

			{sub.type === "update" && sub.published && sub.delta && (
				<Event icon={<GitCompare className="size-4 text-blue-600" />} who={`Proposed changes to the published ${sub.slug}`}>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[440px] text-xs">
							<thead>
								<tr className="text-left text-muted-foreground">
									<th className="py-1 font-medium">Variant</th>
									<th className="py-1 font-medium">Published now</th>
									<th className="py-1 font-medium">Proposed</th>
									<th className="py-1 font-medium">Change</th>
								</tr>
							</thead>
							<tbody>
								{view.rows.map((row) => (
									<tr
										key={`${row.originalKind}-${row.proposed?.id || row.published?.id}`}
										className={cn("border-t", row.change === "unchanged" && "opacity-50")}
									>
										<td className="py-1.5">
											<KindBadge kind={row.kind} />
										</td>
										<td className="py-1.5">
											{row.published && <Swatch variant={row.published} className="h-16 w-24 rounded border p-1.5" />}
											{!row.published && <span className="text-muted-foreground">—</span>}
										</td>
										<td className="py-1.5">
											{row.proposed && <Swatch variant={row.proposed} kind={row.kind} className="h-16 w-24 rounded border p-1.5" />}
											{!row.proposed && (
												<span className="flex h-16 w-24 items-center justify-center rounded border border-red-500/50 bg-red-500/5 text-[10px] font-medium text-red-600">
													removed
												</span>
											)}
										</td>
										<td className="py-1.5">
											<span
												className={cn(
													"rounded px-1 text-[10px] font-medium uppercase",
													row.change === "added" && "bg-emerald-500/10 text-emerald-600",
													row.change === "replaced" && "bg-amber-500/10 text-amber-600",
													row.change === "removed" && "bg-red-600 text-white",
												)}
											>
												{row.change}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="space-y-0.5 font-mono text-[11px]">
						{sub.delta.aliases.add.map((alias) => (
							<p key={alias} className="text-emerald-600">
								+ alias {alias}
							</p>
						))}
						{sub.delta.aliases.remove.map((alias) => (
							<p key={alias} className="text-red-600">
								− alias {alias}
							</p>
						))}
						{sub.delta.categories.add.map((category) => (
							<p key={category} className="text-emerald-600">
								+ category {category}
							</p>
						))}
						{sub.delta.categories.remove.map((category) => (
							<p key={category} className="text-red-600">
								− category {category}
							</p>
						))}
					</div>
				</Event>
			)}

			{sub.type === "new" && (
				<Event icon={<FileImage className="size-4" />} who={`${rows(sub).length} variant files`}>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{view.rows.map((row) => (
							<VariantTile key={row.proposed?.id} row={row} slug={view.slug} mode="intended" />
						))}
					</div>
					<p className="text-muted-foreground">
						Aliases: {view.aliases.join(", ") || "none"} · Categories: {view.categories.join(", ") || "none"}
					</p>
				</Event>
			)}

			<Event icon={<Bot className="size-4" />} who="icons-bot · checks">
				{!checks.length && !view.issues.length && (
					<p className="text-emerald-600">✓ Transparent, vector, has a Base, no duplicate kinds.</p>
				)}
				{checks.map((entry) => (
					<p key={`${entry.file}-${entry.check.id}`} className={cn(entry.check.severity === "block" && "text-red-600")}>
						{entry.check.severity === "block" && "✕ "}
						{entry.check.severity === "warn" && "⚠ "}
						<span className="font-mono">{entry.file}</span>: {entry.check.label}
					</p>
				))}
				{view.issues.map((issue) => (
					<p key={issue} className="text-red-600">
						✕ {issue}
					</p>
				))}
			</Event>

			{!!hints(sub, review.subs).length && (
				<Event icon={<Info className="size-4 text-amber-600" />} who="icons-bot · related (informational)">
					<Hints sub={sub} review={review} onOpen={onOpen} onRejectAsVariant={rejectAsVariant} />
				</Event>
			)}

			<Event icon={<Pencil className="size-4" />} who="Your fix-ups before approving (staged)">
				{!lines.length && <p className="text-muted-foreground">None. Rename, retag or drop variants, or edit aliases/categories.</p>}
				{lines.map((line) => (
					<p key={line} className="text-blue-700 dark:text-blue-300">
						• {line}
					</p>
				))}
				<div className="flex gap-2">
					<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(!editing)}>
						{editing && "Done"}
						{!editing && "Edit"}
					</Button>
					{!!lines.length && (
						<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => review.resetFixups(sub.id)}>
							Reset
						</Button>
					)}
				</div>
				{editing && (
					<div className="space-y-3 border-t pt-2">
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{view.rows
								.filter((row) => row.change !== "unchanged" && row.change !== "removed")
								.map((row) => (
									<VariantTile
										key={row.proposed?.id}
										row={row}
										slug={view.slug}
										mode="intended"
										review={review}
										submissionId={sub.id}
										compact
									/>
								))}
						</div>
						<MetadataFields sub={sub} review={review} />
					</div>
				)}
			</Event>

			<section className="rounded-xl border bg-background p-3">
				<h3 className="text-sm font-semibold">Decision</h3>
				<div className="mt-2 flex gap-2">
					<Button size="sm" variant={outcome === "approve" ? "default" : "outline"} onClick={() => setOutcome("approve")}>
						<Check className="size-3.5" />
						Approve{!!lines.length && " with fix-ups"}
					</Button>
					<Button size="sm" variant={outcome === "reject" ? "default" : "outline"} onClick={() => setOutcome("reject")}>
						<X className="size-3.5" />
						Reject
					</Button>
				</div>
				{outcome === "reject" && (
					<div className="mt-2 space-y-2">
						<ReasonPicker hint={variantHint} onPick={(text, final) => setReason({ text, final })} />
						{reason && (
							<div className="space-y-1 rounded-md bg-muted/40 p-2 text-xs">
								<p>{reason.text}</p>
								<label className="flex items-center gap-1.5">
									<input
										type="checkbox"
										checked={reason.final}
										onChange={(event) => setReason({ ...reason, final: event.target.checked })}
									/>
									Final (contributor cannot resubmit)
								</label>
							</div>
						)}
					</div>
				)}
				<Textarea
					className="mt-2 text-xs"
					rows={2}
					value={review.comments[sub.id] || ""}
					onChange={(event) => review.comment(sub.id, event.target.value)}
					placeholder="Note to contributor (optional)"
				/>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						disabled={outcome === "reject" && !reason}
						onClick={() => {
							if (outcome === "approve") review.approve(sub.id)
							if (outcome === "reject" && reason) review.reject(sub.id, reason.text, reason.final)
						}}
					>
						Stage decision
					</Button>
					{decision && (
						<Button size="sm" variant="ghost" onClick={() => review.unflag(sub.id)}>
							Unstage
						</Button>
					)}
					<FinalToggle review={review} id={sub.id} />
				</div>
				{staged && (
					<div className="mt-3 rounded-md border bg-muted/30 p-2">
						<p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Contributor will receive</p>
						<pre className="whitespace-pre-wrap break-words font-sans text-xs leading-5">{staged.message}</pre>
						{staged.decision === "approve" && (
							<p className="mt-1 text-[11px] text-emerald-600">→ Publish queue: {staged.files.join(", ")} (published later, separately)</p>
						)}
					</div>
				)}
				<p className="mt-2 text-[10px] text-muted-foreground">
					Variants:{" "}
					{view.rows
						.filter((row) => row.proposed && !row.dropped)
						.map((row) => kindLabel(row.kind))
						.join(", ")}
				</p>
			</section>
		</div>
	)
}
