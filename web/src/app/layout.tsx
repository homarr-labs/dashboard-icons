import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_PATH } from "@/constants"
import { Github } from "lucide-react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "./theme-provider"

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "Dashboard icons",
	description: "Currated icons for your dashboard",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased bg-background`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<header className="border-b">
						<div className="container flex items-center justify-between h-16">
							<div className="flex items-center gap-6">
								<Link href="/" className="text-xl font-bold">
									Dashboard-icons
								</Link>
								<nav className="hidden md:flex items-center gap-6">
									<Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
										Home
									</Link>
									<Link href="/icons" className="text-sm font-medium transition-colors hover:text-primary">
										Icons
									</Link>
								</nav>
							</div>
							<div className="flex items-center gap-4">
								<Link
									href={REPO_PATH}
									target="_blank"
									className="text-sm font-medium transition-colors hover:text-primary"
								>
									<Github className="h-5 w-5" />
								</Link>
								<ThemeSwitcher />
							</div>
						</div>
					</header>
					<main>{children}</main>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
