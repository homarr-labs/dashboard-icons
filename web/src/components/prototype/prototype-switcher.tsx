// PROTOTYPE (throwaway): floating bottom-centre pill that cycles ?variant= with ←/→ (buttons and keys), hidden in production.
"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"

export function PrototypeSwitcher({ variants, current }: { variants: { key: string; name: string }[]; current: string }) {
	const router = useRouter()
	const pathname = usePathname()
	const params = useSearchParams()
	const index = Math.max(
		0,
		variants.findIndex((entry) => entry.key === current),
	)
	const go = useCallback(
		(direction: number) => {
			const next = variants[(index + direction + variants.length) % variants.length]
			const search = new URLSearchParams(params.toString())
			search.set("variant", next.key)
			router.replace(`${pathname}?${search.toString()}`, { scroll: false })
		},
		[variants, index, params, pathname, router],
	)
	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
			if (event.metaKey || event.ctrlKey || event.altKey) return
			const target = event.target as HTMLElement | null
			if (target?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role=dialog]")) return
			event.preventDefault()
			go(event.key === "ArrowLeft" ? -1 : 1)
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [go])
	if (process.env.NODE_ENV === "production") return null
	const active = variants[index]
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center">
			<div className="pointer-events-auto flex items-center gap-1 rounded-full bg-zinc-950 p-1 text-zinc-50 shadow-2xl ring-1 ring-white/15 dark:bg-zinc-50 dark:text-zinc-950 dark:ring-black/15">
				<button
					type="button"
					aria-label="Previous variant"
					onClick={() => go(-1)}
					className="flex size-8 items-center justify-center rounded-full hover:bg-white/15 dark:hover:bg-black/10"
				>
					<ChevronLeft className="size-4" />
				</button>
				<span className="min-w-40 px-2 text-center text-xs font-medium tabular-nums">
					<span className="mr-1.5 rounded bg-white/15 px-1.5 py-0.5 font-mono dark:bg-black/10">{active.key}</span>
					{active.name}
				</span>
				<button
					type="button"
					aria-label="Next variant"
					onClick={() => go(1)}
					className="flex size-8 items-center justify-center rounded-full hover:bg-white/15 dark:hover:bg-black/10"
				>
					<ChevronRight className="size-4" />
				</button>
			</div>
		</div>
	)
}
