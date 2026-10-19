"use client"

import { Grid2x2, ImageIcon, Moon, Sun } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import {
	BACKDROP_CLASS,
	type Backdrop,
	CHECKER_STYLE,
	SectionHeading,
	VariantGlyph,
	variantBackdrop,
} from "@/components/submission/submission-ui"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { DraftAsset, SubmissionDraft } from "@/lib/submission-drafts"
import { variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export function AssetPreview({
	asset,
	background = "checker",
	className,
	alt,
}: {
	asset: DraftAsset
	background?: Backdrop
	className?: string
	alt?: string
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
				"flex min-w-0 items-center justify-center overflow-hidden rounded-lg p-3 ring-1 ring-inset ring-border",
				BACKDROP_CLASS[background],
				className,
			)}
			style={background === "checker" ? CHECKER_STYLE : undefined}
		>
			{url && (
				<UnoptimizedImage
					src={url}
					alt={alt || `${variantKind(asset.variant).label} artwork on ${background} background`}
					className="h-full w-full object-contain"
				/>
			)}
		</div>
	)
}

const PAGES = [
	{ background: "light", label: "Light page", Icon: Sun },
	{ background: "dark", label: "Dark page", Icon: Moon },
	{ background: "checker", label: "Transparent", Icon: Grid2x2 },
] as const

export function SubmissionPreview({ draft, embedded = false }: { draft: SubmissionDraft | undefined; embedded?: boolean }) {
	const base = draft?.assets.find((asset) => asset.variant === "base")
	return (
		<section
			className={cn("flex min-w-0 flex-col gap-4", !embedded && "rounded-xl border bg-card p-4 shadow-sm")}
			aria-label="Selected Icon preview"
		>
			{!embedded && (
				<SectionHeading icon={ImageIcon} tone="violet" level={2} title="Preview">
					<span className="max-w-40 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
						{draft?.name || "Untitled icon"}
					</span>
				</SectionHeading>
			)}
			{embedded && <span className="truncate font-mono text-sm text-muted-foreground">{draft?.name || "Untitled icon"}</span>}
			{base && (
				<MagicCardPointerProvider className="grid grid-cols-3 gap-2">
					{PAGES.map(({ background, label, Icon }) => (
						<MagicCard key={background} className="rounded-lg">
							<figure className="flex min-w-0 flex-col gap-1.5 p-1.5">
								<motion.div key={base.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
									<AssetPreview asset={base} background={background} className="aspect-square w-full p-4" />
								</motion.div>
								<figcaption className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
									<Icon className="size-3 shrink-0" aria-hidden />
									<span className="truncate">{label}</span>
								</figcaption>
							</figure>
						</MagicCard>
					))}
				</MagicCardPointerProvider>
			)}
			{!base && (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
						<ImageIcon className="size-5" aria-hidden />
					</span>
					<p className="max-w-56 text-sm text-muted-foreground">Add a Base to see it on light, dark and transparent backgrounds.</p>
				</div>
			)}
			{draft && draft.assets.length > 1 && (
				<div className="flex flex-col gap-2">
					<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variants on their intended backgrounds</h3>
					<ul className="grid grid-cols-3 gap-2">
						{draft.assets.map((asset) => (
							<motion.li key={asset.id} className="min-w-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
								<AssetPreview asset={asset} background={variantBackdrop(asset.variant)} className="aspect-square w-full" />
								<p className="mt-1 flex items-center justify-center gap-1 text-xs">
									<VariantGlyph variant={asset.variant} className="size-3" />
									<span className="truncate">{variantKind(asset.variant).label}</span>
								</p>
							</motion.li>
						))}
					</ul>
				</div>
			)}
		</section>
	)
}
