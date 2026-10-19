import { ExternalLink } from "lucide-react"
import { IconCategoryLinks } from "@/components/icon-related-links"
import { IconUsageSnippets } from "@/components/icon-usage-snippets"
import { resolveExternalIconUrl } from "@/lib/external-icon-urls"
import type { IconCategoryRelation } from "@/lib/icon-relations"
import type { ExternalIcon } from "@/types/icons"

export function ExternalIconContent({ icon, categories }: { icon: ExternalIcon; categories: IconCategoryRelation[] }) {
	const format = icon.formats.find((value) => ["svg", "png", "webp"].includes(value))
	return (
		<div className="min-w-0 lg:col-span-4">
			{format && (
				<section
					id="icon-usage"
					aria-labelledby="icon-usage-title"
					className="min-w-0 scroll-mt-24 space-y-4 rounded-lg bg-background/50 p-4 sm:p-6"
				>
					<div className="space-y-1">
						<h2 id="icon-usage-title" className="text-xl font-semibold">
							Use {icon.name}
						</h2>
						<p className="text-sm text-foreground">
							These snippets use the hosted Base ({format.toUpperCase()}). Download a customized SVG to use your own colours.
						</p>
						<a
							href={resolveExternalIconUrl(icon, format)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							Open hosted {format.toUpperCase()}
							<ExternalLink className="size-4" aria-hidden="true" />
						</a>
					</div>
					<IconUsageSnippets name={icon.name} url={resolveExternalIconUrl(icon, format)} />
				</section>
			)}
			<IconCategoryLinks categories={categories} />
		</div>
	)
}
