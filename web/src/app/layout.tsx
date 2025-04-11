import { Header } from "@/components/header"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "./theme-provider"
import { PostHogProvider } from "@/components/PostHogProvider"

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "Dashboard icons",
	description: "Currated icons for your dashboard",
	icons: {
		icon: "/favicon.ico",
	},
}

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased bg-background`}>
				<PostHogProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<Header />
						<main>{children}</main>
						<Toaster />
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	)
}
