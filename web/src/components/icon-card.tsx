import Link from "next/link"
import { MagicCard } from "@/components/magicui/magic-card"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { VariantPreview } from "@/components/variant-preview"
import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import { getExternalIconPagePath, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import { getIconImageUrl, isIconAssetUrl } from "@/lib/icon-url"
import { type IconVariantMatch, variantToneClass } from "@/lib/icons/variants"
import type { VariantBackground } from "@/lib/submission-variants"
import { cn, formatIconName } from "@/lib/utils"
import type { IconSearchEntry } from "@/types/icons"

type IconKind =
	| { type: "external"; slug: string; sourceId: ExternalSourceId }
	| { type: "community"; submissionId?: string }
	| { type: "native" }

function getIconKind(icon: IconSearchEntry): IconKind {
	if (icon.source && icon.source !== "native" && icon.external) {
		return { type: "external", slug: icon.slug || icon.external.slug, sourceId: icon.source as ExternalSourceId }
	}
	if (isIconAssetUrl(icon.data.base)) {
		return { type: "community", submissionId: icon.slug }
	}
	return { type: "native" }
}

function getLinkHref(kind: IconKind, name: string): string {
	switch (kind.type) {
		case "external":
			return getExternalIconPagePath({ source: kind.sourceId, slug: kind.slug })
		case "community":
			return kind.submissionId ? `/community/submissions/${kind.submissionId}` : `/community/${name}`
		case "native":
			return `/icons/${name}`
	}
}

export function IconCard({
	icon,
	matchedAlias,
	matchedVariant,
}: {
	icon: IconSearchEntry
	matchedAlias?: string
	matchedVariant?: IconVariantMatch
}) {
	const { name } = icon
	const kind = getIconKind(icon)
	const sourceConfig = kind.type === "external" ? EXTERNAL_SOURCES[kind.sourceId] : undefined
	const imageUrl = getIconImageUrl(icon, matchedVariant?.stem)
	const toneClass = variantToneClass(matchedVariant)
	let imageAlt = `${name} icon and logo`
	if (matchedVariant) imageAlt = `${name} ${matchedVariant.label} variant`
	const themedExternalIcon = kind.type === "external" && kind.sourceId === "simpleicons" ? icon.external : undefined

	return (
		<MagicCard className="rounded-md shadow-md">
			{sourceConfig && (
				<div className="pointer-events-none absolute left-0 -top-8 z-10 inline-flex h-7 max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
					<UnoptimizedImage src={sourceConfig.icon} alt="" width={18} height={18} className="shrink-0" />
					<span className="truncate text-xs leading-none text-foreground/80">from {sourceConfig.label}</span>
				</div>
			)}
			<Link prefetch={false} href={getLinkHref(kind, name)} className="group flex flex-col items-center p-3 sm:p-4 cursor-pointer">
				<div
					className={cn(
						"mb-2 flex h-16 w-16 items-center justify-center rounded-lg ring-1",
						toneClass ?? "ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10",
					)}
				>
					{themedExternalIcon ? (
						<UnoptimizedImage
							src={resolveExternalIconUrl(themedExternalIcon, "svg_light")}
							alt={`${name} icon and logo`}
							width={56}
							height={56}
							className="max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110 dark:invert"
						/>
					) : (
						<UnoptimizedImage
							src={imageUrl}
							alt={imageAlt}
							width={56}
							height={56}
							className="max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
						/>
					)}
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200 font-medium">
					{formatIconName(name)}
				</span>
				{matchedVariant && (
					<span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground">{matchedVariant.label} variant</span>
				)}
				{!matchedVariant && matchedAlias && (
					<span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground">Alias: {matchedAlias}</span>
				)}
			</Link>
		</MagicCard>
	)
}

export function IconPreviewCard({
	preview,
	label,
	name,
	background,
}: {
	preview: string
	label: string
	name: string
	background: VariantBackground
}) {
	return (
		<MagicCard className="rounded-md shadow-md">
			<div className="flex flex-col items-center p-3 sm:p-4">
				<VariantPreview src={preview} alt={`${name} - ${label}`} background={background} className="mb-2 h-16 w-full" />
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize font-medium">{name || "icon-name"}</span>
				<span className="text-[10px] text-muted-foreground">{label}</span>
			</div>
		</MagicCard>
	)
}
