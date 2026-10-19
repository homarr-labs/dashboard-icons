"use client"

import { useEffect, useState } from "react"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { DraftAsset, SubmissionDraft } from "@/lib/submission-drafts"
import { variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export function AssetPreview({
	asset,
	background = "checker",
	className,
}: {
	asset: DraftAsset
	background?: "light" | "dark" | "checker"
	className?: string
}) {
	const [url, setUrl] = useState("")
	useEffect(() => {
		const objectUrl = URL.createObjectURL(asset.file)
		setUrl(objectUrl)
		return () => URL.revokeObjectURL(objectUrl)
	}, [asset.file])
	return (
		<div
			className={cn(
				"flex min-w-0 items-center justify-center overflow-hidden rounded-md p-3 ring-1 ring-inset ring-border",
				background === "light" && "bg-white",
				background === "dark" && "bg-zinc-950",
				background === "checker" && "bg-muted",
				className,
			)}
			style={
				background === "checker"
					? {
							backgroundImage: "conic-gradient(#a1a1aa30 25%, transparent 0 50%, #a1a1aa30 0 75%, transparent 0)",
							backgroundSize: "16px 16px",
						}
					: undefined
			}
		>
			{url && (
				<UnoptimizedImage
					src={url}
					alt={`${variantKind(asset.variant).label} artwork on ${background} background`}
					className="h-full w-full object-contain"
				/>
			)}
		</div>
	)
}

export function SubmissionPreview({ draft, embedded = false }: { draft: SubmissionDraft | undefined; embedded?: boolean }) {
	const base = draft?.assets.find((asset) => asset.variant === "base")
	return (
		<section className={cn("min-w-0 space-y-4", !embedded && "rounded-xl border bg-background p-4")} aria-label="Selected Icon preview">
			<div className="flex min-w-0 items-baseline justify-between gap-2">
				{!embedded && <h2 className="shrink-0 text-sm font-semibold">Preview</h2>}
				<span className="truncate font-mono text-sm text-muted-foreground">{draft?.name || "Untitled icon"}</span>
			</div>
			{base ? (
				<div className="grid grid-cols-3 gap-2">
					{(["light", "dark", "checker"] as const).map((background) => (
						<figure key={background} className="min-w-0 space-y-2 text-center">
							<AssetPreview asset={base} background={background} className="aspect-square w-full" />
							<figcaption className="text-sm text-muted-foreground">
								{background === "checker" ? "Transparent" : `${background[0].toUpperCase()}${background.slice(1)} page`}
							</figcaption>
						</figure>
					))}
				</div>
			) : (
				<p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
					Add a Base to see it on light, dark and transparent backgrounds.
				</p>
			)}
			{draft && draft.assets.length > 1 && (
				<div className="space-y-2">
					<h3 className="text-sm text-muted-foreground">Variants on their intended backgrounds</h3>
					<ul className="grid grid-cols-3 gap-2">
						{draft.assets.map((asset) => {
							const kind = variantKind(asset.variant)
							let background: "light" | "dark" | "checker" = "checker"
							if (kind.background !== "any") background = kind.background
							return (
								<li key={asset.id} className="min-w-0 text-center">
									<AssetPreview asset={asset} background={background} className="aspect-square w-full" />
									<p className="mt-1 break-words text-sm">{kind.label}</p>
								</li>
							)
						})}
					</ul>
				</div>
			)}
		</section>
	)
}
