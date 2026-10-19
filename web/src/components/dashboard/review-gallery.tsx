"use client"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export type ReviewAsset = { url: string; file: string }
export type ReviewVariantRow = {
	key: string
	variant: SubmissionVariant | null
	change?: "added" | "replaced" | "removed" | "unchanged"
	before?: ReviewAsset
	after?: ReviewAsset
}

export function ReviewGallery({
	record,
	comparison,
	beforeLabel = "Now",
	afterLabel = "Proposed",
}: {
	record: Submission
	comparison?: ReviewVariantRow[]
	beforeLabel?: string
	afterLabel?: string
}) {
	const [checker, setChecker] = useState(false)
	const rows: ReviewVariantRow[] =
		comparison ||
		labelledAssets(record.extras, record.assets, record.name).map(({ file, variant }) => ({
			key: file,
			variant,
			after: { file, url: pb.files.getURL(record, file) },
		}))
	return (
		<section aria-label="Variants" className="space-y-3" data-review-gallery>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">
					Variants <span className="font-normal text-muted-foreground">({rows.length})</span>
				</h3>
				<fieldset aria-label="Preview background" className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
					{[
						{ label: "Intended background", value: false },
						{ label: "Checkerboard", value: true },
					].map(({ label, value }) => (
						<button
							type="button"
							key={label}
							aria-pressed={checker === value}
							onClick={() => setChecker(value)}
							className={cn(
								"min-h-11 rounded-md px-3 text-xs font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
								checker === value && "bg-background text-foreground",
							)}
						>
							{label}
						</button>
					))}
				</fieldset>
			</div>
			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] items-start gap-3">
				{rows.map((row) => {
					const asset = row.after || row.before
					if (!asset) return null
					let caption = { label: "Unlabelled asset", description: "Not tagged as a Variant", background: "any" }
					if (row.variant) caption = variantKind(row.variant)
					const custom = row.variant?.startsWith("custom:")
					return (
						<figure key={row.key} className="min-w-0 space-y-2 rounded-xl border p-2">
							<div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-1 text-xs">
								<span className="min-w-0 font-medium [overflow-wrap:anywhere]">
									{caption.label}
									{custom && <span className="ml-1.5 font-normal text-muted-foreground">Custom</span>}
								</span>
								{row.change && (
									<span
										className={cn("rounded px-1.5 py-1 font-medium capitalize", {
											"bg-emerald-500/10 text-emerald-800 dark:text-emerald-300": row.change === "added",
											"bg-amber-500/10 text-amber-900 dark:text-amber-300": row.change === "replaced",
											"bg-red-500/10 text-red-800 dark:text-red-300": row.change === "removed",
											"bg-muted text-muted-foreground": row.change === "unchanged",
										})}
									>
										{row.change}
									</span>
								)}
							</div>
							<div className="flex gap-px overflow-hidden rounded-md bg-border">
								{row.before && (
									<AssetPreview
										asset={row.before}
										label={`${record.name}, ${caption.label}`}
										background={caption.background}
										checker={checker}
										caption={beforeLabel}
									/>
								)}
								{row.after && (
									<AssetPreview
										asset={row.after}
										label={`${record.name}, ${caption.label}`}
										background={caption.background}
										checker={checker}
										caption={row.before || comparison ? afterLabel : undefined}
									/>
								)}
							</div>
							<figcaption className="px-1">
								<p className="text-xs leading-5 text-muted-foreground">{caption.description}</p>
								<a
									href={asset.url}
									target="_blank"
									rel="noreferrer"
									className="flex min-h-11 min-w-0 items-center gap-2 rounded font-mono text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
								>
									<span className="min-w-0 [overflow-wrap:anywhere]">{asset.file}</span>
									<ExternalLink className="size-3.5 shrink-0" />
								</a>
							</figcaption>
						</figure>
					)
				})}
			</div>
			{!rows.length && (
				<p className="rounded-lg bg-muted p-6 text-sm text-muted-foreground">
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
	return (
		<div className="relative min-w-0 flex-1">
			<div
				className={cn("flex h-36 items-center justify-center p-5 sm:h-40", {
					"bg-white": !checker && background === "light",
					"bg-zinc-950": !checker && background === "dark",
					"bg-[repeating-conic-gradient(#d4d4d8_0%_25%,#fff_0%_50%)] [background-size:16px_16px]": checker || background === "any",
				})}
			>
				<UnoptimizedImage src={asset.url} alt={label} className="h-full w-full object-contain" />
			</div>
			{caption && (
				<p className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] rounded bg-background px-1.5 py-0.5 text-xs font-medium [overflow-wrap:anywhere]">
					{caption}
				</p>
			)}
		</div>
	)
}
