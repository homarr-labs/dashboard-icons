"use client"

import { ArrowRight, GitPullRequestArrow, Minus, Pencil, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { reviewFixupPreview } from "@/lib/dashboard/review-fixup-draft"
import type { IconUpdate, UpdatePreview, UpdateTargetResponse } from "@/lib/icon-update"
import { type CommunityGallery, pb, type Submission } from "@/lib/pb"
import type { SubmissionVariant } from "@/lib/submission-variants"
import { SUBMISSION_VARIANTS, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"
import { backdrops, selectedRing, statusStyles, updateBadge } from "./primitives"
import { ReviewVariantEditor } from "./review-fixup-editors"

const changeStyles = {
	add: { label: "Added", className: statusStyles.added_to_collection.badge },
	replace: { label: "Replaced", className: statusStyles.pending.badge },
	remove: { label: "Removed", className: statusStyles.rejected.badge },
}
function Artwork({ preview, variant, name }: { preview?: UpdatePreview; variant: SubmissionVariant; name: string }) {
	const kind = variantKind(variant)
	return (
		<div className={cn("flex h-28 items-center justify-center rounded-lg p-3 ring-1 ring-border", backdrops[kind.background])}>
			{preview && (
				<UnoptimizedImage src={preview.url} alt={`${name} ${kind.label}, current artwork`} className="h-full w-full object-contain" />
			)}
			{!preview && <span className="rounded-md border bg-background/95 px-2 py-0.5 text-xs text-muted-foreground">Not present</span>}
		</div>
	)
}

export function IconUpdateDiff({
	record,
	update,
	snapshot,
	edit,
	onTargetReady,
}: {
	record: Submission | CommunityGallery
	update: IconUpdate
	snapshot?: UpdateTargetResponse
	edit?: {
		assets: ReturnType<typeof reviewFixupPreview>["assets"]
		selectedFile: string
		disabled: boolean
		onSelect: (file: string) => void
		onRetag: (file: string, variant: SubmissionVariant) => boolean
		onDrop: (file: string) => void
		onUndo: (file: string) => void
	}
	onTargetReady?: (ready: boolean) => void
}) {
	const [loaded, setLoaded] = useState<UpdateTargetResponse | null>(snapshot ?? null)
	const [error, setError] = useState("")
	useEffect(() => {
		if (snapshot) return
		const controller = new AbortController()
		setLoaded(null)
		setError("")
		const query = new URLSearchParams({ name: update.target.name, submission: update.target.id })
		fetch(`/api/submissions/target?${query}`, { headers: { Authorization: pb.authStore.token }, signal: controller.signal })
			.then(async (response) => {
				const result = await response.json()
				if (!response.ok) throw new Error(result.error || "Current Icon could not be loaded")
				return result as UpdateTargetResponse
			})
			.then(setLoaded)
			.catch((error: unknown) => {
				if (!controller.signal.aborted) setError(String(error))
			})
		return () => controller.abort()
	}, [update.target, snapshot])
	const allKeys = [...new Set([...Object.keys(update.target.files), ...update.variants.map((change) => change.key)])] as SubmissionVariant[]
	const keys = [...SUBMISSION_VARIANTS.filter((key) => allKeys.includes(key)), ...allKeys.filter((key) => key.startsWith("custom:"))]
	const stale = loaded && loaded.target.revision !== update.target.revision
	useEffect(() => {
		onTargetReady?.(Boolean(loaded && !loaded.target.unresolved && !stale && !error))
	}, [loaded, stale, error, onTargetReady])
	let before = "Now"
	if (snapshot) before = "Baseline"
	return (
		<section className="min-w-0 space-y-4" aria-label="Update proposal comparison">
			<div className="flex items-start gap-3">
				<span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", updateBadge)}>
					<GitPullRequestArrow className="size-4" />
				</span>
				<div className="min-w-0 space-y-1">
					<h3 className="font-semibold">{before} → Proposed</h3>
					<p className="text-sm text-muted-foreground">
						Update to <span className="font-mono font-medium text-foreground">{update.target.name}</span>. Unchanged Variants and metadata
						are preserved.
					</p>
					{snapshot && (
						<p className="text-sm text-muted-foreground">
							Unchanged files are referenced, not copied. Review and publication reload the target and check its revision.
						</p>
					)}
				</div>
			</div>
			{stale && (
				<p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
					The target has changed since this proposal. Approval and publication are blocked. Ask for a fresh proposal against the latest
					Icon.
				</p>
			)}
			{loaded?.target.unresolved && (
				<p role="alert" className="rounded-lg border border-l-2 border-l-warning bg-warning/5 p-4 text-sm">
					The target has unassigned original artwork. Its contributor must assign every file before an update can be approved or published.
				</p>
			)}
			{error && (
				<p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
					{error}. The target must be available before this proposal can be approved.
				</p>
			)}
			{!loaded && !error && (
				<output className="block h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-label="Loading current artwork" />
			)}
			{loaded && (
				<ul className="divide-y overflow-hidden rounded-lg border bg-background/50 shadow-sm">
					{keys.map((key) => {
						const change = update.variants.find((change) => change.key === key)
						const kind = variantKind(key)
						let staged: NonNullable<typeof edit>["assets"][number] | undefined
						if (change && change.action !== "remove") staged = edit?.assets.find((asset) => asset.file === change.file && !asset.dropped)
						const proposed =
							change && change.action !== "remove" ? (
								<div className={cn("flex h-28 items-center justify-center rounded-lg p-3 ring-1 ring-border", backdrops[kind.background])}>
									<UnoptimizedImage
										src={pb.files.getURL(record, change.file)}
										alt={`${record.name} ${kind.label}, proposed artwork`}
										className="h-full w-full object-contain transition-transform duration-300 group-hover/tile:scale-110"
									/>
								</div>
							) : null
						return (
							<li key={key} className={cn("min-w-0 space-y-3 p-4", !change && "bg-muted/30")}>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h4 className="break-all text-sm font-semibold">{kind.label}</h4>
									{change && (
										<span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", changeStyles[change.action].className)}>
											{changeStyles[change.action].label}
										</span>
									)}
									{!change && <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Unchanged</span>}
								</div>
								<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
									<figure className="min-w-0 space-y-1">
										<Artwork preview={loaded.previews[key]} variant={key} name={record.name} />
										<figcaption className="text-xs text-muted-foreground">{before}</figcaption>
									</figure>
									<ArrowRight className={cn("size-4 text-muted-foreground", change && "text-foreground")} aria-hidden />
									<figure className="min-w-0 space-y-1">
										{change?.action === "remove" && (
											<div
												className={cn(
													"flex h-28 items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 text-sm font-medium",
													statusStyles.rejected.text,
													statusStyles.rejected.tint,
												)}
											>
												<Minus className="size-4" aria-hidden />
												Removed
											</div>
										)}
										{staged && edit && (
											<button
												type="button"
												aria-label={`Select ${kind.label} Variant`}
												aria-pressed={edit.selectedFile === staged.file}
												onClick={() => edit.onSelect(staged.file)}
												className={cn(
													"group/tile relative block w-full rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
													edit.selectedFile === staged.file && selectedRing,
												)}
											>
												{proposed}
												{edit.selectedFile !== staged.file && (
													<span className="pointer-events-none absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md border bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100">
														<Pencil className="size-3" />
														Edit
													</span>
												)}
											</button>
										)}
										{change && change.action !== "remove" && !(staged && edit) && proposed}
										{!change && <Artwork preview={loaded.previews[key]} variant={key} name={record.name} />}
										<figcaption className="text-xs text-muted-foreground">Proposed</figcaption>
									</figure>
								</div>
								{staged && edit?.selectedFile === staged.file && (
									<ReviewVariantEditor
										key={`${staged.variant}:${staged.dropped}`}
										proposal
										file={staged.file}
										variant={staged.variant}
										originalVariant={staged.originalVariant}
										dropped={false}
										changed={staged.changed}
										disabled={edit.disabled}
										onRetag={(variant) => edit.onRetag(staged.file, variant)}
										onDrop={() => edit.onDrop(staged.file)}
										onUndo={() => edit.onUndo(staged.file)}
									/>
								)}
								{change?.action === "remove" && change.note && (
									<div
										className={cn(
											"space-y-1 rounded-md border border-l-2 p-3 text-sm",
											statusStyles.rejected.accent,
											statusStyles.rejected.tint,
										)}
									>
										<p className="text-xs font-medium text-muted-foreground">Removal note</p>
										<p className="whitespace-pre-wrap break-words">{change.note}</p>
									</div>
								)}
							</li>
						)
					})}
				</ul>
			)}
			{edit?.assets.some((asset) => asset.dropped) && (
				<section aria-label="Dropped by reviewer" className="space-y-2 rounded-lg border border-l-2 border-l-primary bg-primary/5 p-4">
					<h4 className="text-sm font-semibold">Dropped by reviewer</h4>
					<ul className="space-y-1">
						{edit.assets
							.filter((asset) => asset.dropped)
							.map((asset) => (
								<li key={asset.file} className="flex min-w-0 items-center gap-2 text-sm">
									<span className="min-w-0 flex-1 font-mono [overflow-wrap:anywhere]">{asset.file}</span>
									<Button variant="outline" size="sm" disabled={edit.disabled} onClick={() => edit.onUndo(asset.file)}>
										Restore
									</Button>
								</li>
							))}
					</ul>
				</section>
			)}
			<dl className="grid gap-4 rounded-lg border bg-background/50 p-4 text-sm shadow-sm sm:grid-cols-2">
				{(["aliases", "categories"] as const).map((field) => {
					const now = loaded?.target.metadata[field] ?? update.target.metadata[field]
					return (
						<div key={field} className="min-w-0 space-y-2">
							<dt className="font-semibold capitalize">{field}</dt>
							<dd className="flex flex-wrap gap-1.5">
								{now.map((value) => {
									const removed = update[field].remove.includes(value)
									return (
										<span
											key={value}
											className={cn(
												"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs break-all",
												removed && [statusStyles.rejected.badge, "line-through"],
											)}
										>
											{removed && <Minus className="size-3 shrink-0" aria-hidden />}
											{removed && <span className="sr-only">removed: </span>}
											{value}
										</span>
									)
								})}
								{update[field].add.map((value) => (
									<span
										key={`+${value}`}
										className={cn(
											"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs break-all",
											statusStyles.added_to_collection.badge,
										)}
									>
										<Plus className="size-3 shrink-0" aria-hidden />
										<span className="sr-only">added: </span>
										{value}
									</span>
								))}
								{!now.length && !update[field].add.length && <span className="text-muted-foreground">None</span>}
							</dd>
						</div>
					)
				})}
			</dl>
		</section>
	)
}
