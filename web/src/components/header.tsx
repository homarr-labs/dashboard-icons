"use client"

import { IconSubmissionForm } from "@/components/icon-submission-form"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_PATH } from "@/constants"
import { motion } from "framer-motion"
import { Github } from "lucide-react"
import Link from "next/link"
import { HeaderNav } from "./header-nav"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

export function Header() {
	return (
		<motion.header
			className="border-b sticky top-0 z-50 backdrop-blur-2xl bg-background/50 border-border/50"
			initial={{ y: -20, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
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
					<div className="hidden md:flex items-center gap-2 md:gap-4">
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
		</motion.header>
	)
}
