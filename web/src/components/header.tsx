"use client"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { REPO_PATH } from "@/constants"
import { cn } from "@/lib/utils"
import { Github } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

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
							className={cn("text-sm font-medium transition-colors hover:text-primary", 
								pathname === "/" && "text-primary font-semibold"
							)}
						>
							Home
						</Link>
						<Link
							href="/icons"
							className={cn(
								"text-sm font-medium transition-colors hover:text-primary",
								isIconsActive && "text-primary font-semibold"
							)}
						>
							Icons
						</Link>
						
						{/* Breadcrumb moved into the header */}
						{segments.length > 0 && (
							<Breadcrumb className="ml-4 hidden md:flex">
								<BreadcrumbList>
									{segments.map((segment, index) => {
										const href = `/${segments.slice(0, index + 1).join("/")}`
										const isLast = index === segments.length - 1
										const displayName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
										
										return (
											<React.Fragment key={href}>
												{index > 0 && <BreadcrumbSeparator />}
												<BreadcrumbItem>
													{isLast ? (
														<BreadcrumbPage>{displayName}</BreadcrumbPage>
													) : (
														<BreadcrumbLink href={href}>{displayName}</BreadcrumbLink>
													)}
												</BreadcrumbItem>
											</React.Fragment>
										)
									})}
								</BreadcrumbList>
							</Breadcrumb>
						)}
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
