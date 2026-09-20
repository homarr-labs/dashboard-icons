"use client"
import { usePathname } from "next/navigation"
import { DashboardHeader } from "./dashboard/site-chrome"
import { Header } from "./header"
export function HeaderWrapper() {
	const pathname = usePathname()
	if (pathname === "/dashboard") return <DashboardHeader />
	return <Header />
}
