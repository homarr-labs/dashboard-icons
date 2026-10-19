// PROTOTYPE (throwaway): pass 3 shared pieces for the review bench: background-correct variant tiles (now vs proposed), reason picker, fix-up fields, hints, round diff and the payload dialog.
"use client"
import { AlertTriangle, ArrowRight, Layers, Trash2, Undo2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

export const focusRing = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
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
				"relative flex min-w-0 items-center justify-center overflow-hidden",
				backdrop === "light" && "bg-white",
				backdrop === "dark" && "bg-zinc-950",
				className,
			)}
			style={backdrop === "checker" ? checker : undefined}
		>
			<UnoptimizedImage
				src={variant.asset.url}
				alt={kindLabel(kind || variant.kind)}
				className="h-full max-h-full w-full max-w-full object-contain"
			/>
		</span>
	)
}

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
	const intended = intendedBackground(kind)
	return (
		<span
			title={kindLabel(kind)}
			className={cn(
				"inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium leading-tight",
				intended === "dark" && "border-zinc-700 bg-zinc-900 text-zinc-50",
				intended === "light" && "border-zinc-300 bg-white text-zinc-900",
				intended === "any" && "bg-muted text-foreground",
				isCustom(kind) && "border-dashed border-violet-500/70",
				className,
			)}
		>
			<span className="truncate">{kindLabel(kind)}</span>
			{isCustom(kind) && <span className="shrink-0 font-normal opacity-75">custom</span>}
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
				const name = window.prompt("Custom variant name. The file becomes <slug>-<name>.")
				if (name?.trim())
					onChange(
						name
							.trim()
							.toLowerCase()
							.replace(/[^a-z0-9-]+/g, "-"),
					)
			}}
			className={cn(
				"h-8 w-full min-w-0 truncate rounded-md border bg-background px-2 text-xs pointer-coarse:h-11 pointer-coarse:text-sm",
				focusRing,
				className,
			)}
		>
			{options.map((kind) => (
				<option key={kind} value={kind}>
					{kindLabel(kind)}
					{isCustom(kind) && " (custom)"}
				</option>
			))}
			<option value="__custom">Custom name…</option>
		</select>
	)
}

const changeTone = {
	added: "bg-emerald-600 text-white",
	replaced: "bg-amber-400 text-amber-950",
	removed: "bg-red-600 text-white",
	unchanged: "bg-background/90 text-muted-foreground border",
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
	update?: boolean
}) {
	const shown = row.proposed || row.published
	if (!shown) return null
	const editable = !!review && !!submissionId && !!row.proposed && row.change !== "removed" && row.change !== "unchanged"
	const split = update && row.change === "replaced" && row.published && row.proposed
	const file = fileName(slug, { kind: row.kind, asset: shown.asset })
	return (
		<figure
			className={cn(
				"flex min-w-0 flex-col gap-2 rounded-xl border bg-background p-2 transition-colors",
				selected && "border-foreground/50 ring-2 ring-foreground/15",
				row.proposed && row.change !== "unchanged" && blocking(row.proposed) && "border-red-500/70",
			)}
		>
			<button
				type="button"
				onClick={onSelect}
				aria-pressed={selected}
				aria-label={`${kindLabel(row.kind)} variant, ${file}`}
				className={cn("relative block h-32 w-full overflow-hidden rounded-lg border sm:h-36", focusRing)}
			>
				<span className={cn("flex h-full", row.dropped && "opacity-30")}>
					{split && row.published && row.proposed && (
						<>
							<span className="relative flex w-2/5 border-r">
								<Swatch variant={row.published} mode={mode} className="h-full w-full p-2 opacity-70" />
								<span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 text-[11px] font-medium text-muted-foreground">
									Now
								</span>
							</span>
							<span className="relative flex flex-1">
								<Swatch variant={row.proposed} kind={row.kind} mode={mode} className="h-full w-full p-3" />
								<span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 text-[11px] font-medium">Proposed</span>
							</span>
						</>
					)}
					{!split && row.change !== "removed" && (
						<Swatch
							variant={row.proposed || shown}
							kind={row.kind}
							mode={mode}
							className={cn("h-full w-full p-4", row.change === "unchanged" && "opacity-60")}
						/>
					)}
					{row.change === "removed" && row.published && (
						<span className="relative flex flex-1">
							<Swatch variant={row.published} mode={mode} className="h-full w-full p-4 opacity-40 grayscale" />
							<span className="absolute inset-0 bg-red-500/10" />
						</span>
					)}
				</span>
				{number !== undefined && (
					<span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded bg-background/90 font-mono text-[11px] font-medium shadow-sm">
						{number}
					</span>
				)}
				{update && (
					<span
						className={cn("absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize", changeTone[row.change])}
					>
						{row.change}
					</span>
				)}
				{row.dropped && (
					<span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background">
						Dropped
					</span>
				)}
			</button>
			<figcaption className="min-w-0 space-y-1">
				<div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
					<KindBadge kind={row.kind} />
					<span className="text-xs text-muted-foreground">{backgroundHint(row.kind)}</span>
				</div>
				<FileName slug={slug} file={file} />
				{row.kind !== row.originalKind && (
					<p className="text-xs text-blue-700 dark:text-blue-300">Retagged from {kindLabel(row.originalKind)}</p>
				)}
				{row.proposed?.asset.checks.map((check) => (
					<p key={check.id} className={cn("text-xs", check.severity === "block" && "text-red-600 dark:text-red-400")}>
						{check.label}
					</p>
				))}
			</figcaption>
			{editable && row.proposed && review && submissionId && (
				<div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
					<KindSelect value={row.kind} onChange={(kind) => review.retag(submissionId, row.proposed?.id || "", kind)} />
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 px-2 text-xs hover:scale-100 pointer-coarse:h-11 pointer-coarse:px-3"
						onClick={() => review.toggleDrop(submissionId, row.proposed?.id || "")}
					>
						{row.dropped && <Undo2 className="size-3.5" />}
						{!row.dropped && <Trash2 className="size-3.5" />}
						<span className="max-sm:sr-only">
							{row.dropped && "Keep"}
							{!row.dropped && "Drop"}
						</span>
					</Button>
				</div>
			)}
		</figure>
	)
}

export function FileName({ slug, file, className }: { slug: string; file: string; className?: string }) {
	const suffix = file.slice(slug.length)
	return (
		<p title={file} className={cn("flex min-w-0 font-mono text-xs text-muted-foreground", className)}>
			<span className="min-w-[3ch] shrink-[20] truncate">{slug}</span>
			<span className="min-w-0 truncate">{suffix}</span>
		</p>
	)
}

export function plural(count: number, word: string) {
	if (count === 1) return `${count} ${word}`
	return `${count} ${word}s`
}

export function reasonFor(reason: Reason, hint?: Hint) {
	if (reason.key === "variant-of" && hint?.parent) return variantOfText(hint.parent)
	return reason.text
}
export function ReasonPicker({ onPick, hint }: { onPick: (text: string) => void; hint?: Hint }) {
	return (
		<ol className="grid gap-1.5 md:grid-cols-2">
			{reasons.map((reason, index) => (
				<li key={reason.key} className="min-w-0">
					<button
						type="button"
						onClick={() => onPick(reasonFor(reason, hint))}
						className={cn(
							"flex min-h-9 w-full items-start gap-2 rounded-md border bg-background px-2.5 py-2 text-left text-sm leading-snug hover:bg-muted pointer-coarse:min-h-11",
							focusRing,
						)}
					>
						<kbd className="mt-px flex size-5 shrink-0 items-center justify-center rounded border bg-muted font-mono text-[11px]">
							{index + 1}
						</kbd>
						<span className="min-w-0 flex-1 text-pretty">{reasonFor(reason, hint)}</span>
					</button>
				</li>
			))}
		</ol>
	)
}

export function DecisionBadge({ decision, round, className }: { decision?: Decision; round?: number; className?: string }) {
	let label = "Awaiting review"
	if (round && round > 1) label = `Awaiting review · round ${round}`
	let tone = "border-border bg-muted text-foreground/80"
	if (decision?.outcome === "approve") {
		label = "Approve staged"
		tone = "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
	}
	if (decision?.outcome === "reject") {
		label = "Reject staged"
		tone = "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-300"
	}
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
				tone,
				className,
			)}
		>
			{label}
		</span>
	)
}

function ListField({ id, label, value, onCommit }: { id: string; label: string; value: string[]; onCommit: (next: string[]) => void }) {
	const [draft, setDraft] = useState(value.join(", "))
	return (
		<div className="min-w-0 space-y-1.5">
			<label htmlFor={id} className="text-xs font-medium text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
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
				placeholder="Comma separated"
				className="h-9 font-mono text-xs placeholder:font-sans pointer-coarse:h-11"
			/>
		</div>
	)
}
export function MetadataFields({ sub, review }: { sub: Submission; review: Review }) {
	const view = review.effective(sub)
	const [slug, setSlug] = useState(view.slug)
	return (
		<div className="grid gap-3 sm:grid-cols-3">
			<div className="min-w-0 space-y-1.5">
				<label htmlFor={`meta-slug-${sub.id}`} className="text-xs font-medium text-muted-foreground">
					Slug {sub.type === "update" && "(fixed for updates)"}
				</label>
				<Input
					id={`meta-slug-${sub.id}`}
					value={slug}
					disabled={sub.type === "update"}
					onChange={(event) => setSlug(event.target.value)}
					onBlur={() => review.rename(sub.id, slug)}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur()
					}}
					className="h-9 font-mono text-xs placeholder:font-sans pointer-coarse:h-11"
				/>
			</div>
			<ListField id={`meta-aliases-${sub.id}`} label="Aliases" value={view.aliases} onCommit={(next) => review.setAliases(sub.id, next)} />
			<ListField
				id={`meta-categories-${sub.id}`}
				label="Categories"
				value={view.categories}
				onCommit={(next) => review.setCategories(sub.id, next)}
			/>
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
		<ul className="space-y-2">
			{list.map((hint) => (
				<li
					key={`${hint.type}-${hint.submissionId}`}
					className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
				>
					{hint.type === "variant-of" && <Layers className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />}
					{hint.type === "collision" && <AlertTriangle className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />}
					<span className="min-w-0 flex-1 basis-56 break-words">{hint.text}</span>
					<span className="flex flex-wrap gap-2">
						{onOpen && hint.submissionId && (
							<Button
								size="sm"
								variant="ghost"
								className="h-8 hover:scale-100 pointer-coarse:h-11"
								onClick={() => onOpen(hint.submissionId || "")}
							>
								Open it
							</Button>
						)}
						{hint.type === "variant-of" && onRejectAsVariant && (
							<Button
								size="sm"
								variant="outline"
								className="h-8 hover:scale-100 pointer-coarse:h-11"
								onClick={() => onRejectAsVariant(hint)}
							>
								Reject as variant of {hint.parent}
								<kbd className="hidden rounded border px-1 font-mono text-[11px] text-muted-foreground lg:inline">V</kbd>
							</Button>
						)}
					</span>
				</li>
			))}
		</ul>
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

export function RoundDiff({ previous, current, mode }: { previous: Variant[]; current: Variant[]; mode: Backdrop }) {
	const kinds = [...new Set([...previous.map((entry) => entry.kind), ...current.map((entry) => entry.kind)])]
	return (
		<ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
			{kinds.map((kind) => {
				const before = previous.find((entry) => entry.kind === kind)
				const after = current.find((entry) => entry.kind === kind)
				let change = "Replaced"
				if (!before) change = "Added"
				if (!after) change = "Removed"
				return (
					<li key={kind} className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-2">
						<span className="flex flex-col items-center gap-1">
							{before && <Swatch variant={before} mode={mode} className="size-16 rounded-md border p-1.5" />}
							{!before && (
								<span className="flex size-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
									None
								</span>
							)}
							<span className="text-[11px] text-muted-foreground">Rejected</span>
						</span>
						<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
						<span className="flex flex-col items-center gap-1">
							{after && <Swatch variant={after} mode={mode} className="size-16 rounded-md border p-1.5" />}
							{!after && (
								<span className="flex size-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
									None
								</span>
							)}
							<span className="text-[11px] text-muted-foreground">Now</span>
						</span>
						<span className="min-w-0 flex-1 space-y-1">
							<KindBadge kind={kind} />
							<span
								className={cn(
									"block text-xs font-medium",
									change === "Added" && "text-emerald-700 dark:text-emerald-400",
									change === "Replaced" && "text-amber-800 dark:text-amber-300",
									change === "Removed" && "text-red-700 dark:text-red-400",
								)}
							>
								{change}
							</span>
						</span>
					</li>
				)
			})}
		</ul>
	)
}

export function PayloadDialog({
	open,
	onOpenChange,
	payload,
	onRemove,
	onConfirm,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	payload: ReviewPayload
	onRemove: (id: string) => void
	onConfirm: () => void
}) {
	const approved = payload.items.filter((item) => item.decision === "approve").length
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] flex-col gap-4 overflow-hidden p-4 sm:max-w-3xl sm:p-6">
				<div className="space-y-1.5 pr-6">
					<DialogTitle>Submit review</DialogTitle>
					<DialogDescription>
						{approved} approved, {payload.items.length - approved} sent back for changes. Approving does not publish:{" "}
						{payload.publishQueue.length} files wait in the publish queue. Prototype only, nothing is sent.
					</DialogDescription>
				</div>
				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
					{!payload.items.length && <p className="text-sm text-muted-foreground">No staged decisions yet.</p>}
					{payload.items.map((item) => (
						<section key={item.id} className="overflow-hidden rounded-lg border">
							<header className="space-y-1.5 border-b bg-muted/30 px-3 py-2">
								<div className="flex items-start gap-2">
									<span className="min-w-0 flex-1 break-all pt-1 font-mono text-sm font-medium">{item.slug}</span>
									<Button
										size="sm"
										variant="ghost"
										className="h-8 shrink-0 hover:scale-100 pointer-coarse:h-11"
										onClick={() => onRemove(item.id)}
									>
										Unstage
									</Button>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<DecisionBadge
										decision={item.decision === "approve" ? { outcome: "approve" } : { outcome: "reject", reason: item.reason }}
									/>
									<span className="text-xs text-muted-foreground">
										{item.type === "update" && "Update · "}@{item.contributor} · round {item.round}
									</span>
								</div>
							</header>
							<div className="space-y-2 px-3 py-2 text-sm">
								{item.decision === "reject" && (
									<p>
										{item.reason || "No reason given."}{" "}
										<span className="text-muted-foreground">Returns as round {item.resubmitAs} when resubmitted.</span>
									</p>
								)}
								{!!item.fixups.length && (
									<ul className="list-inside list-disc space-y-0.5 text-blue-800 dark:text-blue-300">
										{item.fixups.map((line) => (
											<li key={line} className="break-words">
												{line}
											</li>
										))}
									</ul>
								)}
								{item.decision === "approve" && (
									<p className="break-all font-mono text-xs text-muted-foreground">{item.files.join("  ")}</p>
								)}
							</div>
							<pre className="whitespace-pre-wrap break-words border-t bg-muted/30 px-3 py-2 font-sans text-sm leading-6">
								{item.message}
							</pre>
						</section>
					))}
					<details className="rounded-lg border p-3 text-sm">
						<summary className="cursor-pointer font-medium">Raw payload (JSON)</summary>
						<pre className="mt-2 max-h-72 overflow-auto font-mono text-xs">{JSON.stringify(payload, null, 2)}</pre>
					</details>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" className="pointer-coarse:h-11" onClick={() => onOpenChange(false)}>
						Keep reviewing
					</Button>
					<Button
						className="pointer-coarse:h-11"
						disabled={!payload.items.length}
						onClick={() => {
							onConfirm()
							onOpenChange(false)
						}}
					>
						Submit {payload.items.length} decisions
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
