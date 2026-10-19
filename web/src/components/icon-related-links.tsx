import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { EXTERNAL_SOURCES } from "@/constants"
import { getIconPagePath, type IconCategoryRelation, type IconRelations } from "@/lib/icon-relations"
import { formatIconName } from "@/lib/utils"
import type { IconRecord } from "@/types/icons"

function iconName(icon: IconRecord): string {
	if (icon.source !== "native") return icon.name
	return formatIconName(icon.name, { capitalize: true, aliases: icon.data.aliases }).replace(/\b(?:4k|dv|2d|3d)\b/gi, (suffix) =>
		suffix.toUpperCase(),
	)
}

function RelatedLinks({
	title,
	icons,
	sources = false,
	emptyMessage,
}: {
	title: string
	icons: IconRecord[]
	sources?: boolean
	emptyMessage?: string
}) {
	if (!icons.length && !emptyMessage) return null
	return (
		<section className="min-w-0 space-y-2" aria-label={title}>
			<h2 className="text-base font-semibold">{title}</h2>
			<ul className="flex flex-wrap gap-2">
				{icons.map((icon) => (
					<li key={getIconPagePath(icon)} className="min-w-0 max-w-full">
						<Link
							href={getIconPagePath(icon)}
							prefetch={false}
							className="flex min-h-11 items-center gap-3 rounded-md bg-background px-3 py-2 text-sm text-foreground hover:bg-accent active:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							<span className="min-w-0 break-words">
								{sources && icon.source === "native" ? "Also in Dashboard Icons" : iconName(icon)}
								{icon.source !== "native" && <span className="text-muted-foreground">{` · ${EXTERNAL_SOURCES[icon.source].label}`}</span>}
							</span>
							<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
						</Link>
					</li>
				))}
			</ul>
			{!icons.length && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}
		</section>
	)
}

export function IconRelatedLinks({ relations }: { relations: IconRelations }) {
	if (!relations.sameBrand.length && !relations.versions.length) return null
	return (
		<div className="flex min-w-0 flex-wrap gap-x-8 gap-y-5 rounded-lg bg-muted/50 p-4 sm:p-5 lg:col-span-4">
			<RelatedLinks title="Same brand, other sources" icons={relations.sameBrand} sources />
			<RelatedLinks title="Versions of this product" icons={relations.versions} />
		</div>
	)
}

export function IconNameRelatedLinks({ icons }: { icons: IconRecord[] }) {
	if (!icons.length) return null
	return (
		<div className="mt-12 rounded-lg bg-muted/50 p-4 sm:p-5">
			<RelatedLinks title="Related by name" icons={icons} />
		</div>
	)
}

export function IconCategoryLinks({ categories }: { categories: IconCategoryRelation[] }) {
	if (!categories.length) return null
	return (
		<div className="mt-10 space-y-6">
			{categories.map(({ category, icons }) => {
				const label = category.replaceAll("-", " ")
				return (
					<RelatedLinks
						key={category}
						title={`More from ${label}`}
						icons={icons}
						emptyMessage="No other icons are currently listed in this category."
					/>
				)
			})}
		</div>
	)
}
