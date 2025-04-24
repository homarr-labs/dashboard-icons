import type { Icon } from "@/types/icons"

import { IconCard } from "./icon-card"

interface IconsGridProps {
	filteredIcons: { name: string; data: Icon }[]
	matchedAliases: Record<string, string>
}

export function IconsGrid({ filteredIcons, matchedAliases }: IconsGridProps) {
	return (
		<>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-2">
				{filteredIcons.slice(0, 120).map(({ name, data }) => (
					<IconCard key={name} name={name} data={data} matchedAlias={matchedAliases[name] || null} />
				))}
			</div>
			{filteredIcons.length > 120 && <p className="text-sm text-muted-foreground">And {filteredIcons.length - 120} more...</p>}
		</>
	)
}
