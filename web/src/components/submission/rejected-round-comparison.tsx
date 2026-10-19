"use client"

import { VariantPreview } from "@/components/variant-preview"
import { applyList } from "@/lib/icon-update"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export function RejectedRoundComparison({
	record,
	defaultOpen = false,
	layout = "stack",
}: {
	record: Submission
	defaultOpen?: boolean
	layout?: "stack" | "grid"
}) {
	const previous = record.last_rejected
	if (!previous) return null
	let before = labelledAssets(previous.extras, previous.assets, previous.name, previous.icon_update)
	if (previous.asset_variants) before = previous.assets.map((file) => ({ file, variant: previous.asset_variants?.[file] || null }))
	const after = labelledAssets(record.extras, record.assets, record.name, record.icon_update)
	const beforeMetadata = { ...previous.extras }
	const afterMetadata = { ...record.extras }
	for (const field of ["aliases", "categories"] as const) {
		if (previous.icon_update) beforeMetadata[field] = applyList(previous.icon_update.target.metadata[field], previous.icon_update[field])
		if (record.icon_update) afterMetadata[field] = applyList(record.icon_update.target.metadata[field], record.icon_update[field])
	}
	const variants = [...new Set([...before, ...after].flatMap((asset) => (asset.variant ? [asset.variant] : [])))]
	const comparisons: { key: string; label: string; variant: SubmissionVariant | null; before?: string; after?: string }[] = variants.map(
		(variant) => ({
			key: variant,
			label: variantKind(variant).label,
			variant,
			before: before.find((asset) => asset.variant === variant)?.file,
			after: after.find((asset) => asset.variant === variant)?.file,
		}),
	)
	for (const asset of before.filter((asset) => !asset.variant))
		comparisons.push({
			key: `before:${asset.file}`,
			label: `Unassigned original: ${previous.asset_sources?.[asset.file] || asset.file}`,
			variant: null,
			before: asset.file,
		})
	for (const asset of after.filter((asset) => !asset.variant))
		comparisons.push({ key: `after:${asset.file}`, label: `Unassigned current: ${asset.file}`, variant: null, after: asset.file })
	return (
		<details open={defaultOpen} className="space-y-3 rounded-lg bg-muted/40 p-4">
			<summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
				Compare with rejected Round {previous.round}
			</summary>
			<p className="whitespace-pre-wrap break-words text-sm">Reviewer feedback: {previous.admin_comment || "No written feedback."}</p>
			{previous.unresolved_variants?.map((reference) => (
				<div key={`${reference.variant}-${reference.reference}`} className="space-y-1 text-sm">
					<p className="break-words">
						Original {variantKind(reference.variant).label} reference <span className="break-all font-mono">{reference.reference}</span>{" "}
						could not be matched uniquely. The original files are retained below without guessing their labels.
					</p>
					<ul>
						{reference.assets.map((file) => (
							<li key={file}>
								<a
									href={pb.files.getURL(record, file)}
									target="_blank"
									rel="noreferrer"
									className="flex min-h-11 items-center break-all underline focus-visible:outline-2 focus-visible:outline-ring"
								>
									{previous.asset_sources?.[file] || file}
								</a>
							</li>
						))}
					</ul>
				</div>
			))}
			<div
				className={cn(
					"space-y-3",
					layout === "grid" && "grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] items-start gap-4 space-y-0",
				)}
			>
				{comparisons.map(({ key, label, variant, before: old, after: current }) => {
					const unresolved = previous.unresolved_variants?.some((reference) => reference.variant === variant)
					return (
						<section key={key} className="space-y-2">
							<h3 className="break-all text-sm font-medium">
								{label}
								{variant?.startsWith("custom:") && " · Custom"}
								{variant && !current && " · Removed"}
								{variant && !old && !unresolved && " · Added"}
								{variant && unresolved && " · Previous file unresolved"}
							</h3>
							<div className="grid grid-cols-2 gap-2">
								{[
									{ file: old, title: `Rejected · Round ${previous.round}`, unresolved },
									{ file: current, title: `Current · Round ${record.round || 1}` },
								].map(({ file, title, unresolved }) => (
									<figure key={title} className="min-w-0 space-y-2">
										<figcaption className="text-sm text-muted-foreground">{title}</figcaption>
										{file ? (
											<a
												href={pb.files.getURL(record, file)}
												target="_blank"
												rel="noreferrer"
												className="block rounded focus-visible:outline-2 focus-visible:outline-ring"
											>
												<VariantPreview
													src={pb.files.getURL(record, file)}
													alt={`${label}, ${title}`}
													background={variant ? variantKind(variant).background : "any"}
													className="h-24"
												/>
												<span className="flex min-h-11 items-center text-sm underline">Open original</span>
											</a>
										) : (
											<p className="py-6 text-sm text-muted-foreground">
												{unresolved ? "See retained original candidates." : "Not included"}
											</p>
										)}
									</figure>
								))}
							</div>
						</section>
					)
				})}
			</div>
			<dl className="space-y-2 text-sm">
				{[
					{ label: "Slug", before: previous.name, after: record.name },
					{ label: "Aliases", before: beforeMetadata.aliases?.join(", "), after: afterMetadata.aliases?.join(", ") },
					{ label: "Categories", before: beforeMetadata.categories?.join(", "), after: afterMetadata.categories?.join(", ") },
					{ label: "Note", before: previous.description, after: record.description },
				]
					.filter((item) => item.before !== item.after)
					.map((item) => (
						<div key={item.label} className="break-words">
							<dt className="font-medium">{item.label}</dt>
							<dd>Before: {item.before || "None"}</dd>
							<dd>After: {item.after || "None"}</dd>
						</div>
					))}
			</dl>
		</details>
	)
}
