import { ArrowRight } from "lucide-react"
import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const InteractiveHoverButton = React.forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
	({ children, className, ...props }, ref) => {
		return (
			<Button
				ref={ref}
				variant="outline"
				className={cn(
					"group relative w-auto cursor-pointer overflow-hidden rounded-full border bg-background p-2 px-6 text-center font-semibold",
					className,
				)}
				{...props}
			>
				<div className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-primary transition-all duration-300 group-hover:scale-[100.8]" />
					<span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">{children}</span>
				</div>
				<div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
					<span>{children}</span>
					<ArrowRight />
				</div>
			</Button>
		)
	},
)

InteractiveHoverButton.displayName = "InteractiveHoverButton"
