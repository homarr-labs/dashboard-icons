"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import type { IconSearchEntry } from "@/types/icons"
import { parseServiceListLayout, type ServiceListLayout, serviceListLayouts } from "./layouts"
import { ServiceListReview } from "./review"

// Compare reviewing a pasted dashboard as tiles, an audit list, or one service at a time.
const labels = { tiles: "Tiles", list: "List", focus: "One at a time" }

function LayoutSwitcher({ layout }: { layout: ServiceListLayout }) {
	const previous = useRef<HTMLButtonElement>(null)
	const next = useRef<HTMLButtonElement>(null)
	const cycle = useCallback(
		(direction: number) => {
			const index = (serviceListLayouts.indexOf(layout) + direction + serviceListLayouts.length) % serviceListLayouts.length
			const url = new URL(window.location.href)
			url.searchParams.set("variant", serviceListLayouts[index])
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
			if (event.key === "ArrowLeft") {
				previous.current?.focus({ preventScroll: true })
				cycle(-1)
			} else {
				next.current?.focus({ preventScroll: true })
				cycle(1)
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [cycle])

	return (
		<nav
			aria-label="Prototype layouts"
			className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full border bg-background px-1 shadow-lg"
		>
			<Button
				ref={previous}
				variant="ghost"
				size="icon"
				className="size-11 rounded-full motion-reduce:transition-none motion-reduce:hover:scale-100"
				aria-label="Previous layout"
				onClick={() => cycle(-1)}
			>
				<ArrowLeft aria-hidden="true" />
			</Button>
			<output className="min-w-28 px-1 text-center text-sm font-medium">Layout · {labels[layout]}</output>
			<Button
				ref={next}
				variant="ghost"
				size="icon"
				className="size-11 rounded-full motion-reduce:transition-none motion-reduce:hover:scale-100"
				aria-label="Next layout"
				onClick={() => cycle(1)}
			>
				<ArrowRight aria-hidden="true" />
			</Button>
		</nav>
	)
}

export default function ServiceListPrototype({ icons, initialLayout }: { icons: IconSearchEntry[]; initialLayout: ServiceListLayout }) {
	const layout = parseServiceListLayout(useSearchParams().get("variant")) ?? initialLayout
	return (
		<>
			<ServiceListReview icons={icons} layout={layout} />
			{process.env.NODE_ENV !== "production" && <LayoutSwitcher layout={layout} />}
		</>
	)
}
