import Image from "next/image"
import Link from "next/link"
import { MagicCard } from "@/components/magicui/magic-card"
import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import { getIconImageUrl } from "@/lib/icon-url"
import { formatIconName } from "@/lib/utils"
import type { IconWithName } from "@/types/icons"

type IconKind = { type: "external"; slug: string; sourceId: ExternalSourceId } | { type: "community" } | { type: "native" }

function getIconKind(icon: IconWithName): IconKind {
	if (icon.source && icon.source !== "native" && icon.external) {
		return { type: "external", slug: icon.slug || icon.external.slug, sourceId: icon.source as ExternalSourceId }
	}
	if (typeof icon.data.base === "string" && icon.data.base.startsWith("http")) {
		return { type: "community" }
	}
	return { type: "native" }
}

function getLinkHref(kind: IconKind, name: string): string {
	switch (kind.type) {
		case "external":
			return `/icons/external/${kind.slug}`
		case "community":
			return `/community/${name}`
		case "native":
			return `/icons/${name}`
	}
}

export function IconCard({ icon, matchedAlias }: { icon: IconWithName; matchedAlias?: string }) {
	const { name } = icon
	const kind = getIconKind(icon)
	const sourceConfig = kind.type === "external" ? EXTERNAL_SOURCES[kind.sourceId] : undefined
	const imageUrl = getIconImageUrl(icon)

	return (
		<MagicCard className="group/card rounded-md shadow-md">
			{sourceConfig && (
				<div className="absolute left-0 -top-7 z-10 flex items-center gap-1.5 pr-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 bg-muted/90 backdrop-blur-sm rounded-md shadow-sm whitespace-nowrap">
					<Image src={sourceConfig.icon} alt={sourceConfig.label} width={28} height={28} className="shrink-0" unoptimized />
					<span className="text-sm sm:text-md text-muted-foreground">from {sourceConfig.label}</span>
				</div>
			)}
			<Link prefetch={false} href={getLinkHref(kind, name)} className="group flex flex-col items-center p-3 sm:p-4 cursor-pointer">
				<div className="relative h-16 w-16 mb-2 rounded-lg ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10">
					<Image
						src={imageUrl}
						alt={`${name} icon and logo`}
						fill
						sizes="32px 32px"
						className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
					/>
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200 font-medium">
					{formatIconName(name)}
				</span>
				{matchedAlias && <span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground">Alias: {matchedAlias}</span>}
			</Link>
		</MagicCard>
	)
}

export function IconPreviewCard({ preview, label, name }: { preview: string; label: string; name: string }) {
	return (
		<MagicCard className="rounded-md shadow-md">
			<div className="flex flex-col items-center p-3 sm:p-4">
				<div className="relative h-16 w-16 mb-2 rounded-lg ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10 overflow-hidden">
					<Image src={preview} alt={`${name} - ${label}`} fill unoptimized className="object-contain p-2" />
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize font-medium">{name || "icon-name"}</span>
				<span className="text-[10px] text-muted-foreground">{label}</span>
			</div>
		</MagicCard>
	)
}
