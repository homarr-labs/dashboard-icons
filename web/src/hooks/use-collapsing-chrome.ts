import { useEffect, useState } from "react"

const ATTRIBUTE = "data-chrome-collapsed"
const COLLAPSE_AFTER = 24

export function useCollapsingChrome() {
	const [element, setElement] = useState<HTMLElement | null>(null)
	useEffect(() => {
		if (!element) return
		const root = document.documentElement
		const collapse = () => {
			if (element.scrollTop > COLLAPSE_AFTER) root.setAttribute(ATTRIBUTE, "")
		}
		const expand = (event: WheelEvent) => {
			if (event.deltaY < 0 && element.scrollTop <= 0) root.removeAttribute(ATTRIBUTE)
		}
		let touchY = 0
		const touchStart = (event: TouchEvent) => {
			touchY = event.touches[0]?.clientY ?? 0
		}
		const touchMove = (event: TouchEvent) => {
			const y = event.touches[0]?.clientY ?? 0
			if (y > touchY && element.scrollTop <= 0) root.removeAttribute(ATTRIBUTE)
		}
		element.addEventListener("scroll", collapse, { passive: true })
		element.addEventListener("wheel", expand, { passive: true })
		element.addEventListener("touchstart", touchStart, { passive: true })
		element.addEventListener("touchmove", touchMove, { passive: true })
		return () => {
			element.removeEventListener("scroll", collapse)
			element.removeEventListener("wheel", expand)
			element.removeEventListener("touchstart", touchStart)
			element.removeEventListener("touchmove", touchMove)
			root.removeAttribute(ATTRIBUTE)
		}
	}, [element])
	return setElement
}
