"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const rainbowButtonVariants = cva(
	"relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	{
		variants: {
			variant: {
				default: "text-white shadow-lg",
				outline: "text-foreground border border-border bg-background/80 backdrop-blur-sm",
			},
			size: {
				sm: "h-9 px-4 text-sm",
				default: "h-10 px-6 text-sm",
				lg: "h-12 px-8 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

export interface RainbowButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof rainbowButtonVariants> {
	asChild?: boolean
}

const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
	({ className, variant, size, asChild = false, children, ...props }, ref) => {
		const Comp = asChild ? Slot : "button"

		return (
			<Comp
				ref={ref}
				className={cn("group isolate", rainbowButtonVariants({ variant, size }), className)}
				{...props}
			>
				<span
					aria-hidden
					className="absolute inset-0 -z-10 animate-[spin_6s_linear_infinite] bg-[conic-gradient(#f97316,#f43f5e,#a855f7,#06b6d4,#22c55e,#f59e0b,#f97316)] opacity-80"
				/>
				<span aria-hidden className="absolute inset-[1px] -z-0 rounded-full bg-background/80" />
				<span className="relative z-10 flex items-center gap-2">{children}</span>
			</Comp>
		)
	},
)

RainbowButton.displayName = "RainbowButton"

export { RainbowButton, rainbowButtonVariants }
