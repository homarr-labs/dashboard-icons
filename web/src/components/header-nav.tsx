"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface HeaderNavProps {
	isLoggedIn?: boolean
}

export function HeaderNav({ isLoggedIn }: HeaderNavProps) {
	const pathname = usePathname()
	const isIconsActive = pathname === "/icons" || pathname.startsWith("/icons/")
	const isCommunityActive = pathname === "/community" || pathname.startsWith("/community/")
	const isDashboardActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/")

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
			<Link
				prefetch
				href="/community"
				className={cn(
					"text-sm font-medium transition-colors  dark:hover:text-rose-400 cursor-pointer",
					isCommunityActive && "text-primary font-semibold",
				)}
			>
				Community
			</Link>
			{isLoggedIn && (
				<Link
					href="/dashboard"
					className={cn(
						"text-sm font-medium transition-colors  dark:hover:text-rose-400 cursor-pointer",
						isDashboardActive && "text-primary font-semibold",
					)}
				>
					Dashboard
				</Link>
			)}
		</nav>
	)
}
