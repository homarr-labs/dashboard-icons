"use client"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_PATH } from "@/constants"
import { cn } from "@/lib/utils"
import { Github } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Header() {
	const pathname = usePathname()

	// Create breadcrumb segments from pathname
	const segments = pathname.split("/").filter(Boolean)

	// Check if current path is icons or starts with icons/
	const isIconsActive = pathname === "/icons" || pathname.startsWith("/icons/")

	return (
		<header className="border-b">
			<div className="container flex items-center justify-between h-16">
				<div className="flex items-center gap-6">
					<Link href="/" className="text-xl font-bold">
						Dashboard-icons
					</Link>
					<nav className="flex items-center gap-6">
						<Link
							href="/"
							className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/" && "text-primary font-semibold")}
						>
							Home
						</Link>
						<Link
							href="/icons"
							className={cn("text-sm font-medium transition-colors hover:text-primary", isIconsActive && "text-primary font-semibold")}
						>
							Icons
						</Link>
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<Link href={REPO_PATH} target="_blank" className="text-sm font-medium transition-colors hover:text-primary">
						<Github className="h-5 w-5" />
					</Link>
					<ThemeSwitcher />
				</div>
			</div>
		</header>
	)
}
