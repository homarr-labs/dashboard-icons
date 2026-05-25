"use client"

import { motion, useMotionTemplate, useMotionValue } from "motion/react"
import { useTheme } from "next-themes"
import type React from "react"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useMagicCardPointer } from "./magic-card-pointer"

const THEME_BORDER_COLORS: Record<string, { from: string; to: string }> = {
	dark: { from: "#ffb3c1", to: "#ff75a0" },
	light: { from: "#1e9df1", to: "#8ed0f9" },
}

interface MagicCardProps {
	children?: React.ReactNode
	className?: string
	gradientSize?: number
	gradientColor?: string
	gradientOpacity?: number
}

export function MagicCard({
	children,
	className,
	gradientSize = 200,
	gradientColor = "",
	gradientOpacity = 0.8,
}: MagicCardProps) {
	const cardRef = useRef<HTMLDivElement>(null)
	const mouseX = useMotionValue(-gradientSize)
	const mouseY = useMotionValue(-gradientSize)

	const sharedPointer = useMagicCardPointer()
	const isShared = sharedPointer !== null

	const updateFromClient = useCallback(
		(clientX: number, clientY: number) => {
			const el = cardRef.current
			if (!el) return
			const rect = el.getBoundingClientRect()
			mouseX.set(clientX - rect.left)
			mouseY.set(clientY - rect.top)
		},
		[mouseX, mouseY],
	)

	const resetPosition = useCallback(() => {
		mouseX.set(-gradientSize)
		mouseY.set(-gradientSize)
	}, [mouseX, mouseY, gradientSize])

	useEffect(() => {
		if (!isShared || !sharedPointer) return

		const unsubMove = sharedPointer.clientX.on("change", () => {
			updateFromClient(sharedPointer.clientX.get(), sharedPointer.clientY.get())
		})

		const unsubActive = sharedPointer.active.on("change", (v) => {
			if (v === 1) {
				updateFromClient(sharedPointer.clientX.get(), sharedPointer.clientY.get())
			} else {
				resetPosition()
			}
		})

		if (sharedPointer.active.get() === 1) {
			updateFromClient(sharedPointer.clientX.get(), sharedPointer.clientY.get())
		}

		return () => {
			unsubMove()
			unsubActive()
		}
	}, [isShared, sharedPointer, updateFromClient, resetPosition])

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (isShared) return
			updateFromClient(e.clientX, e.clientY)
		},
		[isShared, updateFromClient],
	)

	const handleMouseLeave = useCallback(() => {
		if (isShared) return
		resetPosition()
	}, [isShared, resetPosition])

	useEffect(() => {
		if (!isShared) resetPosition()
	}, [isShared, resetPosition])

	const { resolvedTheme } = useTheme()
	const { from: fromColor, to: toColor } = THEME_BORDER_COLORS[resolvedTheme ?? "dark"] ?? THEME_BORDER_COLORS.dark

	return (
		<div
			ref={cardRef}
			className={cn("group relative rounded-[inherit]", className)}
			onMouseMove={isShared ? undefined : handleMouseMove}
			onMouseLeave={isShared ? undefined : handleMouseLeave}
		>
			<motion.div
				className="pointer-events-none absolute inset-0 rounded-[inherit] bg-border duration-300 group-hover:opacity-100"
				style={{
					background: useMotionTemplate`
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
          ${fromColor}, 
          ${toColor}, 
          var(--border) 100%
          )
          `,
				}}
			/>
			<div className="absolute inset-px rounded-[inherit] bg-background" />
			<motion.div
				className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{
					background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, var(--magic-gradient-color, ${gradientColor}), transparent 100%)
          `,
					opacity: gradientOpacity,
				}}
			/>
			<div className="relative">{children}</div>
		</div>
	)
}
