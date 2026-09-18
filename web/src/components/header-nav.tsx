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
		<nav aria-label="Main navigation" className="flex flex-row md:items-center items-start gap-4 md:gap-6">
			<Link
				href="/"
				aria-current={pathname === "/" ? "page" : undefined}
				className={cn(
					"hidden text-sm font-medium transition-colors hover:text-primary dark:hover:text-rose-400 cursor-pointer md:inline-flex",
					pathname === "/" && "text-primary font-semibold",
				)}
			>
				Home
			</Link>
			<Link
				prefetch
				href="/icons"
				aria-current={isIconsActive ? "page" : undefined}
				className={cn(
					"text-sm font-medium transition-colors hover:text-primary dark:hover:text-rose-400 cursor-pointer",
					isIconsActive && "text-primary font-semibold",
				)}
			>
				Icons
			</Link>
			<Link
				prefetch
				href="/community"
				aria-current={isCommunityActive ? "page" : undefined}
				className={cn(
					"text-sm font-medium transition-colors hover:text-primary dark:hover:text-rose-400 cursor-pointer",
					isCommunityActive && "text-primary font-semibold",
				)}
			>
				Community
			</Link>
			{isLoggedIn && (
				<Link
					href="/dashboard"
					aria-current={isDashboardActive ? "page" : undefined}
					className={cn(
						"text-sm font-medium transition-colors hover:text-primary dark:hover:text-rose-400 cursor-pointer",
						isDashboardActive && "text-primary font-semibold",
					)}
				>
					Dashboard
				</Link>
			)}
		</nav>
	)
}
