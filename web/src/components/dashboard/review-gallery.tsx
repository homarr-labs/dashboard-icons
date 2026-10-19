"use client"
import { ExternalLink, Grid2x2, Pencil, Shapes, SunMoon } from "lucide-react"
import { useState } from "react"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { reviewFixupPreview } from "@/lib/dashboard/review-fixup-draft"
import type { ReviewFixups } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"
import { IconUpdateDiff } from "./icon-update-diff"
import { backdrops, selectedRing, statusStyles } from "./primitives"
import { ReviewVariantEditor } from "./review-fixup-editors"

export type ReviewAsset = { url: string; file: string }
export type ReviewVariantRow = {
	key: string
	variant: SubmissionVariant | null
	change?: "added" | "replaced" | "removed" | "unchanged"
	before?: ReviewAsset
	after?: ReviewAsset
	dropped?: boolean
	fixupChanged?: boolean
	originalVariant?: SubmissionVariant | null
}

export function ReviewGallery({
	record,
	comparison,
	beforeLabel = "Now",
	afterLabel = "Proposed",
	edit,
	onTargetReady,
}: {
	record: Submission
	comparison?: ReviewVariantRow[]
	beforeLabel?: string
	afterLabel?: string
	onTargetReady?: (ready: boolean) => void
	edit?: {
		fixups: ReviewFixups
		selectedFile: string
		disabled: boolean
		onSelect: (file: string) => void
		onRetag: (file: string, variant: SubmissionVariant) => boolean
		onDrop: (file: string) => void
		onUndo: (file: string) => void
	}
}) {
	const [checker, setChecker] = useState(false)
	let rows: ReviewVariantRow[] =
		comparison ||
		labelledAssets(record.extras, record.assets, record.name, record.icon_update).map(({ file, variant }) => ({
			key: file,
			variant,
			after: { file, url: pb.files.getURL(record, file) },
		}))
	const preview = edit && reviewFixupPreview(record, edit.fixups)
	if (preview)
		rows = preview.assets.map((asset) => ({
			...asset,
			key: asset.file,
			fixupChanged: asset.changed,
			after: { file: asset.file, url: pb.files.getURL(record, asset.file) },
		}))
	if (record.icon_update)
		return (
			<IconUpdateDiff
				record={record}
				update={preview?.record.icon_update || record.icon_update}
				edit={edit && preview && { ...edit, assets: preview.assets }}
				onTargetReady={onTargetReady}
			/>
		)
	return (
		<section aria-label="Variants" className="space-y-3" data-review-gallery>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="flex items-center gap-2 text-sm font-semibold">
					<Shapes className="size-4 text-muted-foreground" />
					Variants
					<span className="rounded-full border bg-muted px-1.5 text-xs font-medium tabular-nums">
						{rows.filter((row) => !row.dropped).length}
					</span>
				</h3>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={checker ? "checker" : "intended"}
					onValueChange={(value) => {
						if (value) setChecker(value === "checker")
					}}
					aria-label="Preview background"
				>
					<ToggleGroupItem value="intended" className="flex-none px-2.5 max-lg:min-h-11">
						<SunMoon />
						Intended background
					</ToggleGroupItem>
					<ToggleGroupItem value="checker" className="flex-none px-2.5 max-lg:min-h-11">
						<Grid2x2 />
						Checkerboard
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
			{edit && (
				<p className="text-xs text-muted-foreground">
					Click a tile to change its kind or drop an optional Variant. Changes stay in this review draft.
				</p>
			)}
			<MagicCardPointerProvider className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] items-start gap-3">
				{rows.map((row) => {
					const asset = row.after || row.before
					if (!asset) return null
					let caption = { label: "Unlabelled asset", description: "Not tagged as a Variant", background: "any" }
					if (row.variant) caption = variantKind(row.variant)
					const custom = row.variant?.startsWith("custom:")
					const selected = edit?.selectedFile === asset.file
					return (
						<MagicCard key={row.key} className={cn("rounded-md shadow-md", selected && selectedRing, row.dropped && "opacity-70")}>
							<figure className="min-w-0 space-y-2 p-3">
								<div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 text-xs">
									<span className="flex min-w-0 items-center gap-1.5 font-semibold [overflow-wrap:anywhere]">
										<span
											className={cn(
												"size-2.5 shrink-0 rounded-full ring-1 ring-border",
												caption.background === "light" && backdrops.light,
												caption.background === "dark" && backdrops.dark,
												caption.background === "any" && [backdrops.any, "bg-[length:5px_5px]"],
											)}
										/>
										{caption.label}
										{custom && (
											<Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
												Custom
											</Badge>
										)}
									</span>
									{row.change && (
										<Badge
											variant="outline"
											className={cn("capitalize", {
												[statusStyles.added_to_collection.badge]: row.change === "added",
												[statusStyles.pending.badge]: row.change === "replaced",
												[statusStyles.rejected.badge]: row.change === "removed",
												"text-muted-foreground": row.change === "unchanged",
											})}
										>
											{row.change}
										</Badge>
									)}
									{row.fixupChanged && (
										<Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
											{row.dropped ? "Drop staged" : "Kind staged"}
										</Badge>
									)}
								</div>
								<div className="flex gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border">
									{row.before && (
										<AssetPreview
											asset={row.before}
											label={`${record.name}, ${caption.label}`}
											background={caption.background}
											checker={checker}
											caption={beforeLabel}
										/>
									)}
									{row.after && edit && (
										<button
											type="button"
											aria-label={`Select ${caption.label} Variant`}
											aria-pressed={selected}
											onClick={() => edit.onSelect(asset.file)}
											className="group/tile relative min-w-0 flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
										>
											<AssetPreview
												asset={row.after}
												label={`${record.name}, ${caption.label}`}
												background={caption.background}
												checker={checker}
												caption={row.dropped ? "Drop staged" : undefined}
											/>
											{!selected && (
												<span className="pointer-events-none absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md border bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
													<Pencil className="size-3" />
													Edit
												</span>
											)}
										</button>
									)}
									{row.after && !edit && (
										<AssetPreview
											asset={row.after}
											label={`${record.name}, ${caption.label}`}
											background={caption.background}
											checker={checker}
											caption={row.before || comparison ? afterLabel : undefined}
										/>
									)}
								</div>
								<figcaption className="space-y-0.5">
									<p className="text-xs text-muted-foreground">{caption.description}</p>
									<a
										href={asset.url}
										target="_blank"
										rel="noreferrer"
										className="flex min-w-0 items-center gap-1.5 rounded-sm py-1 font-mono text-[11px] text-muted-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 max-lg:min-h-11"
									>
										<span className="min-w-0 [overflow-wrap:anywhere]">{asset.file}</span>
										<ExternalLink className="size-3 shrink-0" />
									</a>
								</figcaption>
								{edit && selected && (
									<ReviewVariantEditor
										key={`${row.variant}:${row.dropped}`}
										file={asset.file}
										variant={row.variant}
										originalVariant={row.originalVariant ?? null}
										dropped={!!row.dropped}
										changed={!!row.fixupChanged}
										disabled={edit.disabled}
										onRetag={(variant) => edit.onRetag(asset.file, variant)}
										onDrop={() => edit.onDrop(asset.file)}
										onUndo={() => edit.onUndo(asset.file)}
									/>
								)}
							</figure>
						</MagicCard>
					)
				})}
			</MagicCardPointerProvider>
			{!rows.length && (
				<p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
					No assets attached. A usable Icon is required before approval.
				</p>
			)}
		</section>
	)
}

function AssetPreview({
	asset,
	label,
	background,
	checker,
	caption,
}: {
	asset: ReviewAsset
	label: string
	background: string
	checker: boolean
	caption?: string
}) {
	let backdrop = backdrops.any
	if (!checker && background === "light") backdrop = backdrops.light
	if (!checker && background === "dark") backdrop = backdrops.dark
	return (
		<div className="relative min-w-0 flex-1">
			<div className={cn("flex h-36 items-center justify-center p-5 sm:h-40", backdrop)}>
				<UnoptimizedImage
					src={asset.url}
					alt={label}
					className="h-full w-full object-contain transition-transform duration-300 group-hover/tile:scale-110"
				/>
			</div>
			{caption && (
				<p className="absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] rounded-md border bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground [overflow-wrap:anywhere]">
					{caption}
				</p>
			)}
		</div>
	)
}
