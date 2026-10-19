"use client"
import { ExternalLink } from "lucide-react"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, VARIANT_KINDS } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

function caption(variant: SubmissionVariant | null) {
	if (!variant) return { label: "Unlabelled asset", description: "Not tagged as a Variant" }
	return VARIANT_KINDS[variant]
}

export function ReviewGallery({ record }: { record: Submission }) {
	return (
		<div
			className={cn("grid gap-2", record.assets.length > 1 && "grid-cols-2", record.assets.length > 4 && "sm:grid-cols-3")}
			data-review-gallery
		>
			{labelledAssets(record.extras, record.assets).map(({ file, variant }) => {
				const { label, description } = caption(variant)
				const url = pb.files.getURL(record, file)
				return (
					<figure key={file} className="min-w-0 overflow-hidden rounded-xl border bg-background only:col-span-full">
						<figcaption className="border-b px-2 py-1.5">
							<div className="flex items-center justify-between gap-1">
								<p className="text-xs font-medium">{label}</p>
								<a
									href={url}
									target="_blank"
									rel="noreferrer"
									aria-label={`Open ${label} original`}
									title={file}
									className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
								>
									{file.split(".").pop()?.toUpperCase()}
									<ExternalLink className="size-3.5" />
								</a>
							</div>
							<p className="text-xs text-muted-foreground">{description}</p>
						</figcaption>
						<div className="grid grid-cols-2">
							{["light", "dark"].map((background) => (
								<div
									key={background}
									className={cn(
										"relative flex items-center justify-center px-2 pb-2 pt-5",
										background === "light" && "bg-white text-zinc-600",
										background === "dark" && "bg-zinc-950 text-zinc-300",
										record.assets.length === 1 && "h-40 sm:h-48",
										record.assets.length > 1 && "h-20 sm:h-28",
										record.assets.length > 4 && "sm:h-24",
									)}
								>
									<span className="absolute left-2 top-1 text-[9px] uppercase tracking-wider">On {background}</span>
									<UnoptimizedImage src={url} alt={`${record.name}, ${label}, on ${background}`} className="h-full w-full object-contain" />
								</div>
							))}
						</div>
					</figure>
				)
			})}
			{record.assets.length === 0 && (
				<p className="rounded-xl border p-8 text-sm text-muted-foreground">
					No assets attached. This submission needs a usable icon before approval.
				</p>
			)}
		</div>
	)
}
