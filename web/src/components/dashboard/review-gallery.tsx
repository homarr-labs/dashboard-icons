"use client"
import { ExternalLink } from "lucide-react"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { pb, type Submission } from "@/lib/pb"

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
		<div className="grid gap-4 xl:grid-cols-2">
			{record.assets.map((file, index) => {
				let label = roles.get(file)?.join(" / ")
				if (!label && index === 0) label = "Primary icon"
				if (!label) label = "Additional asset · variant not specified"
				const url = pb.files.getURL(record, file)
				return (
					<figure key={file} className="min-w-0 overflow-hidden rounded-xl border bg-background">
						<figcaption className="flex items-center justify-between gap-3 border-b px-4 py-3">
							<div className="min-w-0">
								<p className="text-sm font-medium">{label}</p>
								<p className="truncate text-[11px] text-muted-foreground" title={file}>
									{file}
								</p>
							</div>
							<a
								href={url}
								target="_blank"
								rel="noreferrer"
								aria-label={`Open ${label} original`}
								className="flex shrink-0 items-center gap-2 rounded px-2 py-1 text-xs font-medium hover:bg-muted"
							>
								{file.split(".").pop()?.toUpperCase()}
								<ExternalLink className="size-3.5" />
							</a>
						</figcaption>
						<div className="grid grid-cols-2">
							{["light", "dark"].map((background) => (
								<div
									key={background}
									className={`relative flex min-h-44 items-center justify-center p-6 sm:min-h-56 lg:min-h-48 ${background === "light" ? "bg-white text-zinc-600" : "bg-zinc-950 text-zinc-400"}`}
								>
									<span className="absolute left-3 top-2 text-[10px] uppercase tracking-wider">On {background}</span>
									<UnoptimizedImage
										src={url}
										alt={`${record.name}, ${label}, on ${background}`}
										className="max-h-48 w-full object-contain"
									/>
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
