import { cn } from "@/lib/utils"

interface GridBackgroundProps {
	className?: string
}

export function GridBackground({ className }: GridBackgroundProps) {
	return (
		<div className={cn("absolute inset-0 overflow-hidden", className)}>
			{/* Grid pattern */}
			<div
				className={cn(
					"absolute inset-0",
					"[background-size:40px_40px]",
					"[background-image:linear-gradient(to_right,rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.1)_1px,transparent_1px)]",
					"dark:[background-image:linear-gradient(to_right,rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.1)_1px,transparent_1px)]",
				)}
			/>

			<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-slate-900" />
		</div>
	)
}
