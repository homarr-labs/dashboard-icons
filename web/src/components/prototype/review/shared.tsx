// PROTOTYPE (throwaway): small shared pieces (asset preview on its intended background, badges, final payload dialog) reused by the review variants.
"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { cn } from "@/lib/utils"
import { type FixUp, type IconVariant, intendedBackground, variantKind } from "./mock"
import { type Outcome, outcomeLabels, type ReviewPayload, type SubmissionStatus, statusText } from "./state"

export const checker = {
	backgroundImage: "repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%)",
	backgroundSize: "14px 14px",
} as const

export type Backdrop = "intended" | "checker" | "light" | "dark"
export function backdropFor(variant: IconVariant, mode: Backdrop): Exclude<Backdrop, "intended"> {
	if (mode !== "intended") return mode
	const intended = intendedBackground(variant.tone)
	if (intended === "any") return "checker"
	return intended
}
export function Swatch({
	variant,
	mode = "intended",
	className,
	imgClassName,
	label,
}: {
	variant: IconVariant
	mode?: Backdrop
	className?: string
	imgClassName?: string
	label?: string
}) {
	const backdrop = backdropFor(variant, mode)
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
			<UnoptimizedImage
				src={variant.asset.url}
				alt={label || variantKind(variant)}
				className={cn("h-full max-h-full w-full max-w-full object-contain", imgClassName)}
			/>
		</span>
	)
}
export function DualSwatch({ variant, className }: { variant: IconVariant; className?: string }) {
	return (
		<span className={cn("grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border", className)}>
			<Swatch variant={variant} className="h-full p-3" />
			<Swatch variant={variant} mode="checker" className="h-full w-7 p-1" />
		</span>
	)
}

export function KindBadge({ variant, className }: { variant: Pick<IconVariant, "form" | "tone">; className?: string }) {
	const custom = variant.form !== "icon" && variant.form !== "wordmark"
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none",
				variant.tone === "light" && "border-zinc-700 bg-zinc-900 text-zinc-100",
				variant.tone === "dark" && "border-zinc-300 bg-white text-zinc-900",
				variant.tone === "colour" && "bg-muted/60",
				custom && "border-dashed border-violet-500/50",
				className,
			)}
		>
			{variantKind(variant)}
		</span>
	)
}

const outcomeTone: Record<Outcome | "undecided", string> = {
	approve: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
	changes: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
	reject: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
	undecided: "border-border bg-muted/40 text-muted-foreground",
}
export function OutcomeBadge({ outcome, className }: { outcome: Outcome | "undecided"; className?: string }) {
	return (
		<span
			className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium", outcomeTone[outcome], className)}
		>
			{outcomeLabels[outcome]}
		</span>
	)
}
const statusTone: Record<SubmissionStatus, string> = {
	approved: outcomeTone.approve,
	changes_requested: outcomeTone.changes,
	rejected: outcomeTone.reject,
	partially_approved: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
	pending: outcomeTone.undecided,
	closed_merged: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
}

export function minutesAgo(iso: string) {
	const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
	return `${Math.round(minutes / 1440)}d ago`
}

export function describeFixup(fix: FixUp) {
	if (fix.kind === "merge") return `Merge · ${fix.summary}`
	if (fix.kind === "rename") return `Rename · ${fix.from} → ${fix.to}`
	if (fix.kind === "retag") return `Retag · ${fix.from} → ${fix.to}`
	if (fix.kind === "drop") return `Drop · ${fix.file} — ${fix.reason}`
	return `Split · ${fix.slug} out of ${fix.from}`
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
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
				<DialogTitle>Submit review (prototype payload)</DialogTitle>
				<DialogDescription>
					{payload.submissions.length} submissions affected · {payload.fixups.length} reviewer fix-ups · {payload.publishQueue.length} files
					join the publish queue. Nothing is sent: this is what the backend and contributors would receive.
				</DialogDescription>
				{!payload.submissions.length && <p className="text-sm text-muted-foreground">No staged changes yet.</p>}
				<div className="space-y-3">
					{payload.submissions.map((sub) => (
						<section key={sub.id} className="rounded-lg border">
							<header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
								<span className="font-mono text-xs">{sub.id}</span>
								<span className="text-xs text-muted-foreground">@{sub.contributor}</span>
								<span className={cn("ml-auto rounded-md border px-1.5 py-0.5 text-[11px] font-medium", statusTone[sub.status])}>
									{statusText[sub.status]}
								</span>
							</header>
							{!!sub.icons.length && (
								<div className="divide-y text-xs">
									{sub.icons.map((entry) => (
										<div key={entry.slug} className="flex flex-wrap items-start gap-2 px-3 py-2">
											<span className="w-36 shrink-0 truncate font-mono font-medium">{entry.slug}</span>
											<OutcomeBadge outcome={entry.outcome} />
											<span className="flex min-w-0 flex-1 flex-wrap gap-1">
												{entry.variants.map((variant) => (
													<span
														key={variant.file}
														title={variant.note}
														className={cn("rounded border px-1 font-mono", !variant.keep && "text-muted-foreground line-through")}
													>
														{variant.file}
													</span>
												))}
											</span>
										</div>
									))}
								</div>
							)}
							<pre className="whitespace-pre-wrap break-words border-t bg-muted/30 px-3 py-2 font-sans text-xs leading-5">
								{sub.message}
							</pre>
						</section>
					))}
				</div>
				{!!payload.fixups.length && (
					<section className="rounded-lg border p-3 text-xs">
						<h3 className="mb-1 font-medium">Reviewer fix-ups</h3>
						<ul className="space-y-0.5">
							{payload.fixups.map((fix, index) => (
								<li key={index} className="font-mono">
									{describeFixup(fix)}
								</li>
							))}
						</ul>
					</section>
				)}
				{!!payload.publishQueue.length && (
					<section className="rounded-lg border p-3 text-xs">
						<h3 className="mb-1 font-medium">Publish queue after submit ({payload.publishQueue.length} files)</h3>
						<p className="font-mono text-muted-foreground">{payload.publishQueue.join("  ")}</p>
					</section>
				)}
				<details className="rounded-lg border p-3 text-xs">
					<summary className="cursor-pointer font-medium">Raw JSON</summary>
					<pre className="mt-2 max-h-72 overflow-auto font-mono text-[11px]">{JSON.stringify(payload, null, 2)}</pre>
				</details>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Keep reviewing
					</Button>
					<Button
						disabled={!payload.submissions.length}
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
