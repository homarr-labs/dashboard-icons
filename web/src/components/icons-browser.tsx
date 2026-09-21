"use client"

import { IconSearch } from "@/components/icon-search"
import { Button } from "@/components/ui/button"
import { EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES } from "@/constants"
import { useIconCatalog } from "@/hooks/use-icon-catalog"
import type { IconSearchEntry } from "@/types/icons"

const externalSourceNames = EXTERNAL_SOURCE_IDS.map((id) => EXTERNAL_SOURCES[id].label).join(", ")
const skeletonItems = Array.from({ length: 24 }, (_, index) => index)

export function IconsBrowser() {
	const { data: icons, isError, isPending, refetch } = useIconCatalog()

	if (isPending) return <IconsSearchSkeleton />
	if (isError) return <IconsCatalogError onRetry={() => void refetch()} />

	return (
		<>
			<IconsCatalogSummary icons={icons} />
			<IconSearch icons={icons} />
		</>
	)
}

function IconsCatalogSummary({ icons }: { icons: IconSearchEntry[] }) {
	const nativeIconCount = icons.reduce((count, icon) => count + (icon.source && icon.source !== "native" ? 0 : 1), 0)

	return (
		<p className="text-muted-foreground mb-1">
			Search through {icons.length} icons and logos from Dashboard Icons{externalSourceNames && ` and ${externalSourceNames}`}.{" "}
			{nativeIconCount} are native Dashboard Icons.
		</p>
	)
}

function IconsCatalogError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center" role="alert">
			<p className="mb-3 text-sm text-muted-foreground">The icon catalog could not be loaded.</p>
			<Button type="button" variant="outline" onClick={onRetry}>
				Try again
			</Button>
		</div>
	)
}

function IconsSearchSkeleton() {
	return (
		<div aria-busy="true" className="space-y-4 w-full animate-pulse motion-reduce:animate-none">
			<output className="sr-only">Loading icons...</output>
			<div className="h-5 bg-muted rounded w-2/3" />
			<div className="h-10 bg-muted rounded-lg w-full" />
			<div className="flex gap-2">
				<div className="h-8 bg-muted rounded w-28" />
				<div className="h-8 bg-muted rounded w-28" />
			</div>
			<div className="h-px bg-border" />
			<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
				{skeletonItems.map((item) => (
					<div key={item} className="flex flex-col items-center p-3 gap-2">
						<div className="h-16 w-16 bg-muted rounded-lg" />
						<div className="h-3 bg-muted rounded w-16" />
					</div>
				))}
			</div>
		</div>
	)
}
