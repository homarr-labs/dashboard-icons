"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function HeaderNav() {
	const pathname = usePathname()
	const isIconsActive = pathname === "/icons" || pathname.startsWith("/icons/")

	return (
		<nav className="flex items-center gap-2 md:gap-6">
			<Link
				href="/"
				className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/" && "text-primary font-semibold")}
			>
				Home
			</Link>
			<Link
				prefetch
				href="/icons"
				className={cn("text-sm font-medium transition-colors hover:text-primary", isIconsActive && "text-primary font-semibold")}
			>
				Icons
			</Link>
		</nav>
	)
}
