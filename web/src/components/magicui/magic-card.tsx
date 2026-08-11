"use client"

import { motion, useMotionTemplate, useMotionValue } from "motion/react"
import type React from "react"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useMagicCardPointer } from "./magic-card-pointer"

interface MagicCardProps {
	children?: React.ReactNode
	className?: string
	gradientSize?: number
	gradientColor?: string
	gradientOpacity?: number
}

export function MagicCard({ children, className, gradientSize = 200, gradientColor = "", gradientOpacity = 0.8 }: MagicCardProps) {
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
		(e: MouseEvent) => {
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
		const el = cardRef.current
		if (!el || isShared) return

		el.addEventListener("mousemove", handleMouseMove)
		el.addEventListener("mouseleave", handleMouseLeave)

		return () => {
			el.removeEventListener("mousemove", handleMouseMove)
			el.removeEventListener("mouseleave", handleMouseLeave)
		}
	}, [isShared, handleMouseMove, handleMouseLeave])

	useEffect(() => {
		if (!isShared) resetPosition()
	}, [isShared, resetPosition])

	return (
		<div ref={cardRef} className={cn("group relative rounded-[inherit]", className)}>
			<motion.div
				className="pointer-events-none absolute inset-0 rounded-[inherit] bg-border duration-300 group-hover:opacity-100"
				style={{
					background: useMotionTemplate`
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
		  var(--magic-border-from),
		  var(--magic-border-to),
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
