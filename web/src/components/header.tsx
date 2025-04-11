"use client"

import { IconSubmissionForm } from "@/components/icon-submission-form"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { REPO_PATH } from "@/constants"
import { cn } from "@/lib/utils"
import type { IconWithName } from "@/types/icons"
import { Github, SearchIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function Header() {
	const pathname = usePathname()
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [icons, setIcons] = useState<IconWithName[]>([])
	const [loading, setLoading] = useState(false)

	// Create breadcrumb segments from pathname
	const segments = pathname.split("/").filter(Boolean)

	// Check if current path is icons or starts with icons/
	const isIconsActive = pathname === "/icons" || pathname.startsWith("/icons/")

	// Fetch icons for search
	useEffect(() => {
		const fetchIcons = async () => {
			setLoading(true)
			try {
				const response = await fetch("/api/icons")
				const data = await response.json()
				setIcons(data)
			} catch (error) {
				console.error("Failed to fetch icons:", error)
			} finally {
				setLoading(false)
			}
		}

		if (open) {
			fetchIcons()
		}
	}, [open])

	// Register keyboard shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			}
		}

		document.addEventListener("keydown", down)
		return () => document.removeEventListener("keydown", down)
	}, [])

	const handleSelect = (iconName: string) => {
		router.push(`/icons/${iconName}`)
		setOpen(false)
	}

	return (
		<>
			<header className="border-b">
				<div className="px-4 md:px-12 flex items-center justify-between h-16">
					<div className="flex items-center gap-2 md:gap-6">
						<Link href="/" className="text-lg md:text-xl font-bold">
							Dashboard-icons
						</Link>
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
					</div>
					<div className="flex items-center gap-2 md:gap-4">
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80"
						>
							<SearchIcon className="h-4 w-4" />
							<span className="hidden md:inline">Search</span>
							<kbd className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-md hidden md:inline">CTRL+K</kbd>
						</button>
						<IconSubmissionForm />
						<Link href={REPO_PATH} target="_blank" className="text-sm font-medium transition-colors hover:text-primary">
							<Github className="h-5 w-5" />
						</Link>
						<ThemeSwitcher />
					</div>
				</div>
			</header>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput placeholder="Search for icons..." />
				<CommandList>
					{loading && <CommandEmpty>Loading icons...</CommandEmpty>}
					{!loading && icons.length === 0 && <CommandEmpty>No icons found.</CommandEmpty>}
					{!loading && icons.length > 0 && (
						<CommandGroup heading="Icons">
							{icons.map((icon) => (
								<CommandItem key={icon.name} onSelect={() => handleSelect(icon.name)}>
									<div className="mr-2 h-4 w-4 flex items-center justify-center">
										<div className="rounded-sm bg-muted w-3 h-3" />
									</div>
									{icon.name}
								</CommandItem>
							))}
						</CommandGroup>
					)}
				</CommandList>
			</CommandDialog>
		</>
	)
}
