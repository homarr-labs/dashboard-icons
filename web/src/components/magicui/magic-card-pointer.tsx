"use client"

import { createContext, useContext, useCallback, useRef, type ReactNode } from "react"
import { useMotionValue, type MotionValue } from "motion/react"
import { cn } from "@/lib/utils"

interface PointerContext {
	clientX: MotionValue<number>
	clientY: MotionValue<number>
	active: MotionValue<number>
}

const MagicCardPointerContext = createContext<PointerContext | null>(null)

export function useMagicCardPointer() {
	return useContext(MagicCardPointerContext)
}

interface ProviderProps {
	children: ReactNode
	className?: string
}

export function MagicCardPointerProvider({ children, className }: ProviderProps) {
	const clientX = useMotionValue(0)
	const clientY = useMotionValue(0)
	const active = useMotionValue(0)
	const ref = useRef<HTMLDivElement>(null)

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			clientX.set(e.clientX)
			clientY.set(e.clientY)
			if (active.get() !== 1) active.set(1)
		},
		[clientX, clientY, active],
	)

	const handlePointerLeave = useCallback(() => {
		active.set(0)
	}, [active])

	return (
		<MagicCardPointerContext.Provider value={{ clientX, clientY, active }}>
			<div
				ref={ref}
				className={cn(className)}
				onPointerMove={handlePointerMove}
				onPointerLeave={handlePointerLeave}
			>
				{children}
			</div>
		</MagicCardPointerContext.Provider>
	)
}
