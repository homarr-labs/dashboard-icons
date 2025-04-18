"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function HeaderNav() {
	const pathname = usePathname()
	const isIconsActive = pathname === "/icons" || pathname.startsWith("/icons/")

	return (
		<nav className="flex flex-row md:items-center items-start gap-4 md:gap-6">
			<Link
				href="/"
				className={cn(
					"text-sm font-medium transition-colors  dark:hover:text-rose-400 cursor-pointer",
					pathname === "/" && "text-primary font-semibold",
				)}
			>
				Home
			</Link>
			<Link
				prefetch
				href="/icons"
				className={cn(
					"text-sm font-medium transition-colors  dark:hover:text-rose-400 cursor-pointer",
					isIconsActive && "text-primary font-semibold",
				)}
			>
				Icons
			</Link>
		</nav>
	)
}
