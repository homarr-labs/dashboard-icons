"use client"

import { useCallback, useEffect, useState } from "react"
import { IconSearch } from "@/components/icon-search"
import { Button } from "@/components/ui/button"
import { EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES } from "@/constants"
import type { IconSearchEntry } from "@/types/icons"

export function IconsBrowser() {
	const [icons, setIcons] = useState<IconSearchEntry[] | null>(null)
	const [error, setError] = useState(false)

	const retry = useCallback(() => {
		setIcons(null)
		setError(false)
	}, [])

	useEffect(() => {
		if (error) return
		const controller = new AbortController()

		async function loadIcons() {
			try {
				const response = await fetch("/api/icons/search", {
					credentials: "omit",
					signal: controller.signal,
				})
				if (!response.ok) throw new Error(`Icon catalog request failed with ${response.status}`)

				const catalog: unknown = await response.json()
				if (!Array.isArray(catalog)) throw new Error("Icon catalog response was not an array")
				setIcons(catalog as IconSearchEntry[])
			} catch (loadError) {
				if (controller.signal.aborted) return
				console.error("Failed to load icon catalog:", loadError)
				setError(true)
			}
		}

		void loadIcons()
		return () => controller.abort()
	}, [error])

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center" role="alert">
				<p className="mb-3 text-sm text-muted-foreground">The icon catalog could not be loaded.</p>
				<Button type="button" variant="outline" onClick={retry}>
					Try again
				</Button>
			</div>
		)
	}

	if (icons === null) return <IconsSearchSkeleton />

	const nativeIconCount = icons.filter((icon) => !icon.source || icon.source === "native").length

	return (
		<>
			<p className="text-muted-foreground mb-1">
				Search through {icons.length} icons and logos from Dashboard Icons
				{EXTERNAL_SOURCE_IDS.length > 0 && ` and ${EXTERNAL_SOURCE_IDS.map((id) => EXTERNAL_SOURCES[id].label).join(", ")}`}.{" "}
				{nativeIconCount} are native Dashboard Icons.
			</p>
			<IconSearch icons={icons} />
		</>
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
				{Array.from({ length: 24 }).map((_, i) => (
					<div key={i} className="flex flex-col items-center p-3 gap-2">
						<div className="h-16 w-16 bg-muted rounded-lg" />
						<div className="h-3 bg-muted rounded w-16" />
					</div>
				))}
			</div>
		</div>
	)
}
