"use client"

import { Github, LayoutDashboard, LogOut, PlusCircle, Search, Star } from "lucide-react"
import Link from "next/link"
import { usePostHog } from "posthog-js/react"
import { useEffect, useState } from "react"
import { LoginModal } from "@/components/login-modal"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_NAME, REPO_PATH } from "@/constants"
import { getIconsArray } from "@/lib/api"
import { pb } from "@/lib/pb"
import { resetPostHogIdentity } from "@/lib/posthog-utils"
import type { IconWithName } from "@/types/icons"
import { CommandMenu } from "./command-menu"
import { HeaderNav } from "./header-nav"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface UserData {
	username: string
	email: string
	avatar?: string
}

function formatStars(stars: number): string {
	if (stars >= 1000) {
		return `${(stars / 1000).toFixed(1)}K`
	}
	return stars.toString()
}

export function Header() {
	const [iconsData, setIconsData] = useState<IconWithName[]>([])
	const [isLoaded, setIsLoaded] = useState(false)
	const [commandMenuOpen, setCommandMenuOpen] = useState(false)
	const [loginModalOpen, setLoginModalOpen] = useState(false)
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [userData, setUserData] = useState<UserData | undefined>(undefined)
	const [stars, setStars] = useState<number>(0)
	const posthog = usePostHog()

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

	useEffect(() => {
		async function fetchStars() {
			try {
				const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`)
				const data = await response.json()
				setStars(Math.round(data.stargazers_count / 100) * 100)
			} catch (error) {
				console.error("Failed to fetch stars:", error)
			}
		}

		fetchStars()
	}, [])

	useEffect(() => {
		const updateAuthState = () => {
			if (pb.authStore.isValid && pb.authStore.record) {
				setIsLoggedIn(true)
				setUserData({
					username: pb.authStore.record.username || pb.authStore.record.email,
					email: pb.authStore.record.email,
					avatar: pb.authStore.record.avatar
						? `${pb.baseURL}/api/files/_pb_users_auth_/${pb.authStore.record.id}/${pb.authStore.record.avatar}`
						: undefined,
				})
			} else {
				setIsLoggedIn(false)
				setUserData(undefined)
			}
		}

		updateAuthState()

		const unsubscribe = pb.authStore.onChange(() => {
			updateAuthState()
		})

		return () => {
			unsubscribe()
		}
	}, [])

	const openCommandMenu = () => {
		setCommandMenuOpen(true)
	}

	const handleSignOut = () => {
		// Track logout event before clearing auth
		if (userData) {
			posthog?.capture("user_logged_out", {
				email: userData.email,
				username: userData.username,
			})
		}

		// Clear PocketBase auth
		pb.authStore.clear()

		// Reset PostHog identity to unlink future events from this user
		// This is important for shared computers and follows PostHog best practices
		resetPostHogIdentity(posthog)
	}

	const handleSubmitClick = () => {
		if (!isLoggedIn) {
			setLoginModalOpen(true)
		}
	}

	return (
		<header className="border-b sticky top-0 z-50 backdrop-blur-2xl bg-background/50 border-border/50">
			<div className="px-4 md:px-12 flex items-center justify-between h-16 md:h-18">
				<div className="flex items-center gap-2 md:gap-6">
					<Link href="/" className="text-lg md:text-xl font-bold group hidden md:block">
						<span className="transition-colors duration-300 group-hover:">Dashboard Icons</span>
					</Link>
					<div className="flex-nowrap">
						<HeaderNav isLoggedIn={isLoggedIn} />
					</div>
				</div>
				<div className="flex items-center gap-2 md:gap-4">
					{/* Desktop search button */}
					<div className="hidden md:block">
						<Button variant="outline" className="gap-2 cursor-pointer transition-all duration-300" onClick={openCommandMenu}>
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
							className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2"
							onClick={openCommandMenu}
						>
							<Search className="h-5 w-5 transition-all duration-300" />
							<span className="sr-only">Find icons</span>
						</Button>
					</div>

					{/* Mobile Submit Button */}
					<div className="md:hidden">
						{isLoggedIn ? (
							<Button variant="ghost" size="icon" className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2" asChild>
								<Link href="/submit">
									<PlusCircle className="h-5 w-5 transition-all duration-300" />
									<span className="sr-only">Submit icon</span>
								</Link>
							</Button>
						) : (
							<Button
								variant="ghost"
								size="icon"
								className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2"
								onClick={handleSubmitClick}
							>
								<PlusCircle className="h-5 w-5 transition-all duration-300" />
								<span className="sr-only">Submit icon</span>
							</Button>
						)}
					</div>

					<div className="hidden md:flex items-center gap-2 md:gap-4">
						{isLoggedIn ? (
							<Button
								variant="outline"
								className="hidden md:inline-flex cursor-pointer transition-all duration-300 items-center gap-2"
								asChild
							>
								<Link href="/submit">
									<PlusCircle className="h-4 w-4 transition-all duration-300" /> Submit icon(s)
								</Link>
							</Button>
						) : (
							<Button
								variant="outline"
								className="hidden md:inline-flex cursor-pointer transition-all duration-300 items-center gap-2"
								onClick={handleSubmitClick}
							>
								<PlusCircle className="h-4 w-4 transition-all duration-300" /> Submit icon(s)
							</Button>
						)}
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" className="rounded-lg cursor-pointer transition-all duration-300 hover:ring-2 gap-1.5" asChild>
										<Link href={REPO_PATH} target="_blank" className="group flex items-center">
											<Github className="h-5 w-5 group-hover: transition-all duration-300" />
											{stars > 0 && (
												<>
													<span className="text-xs font-medium text-muted-foreground">{formatStars(stars)}</span>
												</>
											)}
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

					{isLoggedIn && userData && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="transition-colors duration-200 group hover:ring-2 rounded-lg cursor-pointer border border-border/50"
									variant="ghost"
									size="icon"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.username} />
										<AvatarFallback className="text-xs">{userData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
									</Avatar>
									<span className="sr-only">User menu</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56 p-3">
								<div className="space-y-3">
									<div className="flex items-center gap-3 px-1">
										<Avatar className="h-10 w-10">
											<AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.username} />
											<AvatarFallback className="text-sm font-semibold">{userData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
										</Avatar>
										<div className="flex flex-col gap-0.5 flex-1 min-w-0">
											<p className="text-sm font-semibold truncate">{userData.username}</p>
											<p className="text-xs text-muted-foreground truncate">{userData.email}</p>
										</div>
									</div>

									<DropdownMenuSeparator />

									<Button asChild variant="ghost" className="w-full justify-start gap-2 hover:bg-muted">
										<Link href="/dashboard">
											<LayoutDashboard className="h-4 w-4" />
											Dashboard
										</Link>
									</Button>

									<Button
										onClick={handleSignOut}
										variant="ghost"
										className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<LogOut className="h-4 w-4" />
										Sign out
									</Button>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{/* Single instance of CommandMenu */}
			{isLoaded && <CommandMenu icons={iconsData} open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />}

			{/* Login Modal */}
			<LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
		</header>
	)
}
