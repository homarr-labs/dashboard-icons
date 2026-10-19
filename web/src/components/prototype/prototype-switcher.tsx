"use client"
// PROTOTYPE: floating bottom-centre pill cycling ?variant= keys with ←/→ (buttons and keyboard), hidden in production.
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"

export function PrototypeSwitcher({ variants, current }: { variants: { key: string; name: string }[]; current: string }) {
	const router = useRouter()
	const pathname = usePathname()
	const params = useSearchParams()
	const index = Math.max(
		0,
		variants.findIndex((v) => v.key === current),
	)
	const go = useCallback(
		(delta: number) => {
			const next = variants[(index + delta + variants.length) % variants.length]
			const query = new URLSearchParams(params.toString())
			query.set("variant", next.key)
			router.replace(`${pathname}?${query.toString()}`, { scroll: false })
		},
		[index, variants, params, pathname, router],
	)
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
			const el = e.target as HTMLElement | null
			if (el && (el.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") || el.isContentEditable)) return
			go(e.key === "ArrowLeft" ? -1 : 1)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [go])
	if (process.env.NODE_ENV === "production") return null
	const v = variants[index]
	return (
		<div className="fixed bottom-4 left-1/2 z-[2147483000] flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-950 p-1 text-zinc-50 shadow-2xl ring-1 ring-white/15">
			<button
				type="button"
				aria-label="Previous variant"
				onClick={() => go(-1)}
				className="flex size-8 items-center justify-center rounded-full hover:bg-white/15"
			>
				<ChevronLeft className="size-4" />
			</button>
			<span className="whitespace-nowrap px-2 text-xs font-medium">
				<span className="font-mono text-amber-300">{v.key}</span> {v.name}
			</span>
			<button
				type="button"
				aria-label="Next variant"
				onClick={() => go(1)}
				className="flex size-8 items-center justify-center rounded-full hover:bg-white/15"
			>
				<ChevronRight className="size-4" />
			</button>
		</div>
	)
}
