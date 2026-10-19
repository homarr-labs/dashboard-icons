// PROTOTYPE (throwaway): pass 2 shared pieces — background-correct variant tiles (now vs proposed), reason picker, fix-up fields, hints, decision badge and the payload dialog.
"use client"
import { AlertTriangle, Layers } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { cn } from "@/lib/utils"
import {
	backgroundHint,
	batchKey,
	blocking,
	fileName,
	type Hint,
	hints,
	intendedBackground,
	isCustom,
	kindLabel,
	type Reason,
	reasons,
	type Submission,
	type Variant,
	variantOfText,
	wellKnown,
} from "./mock"
import type { Decision, EffectiveRow, Review, ReviewPayload } from "./state"

export const checker = {
	backgroundImage: "repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%)",
	backgroundSize: "14px 14px",
} as const
export type Backdrop = "intended" | "checker"

export function Swatch({
	variant,
	kind,
	mode = "intended",
	className,
}: {
	variant: Variant
	kind?: string
	mode?: Backdrop
	className?: string
}) {
	let backdrop: "light" | "dark" | "checker" = "checker"
	const intended = intendedBackground(kind || variant.kind)
	if (mode === "intended" && intended !== "any") backdrop = intended
	return (
		<span
			className={cn(
				"relative flex items-center justify-center overflow-hidden",
				backdrop === "light" && "bg-white",
				backdrop === "dark" && "bg-zinc-950",
				className,
			)}
			style={backdrop === "checker" ? checker : undefined}
		>
			<UnoptimizedImage src={variant.asset.url} alt={kind || variant.kind} className="h-full max-h-full w-full max-w-full object-contain" />
		</span>
	)
}

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
	const intended = intendedBackground(kind)
	return (
		<span
			className={cn(
				"inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none",
				intended === "dark" && "border-zinc-700 bg-zinc-900 text-zinc-100",
				intended === "light" && "border-zinc-300 bg-white text-zinc-900",
				intended === "any" && "bg-muted/60",
				isCustom(kind) && "border-dashed border-violet-500/60",
				className,
			)}
		>
			{kindLabel(kind)}
			{isCustom(kind) && <span className="ml-1 opacity-60">custom</span>}
		</span>
	)
}

const customKinds = ["animated", "animated-dark", "4k"]
export function KindSelect({ value, onChange, className }: { value: string; onChange: (kind: string) => void; className?: string }) {
	const options = [...new Set([...wellKnown, ...customKinds, value])]
	return (
		<select
			aria-label="Variant kind"
			value={value}
			onChange={(event) => {
				if (event.target.value !== "__custom") return onChange(event.target.value)
				const name = window.prompt("Custom variant name (file becomes <slug>-<name>)")
				if (name?.trim())
					onChange(
						name
							.trim()
							.toLowerCase()
							.replace(/[^a-z0-9-]+/g, "-"),
					)
			}}
			className={cn("h-6 min-w-0 rounded border bg-background text-[11px]", className)}
		>
			{options.map((kind) => (
				<option key={kind} value={kind}>
					{kindLabel(kind)}
					{isCustom(kind) && " (custom)"}
				</option>
			))}
			<option value="__custom">Custom…</option>
		</select>
	)
}

export function VariantTile({
	row,
	slug,
	mode,
	number,
	selected,
	onSelect,
	review,
	submissionId,
	compact,
	update,
}: {
	row: EffectiveRow
	slug: string
	mode: Backdrop
	number?: number
	selected?: boolean
	onSelect?: () => void
	review?: Review
	submissionId?: string
	compact?: boolean
	update?: boolean
}) {
	const shown = row.proposed || row.published
	if (!shown) return null
	const showNow = !!row.published && row.change !== "added"
	const retagged = row.kind !== row.originalKind
	return (
		<figure className={cn("min-w-0", row.dropped && "opacity-40")}>
			<button
				type="button"
				onClick={onSelect}
				className={cn(
					"relative block w-full overflow-hidden rounded-lg border text-left",
					selected && "ring-2 ring-primary",
					row.change === "removed" && "border-red-500/60",
					row.proposed && blocking(row.proposed) && "border-red-500",
				)}
			>
				{number !== undefined && (
					<span className="absolute left-1.5 top-1.5 z-10 rounded bg-background/90 px-1 font-mono text-[10px]">{number}</span>
				)}
				{(row.change !== "added" || update) && (
					<span
						className={cn(
							"absolute right-1.5 top-1.5 z-10 rounded px-1 text-[9px] font-semibold uppercase tracking-wider",
							row.change === "removed" && "bg-red-600 text-white",
							row.change === "replaced" && "bg-amber-500 text-black",
							row.change === "added" && "bg-emerald-600 text-white",
							row.change === "unchanged" && "bg-muted text-muted-foreground",
						)}
					>
						{row.change}
					</span>
				)}
				<span className={cn("flex", compact && "h-16", !compact && "h-28")}>
					{showNow && row.published && (
						<Swatch
							variant={row.published}
							mode={mode}
							className={cn("border-r p-2", row.change === "unchanged" && "flex-1", row.change !== "unchanged" && "w-2/5 opacity-70")}
						/>
					)}
					{row.proposed && row.change !== "unchanged" && (
						<Swatch variant={row.proposed} kind={row.kind} mode={mode} className="flex-1 p-3" />
					)}
					{row.change === "removed" && (
						<span className="flex flex-1 items-center justify-center bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgba(239,68,68,.15)_6px_12px)] text-[10px] font-medium text-red-600">
							removed
						</span>
					)}
				</span>
				{showNow && row.change !== "unchanged" && (
					<span className="flex border-t text-[9px] uppercase tracking-wider text-muted-foreground">
						<span className="w-2/5 border-r px-1.5">now</span>
						<span className="px-1.5">proposed</span>
					</span>
				)}
			</button>
			<figcaption className="mt-1 space-y-0.5">
				<span className="flex flex-wrap items-center gap-1">
					<KindBadge kind={row.kind} />
					{!compact && <span className="text-[10px] text-muted-foreground">{backgroundHint(row.kind)}</span>}
					{retagged && <span className="text-[10px] text-blue-600">was {kindLabel(row.originalKind)}</span>}
				</span>
				<span className="block truncate font-mono text-[10px] text-muted-foreground">
					{fileName(slug, { kind: row.kind, asset: shown.asset })}
				</span>
				{row.proposed?.asset.checks.map((check) => (
					<span key={check.id} className={cn("block text-[10px]", check.severity === "block" && "text-red-600")}>
						⚠ {check.label}
					</span>
				))}
				{review && submissionId && row.proposed && row.change !== "removed" && row.change !== "unchanged" && (
					<span className="flex items-center gap-1">
						<KindSelect value={row.kind} onChange={(kind) => review.retag(submissionId, row.proposed?.id || "", kind)} className="flex-1" />
						<button
							type="button"
							className="rounded border px-1.5 text-[10px] hover:bg-muted"
							onClick={() => review.toggleDrop(submissionId, row.proposed?.id || "")}
						>
							{row.dropped && "Keep"}
							{!row.dropped && "Drop"}
						</button>
					</span>
				)}
			</figcaption>
		</figure>
	)
}

export function reasonFor(reason: Reason, hint?: Hint) {
	if (reason.key === "variant-of" && hint?.parent) return variantOfText(hint.parent)
	return reason.text
}
export function ReasonPicker({
	onPick,
	hint,
	columns = 2,
}: {
	onPick: (text: string, final: boolean) => void
	hint?: Hint
	columns?: 1 | 2
}) {
	return (
		<div className={cn("grid gap-1", columns === 2 && "sm:grid-cols-2")}>
			{reasons.map((reason, index) => (
				<button
					type="button"
					key={reason.key}
					onClick={() => onPick(reasonFor(reason, hint), reason.final)}
					className="flex items-start gap-2 rounded border px-2 py-1.5 text-left text-xs hover:bg-muted"
				>
					<kbd className="font-mono text-muted-foreground">{index + 1}</kbd>
					<span className="flex-1">{reasonFor(reason, hint)}</span>
					<span
						className={cn(
							"shrink-0 rounded px-1 text-[9px] font-medium uppercase",
							reason.final && "bg-red-500/10 text-red-600",
							!reason.final && "bg-blue-500/10 text-blue-600",
						)}
					>
						{reason.final && "final"}
						{!reason.final && "resubmit"}
					</span>
				</button>
			))}
		</div>
	)
}

export function DecisionBadge({ decision, className }: { decision?: Decision; className?: string }) {
	let label = "Pending"
	let tone = "border-border bg-muted/40 text-muted-foreground"
	if (decision?.outcome === "approve") {
		label = "Approve"
		tone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
	}
	if (decision?.outcome === "reject" && decision.final) {
		label = "Reject · final"
		tone = "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
	}
	if (decision?.outcome === "reject" && !decision.final) {
		label = "Reject · can resubmit"
		tone = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
	}
	return (
		<span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium", tone, className)}>{label}</span>
	)
}

export function FinalToggle({ review, id }: { review: Review; id: string }) {
	const decision = review.decisions[id]
	if (decision?.outcome !== "reject") return null
	return (
		<label className="flex items-center gap-1.5 text-xs">
			<input type="checkbox" checked={decision.final} onChange={(event) => review.setFinal(id, event.target.checked)} />
			Final (contributor cannot resubmit)
		</label>
	)
}

function ListField({ label, value, onCommit }: { label: string; value: string[]; onCommit: (next: string[]) => void }) {
	const [draft, setDraft] = useState(value.join(", "))
	return (
		<label className="block text-[11px] text-muted-foreground">
			{label}
			<input
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() =>
					onCommit(
						draft
							.split(",")
							.map((entry) => entry.trim())
							.filter(Boolean),
					)
				}
				className="mt-0.5 h-7 w-full rounded border bg-background px-2 font-mono text-xs text-foreground"
			/>
		</label>
	)
}
export function MetadataFields({ sub, review }: { sub: Submission; review: Review }) {
	const view = review.effective(sub)
	const [slug, setSlug] = useState(view.slug)
	return (
		<div key={sub.id} className="grid gap-2 sm:grid-cols-3">
			<label className="block text-[11px] text-muted-foreground">
				Slug
				<input
					id={`meta-slug-${sub.id}`}
					value={slug}
					disabled={sub.type === "update"}
					onChange={(event) => setSlug(event.target.value)}
					onBlur={() => review.rename(sub.id, slug)}
					className="mt-0.5 h-7 w-full rounded border bg-background px-2 font-mono text-xs text-foreground disabled:opacity-60"
				/>
			</label>
			<ListField label="Aliases" value={view.aliases} onCommit={(next) => review.setAliases(sub.id, next)} />
			<ListField label="Categories" value={view.categories} onCommit={(next) => review.setCategories(sub.id, next)} />
		</div>
	)
}

export function Hints({
	sub,
	review,
	onOpen,
	onRejectAsVariant,
}: {
	sub: Submission
	review: Review
	onOpen?: (id: string) => void
	onRejectAsVariant?: (hint: Hint) => void
}) {
	const list = hints(sub, review.subs)
	if (!list.length) return null
	return (
		<div className="space-y-1.5">
			{list.map((hint) => (
				<div
					key={`${hint.type}-${hint.submissionId}`}
					className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 text-xs"
				>
					{hint.type === "variant-of" && <Layers className="size-3.5 text-amber-600" />}
					{hint.type === "collision" && <AlertTriangle className="size-3.5 text-amber-600" />}
					<span className="flex-1">{hint.text}</span>
					{onOpen && hint.submissionId && (
						<button type="button" className="underline" onClick={() => onOpen(hint.submissionId || "")}>
							Open
						</button>
					)}
					{hint.type === "variant-of" && onRejectAsVariant && (
						<Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onRejectAsVariant(hint)}>
							Reject: “variant of {hint.parent}” <kbd className="opacity-60">V</kbd>
						</Button>
					)}
				</div>
			))}
		</div>
	)
}

export function minutesAgo(iso: string) {
	const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
	return `${Math.round(minutes / 1440)}d ago`
}
export function batches(subs: Submission[]) {
	const groups: { key: string; contributor: string; created: string; subs: Submission[] }[] = []
	for (const sub of subs) {
		const key = batchKey(sub)
		const existing = groups.find((group) => group.key === key)
		if (existing) existing.subs.push(sub)
		else groups.push({ key, contributor: sub.contributor, created: sub.created, subs: [sub] })
	}
	return groups
}

export function PayloadDialog({
	open,
	onOpenChange,
	payload,
	onConfirm,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	payload: ReviewPayload
	onConfirm: () => void
}) {
	const approved = payload.items.filter((item) => item.decision === "approve").length
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
				<DialogTitle>Submit review (prototype payload)</DialogTitle>
				<DialogDescription>
					{approved} approved · {payload.items.length - approved} rejected. Approval does not publish: {payload.publishQueue.length} files
					join the publish queue. Nothing is sent from this prototype.
				</DialogDescription>
				{!payload.items.length && <p className="text-sm text-muted-foreground">No staged decisions yet.</p>}
				<div className="space-y-3">
					{payload.items.map((item) => (
						<section key={item.id} className="rounded-lg border">
							<header className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
								<span className="font-mono font-medium">{item.slug}</span>
								<span className="text-muted-foreground">
									{item.type === "update" && "update · "}@{item.contributor} · round {item.round}
								</span>
								<span className="ml-auto">
									<DecisionBadge
										decision={
											item.decision === "approve"
												? { outcome: "approve" }
												: { outcome: "reject", reason: item.reason || "", final: !!item.final }
										}
									/>
								</span>
							</header>
							<div className="space-y-1 px-3 py-2 text-xs">
								{item.reason && <p>Reason: {item.reason}</p>}
								{!!item.fixups.length && (
									<ul className="list-inside list-disc text-blue-700 dark:text-blue-300">
										{item.fixups.map((line) => (
											<li key={line}>{line}</li>
										))}
									</ul>
								)}
								{item.decision === "approve" && <p className="font-mono text-[11px] text-muted-foreground">{item.files.join("  ")}</p>}
							</div>
							<pre className="whitespace-pre-wrap break-words border-t bg-muted/30 px-3 py-2 font-sans text-xs leading-5">
								{item.message}
							</pre>
						</section>
					))}
				</div>
				<details className="rounded-lg border p-3 text-xs">
					<summary className="cursor-pointer font-medium">Raw JSON</summary>
					<pre className="mt-2 max-h-72 overflow-auto font-mono text-[11px]">{JSON.stringify(payload, null, 2)}</pre>
				</details>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Keep reviewing
					</Button>
					<Button
						disabled={!payload.items.length}
						onClick={() => {
							onConfirm()
							onOpenChange(false)
						}}
					>
						Submit (stub, resets prototype)
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
