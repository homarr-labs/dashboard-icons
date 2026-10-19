"use client"

import { Minus } from "lucide-react"
import { useEffect, useState } from "react"
import { ChangeBadge, UpdateArtwork } from "@/components/submission/icon-update-editor"
import { Button } from "@/components/ui/button"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { reviewFixupPreview } from "@/lib/dashboard/review-fixup-draft"
import { applyList, type IconUpdate, type UpdateTargetResponse } from "@/lib/icon-update"
import { type CommunityGallery, pb, type Submission } from "@/lib/pb"
import type { SubmissionVariant } from "@/lib/submission-variants"
import { SUBMISSION_VARIANTS, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"
import { ReviewVariantEditor } from "./review-fixup-editors"

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
	return (
		<section className="min-w-0 space-y-4" aria-label="Update proposal comparison">
			<div className="space-y-1">
				<h3 className="font-semibold">{snapshot ? "Baseline → Proposed" : "Now → Proposed"}</h3>
				<p className="text-sm text-muted-foreground">Update to {update.target.name}. Unchanged Variants and metadata are preserved.</p>
				{snapshot && (
					<p className="text-sm text-muted-foreground">
						Unchanged files are referenced, not copied. Review and publication reload the target and check its revision.
					</p>
				)}
			</div>
			{stale && (
				<p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
					The target has changed since this proposal. Approval and publication are blocked. Ask for a fresh proposal against the latest
					Icon.
				</p>
			)}
			{loaded?.target.unresolved && (
				<p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm">
					The target has unassigned original artwork. Its contributor must assign every file before an update can be approved or published.
				</p>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}. The target must be available before this proposal can be approved.
				</p>
			)}
			{!loaded && !error && (
				<output className="block h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-label="Loading current artwork" />
			)}
			{loaded && (
				<ul className="divide-y rounded-xl border bg-background">
					{keys.map((key) => {
						const change = update.variants.find((change) => change.key === key)
						const kind = variantKind(key)
						let staged: NonNullable<typeof edit>["assets"][number] | undefined
						if (change && change.action !== "remove") staged = edit?.assets.find((asset) => asset.file === change.file && !asset.dropped)
						const proposed =
							change && change.action !== "remove" ? (
								<div
									className={cn(
										"flex h-24 items-center justify-center rounded-md p-3",
										kind.background === "any" && "bg-muted",
										kind.background === "light" && "bg-white",
										kind.background === "dark" && "bg-zinc-950",
									)}
								>
									<UnoptimizedImage
										src={pb.files.getURL(record, change.file)}
										alt={`${record.name} ${kind.label}, proposed artwork`}
										className="h-full w-full object-contain"
									/>
								</div>
							) : null
						return (
							<li key={key} className="min-w-0 space-y-3 p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h4 className="break-all text-sm font-medium">{kind.label}</h4>
									<ChangeBadge action={change?.action} />
								</div>
								<div className="grid grid-cols-2 gap-3">
									<figure className="min-w-0 space-y-1">
										<UpdateArtwork preview={loaded.previews[key]} variant={key} name={record.name} />
										<figcaption className="text-sm text-muted-foreground">{snapshot ? "Baseline reference" : "Now"}</figcaption>
									</figure>
									<figure className="min-w-0 space-y-1">
										{change?.action === "remove" ? (
											<div className="flex h-24 items-center justify-center gap-2 rounded-md bg-red-500/10 text-sm font-medium text-red-800 dark:text-red-200">
												<Minus className="size-4" aria-hidden />
												Removed
											</div>
										) : staged && edit ? (
											<button
												type="button"
												aria-label={`Select ${kind.label} Variant`}
												aria-pressed={edit.selectedFile === staged.file}
												onClick={() => edit.onSelect(staged.file)}
												className={cn(
													"block min-h-11 w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
													edit.selectedFile === staged.file && "ring-2 ring-ring",
												)}
											>
												{proposed}
											</button>
										) : change ? (
											proposed
										) : (
											<UpdateArtwork preview={loaded.previews[key]} variant={key} name={record.name} />
										)}
										<figcaption className="text-sm text-muted-foreground">Proposed</figcaption>
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
									<div className="space-y-1 rounded-lg bg-red-500/5 p-4 text-sm">
										<p className="font-medium">Removal note</p>
										<p className="whitespace-pre-wrap break-words">{change.note}</p>
									</div>
								)}
							</li>
						)
					})}
				</ul>
			)}
			{edit?.assets.some((asset) => asset.dropped) && (
				<section aria-label="Dropped by reviewer" className="space-y-2 rounded-xl bg-muted/50 p-4">
					<h4 className="text-sm font-medium">Dropped by reviewer</h4>
					<ul className="space-y-1">
						{edit.assets
							.filter((asset) => asset.dropped)
							.map((asset) => (
								<li key={asset.file} className="flex min-w-0 items-center gap-2 text-sm">
									<span className="min-w-0 flex-1 font-mono [overflow-wrap:anywhere]">{asset.file}</span>
									<Button variant="outline" disabled={edit.disabled} onClick={() => edit.onUndo(asset.file)}>
										Restore
									</Button>
								</li>
							))}
					</ul>
				</section>
			)}
			<dl className="space-y-4 rounded-xl bg-muted/40 p-4 text-sm">
				{(["aliases", "categories"] as const).map((field) => (
					<div key={field} className="space-y-2">
						<dt className="font-semibold capitalize">{field}</dt>
						<dd className="break-words">
							<span className="text-muted-foreground">{snapshot ? "Baseline: " : "Now: "}</span>
							{(loaded?.target.metadata[field] ?? update.target.metadata[field]).join(", ") || "None"}
						</dd>
						<dd className="break-words">
							<span className="text-muted-foreground">Proposed: </span>
							{applyList(update.target.metadata[field], update[field]).join(", ") || "None"}
						</dd>
						{update[field].add.map((value) => (
							<dd key={`+${value}`} className="break-words text-emerald-800 dark:text-emerald-200">
								+ added: {value}
							</dd>
						))}
						{update[field].remove.map((value) => (
							<dd key={`-${value}`} className="break-words text-amber-800 dark:text-amber-200">
								− removed: {value}
							</dd>
						))}
					</div>
				))}
			</dl>
		</section>
	)
}
