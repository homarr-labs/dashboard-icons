import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Icon } from "@/types/icons"
import { IconCard } from "./icon-card"

interface IconsGridProps {
	filteredIcons: { name: string; data: Icon }[]
	matchedAliases: Record<string, string>
}

/**
 * Base grid layout component used for both regular icon display and virtualized display
 * Displays icons in a responsive grid with different column counts per breakpoint
 */
export const GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"

/**
 * Simple non-virtualized grid for displaying icons
 * Used for smaller lists (e.g., related icons, first 120 results)
 */
export function IconsGrid({ filteredIcons, matchedAliases }: IconsGridProps) {
	return (
		<div className={`${GRID_CLASSES} mt-2`}>
			{filteredIcons.slice(0, 120).map(({ name, data }) => (
				<IconCard key={name} name={name} data={data} matchedAlias={matchedAliases[name]} />
			))}
		</div>
	)
}

/**
 * Virtualized grid for displaying large lists of icons efficiently
 * Only renders visible rows for better performance with thousands of icons
 */
export function VirtualizedIconsGrid({ filteredIcons, matchedAliases }: IconsGridProps) {
	const listRef = useRef<HTMLDivElement | null>(null)
	const [windowWidth, setWindowWidth] = useState(0)

	useEffect(() => {
		setWindowWidth(window.innerWidth)

		const handleResize = () => {
			setWindowWidth(window.innerWidth)
		}
		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	const columnCount = useMemo(() => {
		if (windowWidth >= 1280) return 8 // xl
		if (windowWidth >= 1024) return 6 // lg
		if (windowWidth >= 768) return 4 // md
		if (windowWidth >= 640) return 3 // sm
		return 2 // default
	}, [windowWidth])

	const rowCount = Math.ceil(filteredIcons.length / columnCount)
	const rowVirtualizer = useWindowVirtualizer({
		count: rowCount,
		estimateSize: () => 140,
		overscan: 2,
	})

	return (
		<div ref={listRef} className="mt-2">
			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const rowStart = virtualRow.index * columnCount
					const rowEnd = Math.min(rowStart + columnCount, filteredIcons.length)
					const rowIcons = filteredIcons.slice(rowStart, rowEnd)

					return (
						<div
							key={virtualRow.key}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								minHeight: 124,
								width: "100%",
								transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
							}}
							className={GRID_CLASSES}
						>
							{rowIcons.map(({ name, data }) => (
								<IconCard key={name} name={name} data={data} matchedAlias={matchedAliases[name]} />
							))}
						</div>
					)
				})}
			</div>
		</div>
	)
}
