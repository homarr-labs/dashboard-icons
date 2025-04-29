"use client"

import { IconSubmissionForm } from "@/components/icon-submission-form"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_PATH } from "@/constants"
import { getIconsArray } from "@/lib/api"
import type { IconWithName } from "@/types/icons"
import { Github, PlusCircle, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { CommandMenu } from "./command-menu"
import { HeaderNav } from "./header-nav"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

export function Header() {
	const [iconsData, setIconsData] = useState<IconWithName[]>([])
	const [isLoaded, setIsLoaded] = useState(false)
	const [commandMenuOpen, setCommandMenuOpen] = useState(false)

	useEffect(() => {
		async function loadIcons() {
			try {
				const icons = await getIconsArray()
				setIconsData(icons)
				setIsLoaded(true)
			} catch (error) {
				console.error("Failed to load icons:", error)
				setIsLoaded(true)
			}
		}

		loadIcons()
	}, [])

	// Function to open the command menu
	const openCommandMenu = () => {
		setCommandMenuOpen(true)
	}

	return (
		<header className="border-b sticky top-0 z-50 backdrop-blur-2xl bg-background/50 border-border/50">
			<div className="px-4 md:px-12 flex items-center justify-between h-16 md:h-18">
				<div className="flex items-center gap-2 md:gap-6">
					<Link href="/" className="text-lg md:text-xl font-bold group hidden md:block">
						<span className="transition-colors duration-300 group-hover:">Dashboard Icons</span>
					</Link>
					<div className="flex-nowrap">
						<HeaderNav />
					</div>
				</div>
				<div className="flex items-center gap-2 md:gap-4">
					{/* Desktop search button */}
					<div className="hidden md:block">
						<Button variant="outline" className="gap-2 cursor-pointer   transition-all duration-300" onClick={openCommandMenu}>
							<Search className="h-4 w-4 transition-all duration-300" />
							<span>Find icons</span>
							<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/80 bg-muted/80 px-1.5 font-mono text-[10px] font-medium opacity-100">
								<span className="text-xs">⌘</span>K
							</kbd>
						</Button>
					</div>

					{/* Mobile search button */}
					<div className="md:hidden">
						<Button
							variant="ghost"
							size="icon"
							className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2 "
							onClick={openCommandMenu}
						>
							<Search className="h-5 w-5 transition-all duration-300" />
							<span className="sr-only">Find icons</span>
						</Button>
					</div>

					{/* Mobile Submit Button -> triggers IconSubmissionForm dialog */}
					<div className="md:hidden">
						<IconSubmissionForm
							trigger={
								<Button variant="ghost" size="icon" className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2 ">
									<PlusCircle className="h-5 w-5 transition-all duration-300" />
									<span className="sr-only">Submit icon(s)</span>
								</Button>
							}
						/>
					</div>

					<div className="hidden md:flex items-center gap-2 md:gap-4">
						{/* Desktop Submit Button */}
						<IconSubmissionForm />
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="rounded-lg cursor-pointer  transition-all duration-300 hover:ring-2"
										asChild
									>
										<Link href={REPO_PATH} target="_blank" className="group">
											<Github className="h-5 w-5 group-hover: transition-all duration-300" />
											<span className="sr-only">View on GitHub</span>
										</Link>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>View on GitHub</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<ThemeSwitcher />
				</div>
			</div>

			{/* Single instance of CommandMenu */}
			{isLoaded && <CommandMenu icons={iconsData} open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />}
		</header>
	)
}
