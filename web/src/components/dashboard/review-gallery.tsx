"use client"
import { ExternalLink } from "lucide-react"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { pb, type Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"

export function ReviewGallery({ record }: { record: Submission }) {
	const roles = new Map<string, string[]>()
	for (const [filename, label] of [
		[record.extras?.colors?.light, "Icon · light variant"],
		[record.extras?.colors?.dark, "Icon · dark variant"],
		[record.extras?.wordmark?.light, "Wordmark · light variant"],
		[record.extras?.wordmark?.dark, "Wordmark · dark variant"],
	]) {
		if (filename && label) roles.set(filename, [...(roles.get(filename) || []), label])
	}
	return (
		<div
			className={cn("grid gap-2", record.assets.length > 1 && "grid-cols-2", record.assets.length > 4 && "sm:grid-cols-3")}
			data-review-gallery
		>
			{record.assets.map((file, index) => {
				let label = roles.get(file)?.join(" / ")
				if (!label && index === 0) label = "Primary icon"
				if (!label) label = "Additional asset · variant not specified"
				const url = pb.files.getURL(record, file)
				return (
					<figure key={file} className="min-w-0 overflow-hidden rounded-xl border bg-background only:col-span-full">
						<figcaption className="flex items-center justify-between gap-1 border-b px-2 py-1.5">
							<div className="min-w-0">
								<p className="text-xs font-medium">{label}</p>
							</div>
							<a
								href={url}
								target="_blank"
								rel="noreferrer"
								aria-label={`Open ${label} original`}
								title={file}
								className="flex shrink-0 items-center gap-1 rounded py-1 text-xs font-medium hover:bg-muted"
							>
								{file.split(".").pop()?.toUpperCase()}
								<ExternalLink className="size-3.5" />
							</a>
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
