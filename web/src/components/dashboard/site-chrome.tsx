"use client"
import { ArrowUpRight, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-submissions"
import { pb } from "@/lib/pb"
export function SiteFooterSlot({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	if (pathname !== "/dashboard") return children
	return (
		<footer className="flex h-11 items-center justify-between gap-2 border-t bg-background px-4 text-[10px] text-muted-foreground sm:px-8">
			<span className="min-w-0 truncate">Dashboard Icons workspace</span>
			<div className="flex shrink-0 items-center gap-3">
				<Link href="/privacy">Privacy</Link>
				<Link href="/terms">Terms</Link>
				<a href="https://github.com/homarr-labs/dashboard-icons/blob/main/LICENSE" target="_blank" rel="noreferrer">
					License
				</a>
				<ThemeSwitcher />
			</div>
		</footer>
	)
}
export function LicenseNoticeSlot({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	if (pathname === "/dashboard") return null
	return children
}
export function DashboardHeader() {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const auth = useAuth()
	return (
		<header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 sm:px-8">
			<Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">
					DI
				</span>
				<span className="truncate text-sm">Dashboard Icons</span>
			</Link>
			<div className="flex shrink-0 items-center gap-2">
				<Link href="/icons" className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
					Browse icons
					<ArrowUpRight className="size-3" />
				</Link>
				{mounted && auth.data?.isAuthenticated && (
					<Button
						size="icon"
						variant="ghost"
						aria-label="Sign out"
						onClick={() => {
							pb.authStore.clear()
							window.location.reload()
						}}
					>
						<LogOut className="size-4" />
					</Button>
				)}
			</div>
		</header>
	)
}
