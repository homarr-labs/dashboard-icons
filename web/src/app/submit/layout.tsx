import type { Metadata } from "next"
import type React from "react"
import { WEB_URL } from "@/constants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
	title: "Submit an Icon or Logo",
	description:
		"Submit your icons and logos to the Dashboard Icons collection. Share your designs with the community and help expand the collection.",
	robots: {
		index: false,
		follow: true,
	},
	alternates: {
		canonical: `${WEB_URL}/submit`,
	},
}

interface BackgroundWrapperProps {
	children: React.ReactNode
}

export default function BackgroundWrapper({ children }: BackgroundWrapperProps) {
	return (
		<div className="relative min-h-screen w-full">
			<div
				className={cn(
					"absolute inset-0",
					"[background-size:40px_40px]",
					"[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
					"dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
				)}
			/>
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-background" />
			<div className="z-20 relative">{children}</div>
		</div>
	)
}
