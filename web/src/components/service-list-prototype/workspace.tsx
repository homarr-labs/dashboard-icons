"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { IconSearchEntry } from "@/types/icons"
import { ServiceListReview } from "./review"

// Compare reviewing a pasted dashboard as tiles, an audit list, or one service at a time.
const layouts = ["tiles", "list", "focus"] as const
type Layout = (typeof layouts)[number]
const labels = { tiles: "Tiles", list: "List", focus: "One at a time" }

function LayoutSwitcher({ layout }: { layout: Layout }) {
	const cycle = useCallback(
		(direction: number) => {
			const next = (layouts.indexOf(layout) + direction + layouts.length) % layouts.length
			const url = new URL(window.location.href)
			url.searchParams.set("variant", layouts[next])
			window.history.replaceState(null, "", url)
		},
		[layout],
	)

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
			if (!(event.target instanceof HTMLElement)) return
			if (
				event.target.isContentEditable ||
				event.target.closest("input, textarea, select, [role=dialog], [role=combobox], [role=tablist], [role=radiogroup]")
			)
				return
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
			event.preventDefault()
			if (event.key === "ArrowLeft") cycle(-1)
			else cycle(1)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [cycle])

	return (
		<nav
			aria-label="Prototype layouts"
			className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full border bg-background px-1 shadow-lg"
		>
			<Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Previous layout" onClick={() => cycle(-1)}>
				<ArrowLeft aria-hidden="true" />
			</Button>
			<output className="min-w-28 px-1 text-center text-sm font-medium">Layout · {labels[layout]}</output>
			<Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Next layout" onClick={() => cycle(1)}>
				<ArrowRight aria-hidden="true" />
			</Button>
		</nav>
	)
}

export default function ServiceListPrototype({ icons, initialLayout }: { icons: IconSearchEntry[]; initialLayout: Layout }) {
	const variant = useSearchParams().get("variant")
	let layout = initialLayout
	if (variant === "tiles" || variant === "list" || variant === "focus") layout = variant
	return (
		<>
			<ServiceListReview icons={icons} layout={layout} />
			{process.env.NODE_ENV !== "production" && <LayoutSwitcher layout={layout} />}
		</>
	)
}
