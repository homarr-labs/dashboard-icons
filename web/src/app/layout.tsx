import { PostHogProvider } from "@/components/PostHogProvider"
import { Header } from "@/components/header"
import { LicenseNotice } from "@/components/license-notice"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "./theme-provider"

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
})

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#ffffff",
}

export const metadata: Metadata = {
	metadataBase: new URL("https://dashboardicons.com"),
	title: "Dashboard Icons",
	description: "Curated icons for your dashboard",
	keywords: ["dashboard", "icons", "open source", "free icons", "dashboard design"],
	robots: {
		index: true,
		follow: true,
		"max-image-preview": "large",
		"max-snippet": -1,
		"max-video-preview": -1,
		googleBot: "index, follow",
	},
	openGraph: {
		siteName: "Dashboard Icons",
		type: "website",
		locale: "en_US",
		title: "Dashboard Icons",
		description: "Curated icons for your dashboard",
		url: "https://dashboardicons.com",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Dashboard Icons",
				type: "image/png",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		site: "@homarr_app",
		creator: "@homarr_app",
		title: "Dashboard Icons",
		description: "Curated icons for your dashboard",
		images: ["/og-image.png"],
	},
	applicationName: "Dashboard Icons",
	appleWebApp: {
		title: "Dashboard Icons",
		statusBarStyle: "default",
		capable: true,
	},
	alternates: {
		types: {
			"application/rss+xml": "https://dashboardicons.com/rss.xml",
		},
	},
	icons: {
		icon: [
			{
				url: "/favicon.ico",
				type: "image/x-icon",
			},
			{
				url: "/favicon-16x16.png",
				sizes: "16x16",
				type: "image/png",
			},
			{
				url: "/favicon-32x32.png",
				sizes: "32x32",
				type: "image/png",
			},
			{
				url: "/favicon-96x96.png",
				sizes: "96x96",
				type: "image/png",
			},
			{
				url: "/android-chrome-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
		],
		shortcut: [
			{
				url: "/favicon.ico",
				type: "image/x-icon",
			},
		],
		apple: [
			{
				url: "/apple-icon-57x57.png",
				sizes: "57x57",
				type: "image/png",
			},
			{
				url: "/apple-icon-60x60.png",
				sizes: "60x60",
				type: "image/png",
			},
			{
				url: "/apple-icon-72x72.png",
				sizes: "72x72",
				type: "image/png",
			},
			{
				url: "/apple-icon-76x76.png",
				sizes: "76x76",
				type: "image/png",
			},
			{
				url: "/apple-icon-114x114.png",
				sizes: "114x114",
				type: "image/png",
			},
			{
				url: "/apple-icon-120x120.png",
				sizes: "120x120",
				type: "image/png",
			},
			{
				url: "/apple-icon-144x144.png",
				sizes: "144x144",
				type: "image/png",
			},
			{
				url: "/apple-icon-152x152.png",
				sizes: "152x152",
				type: "image/png",
			},
			{
				url: "/apple-icon-180x180.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased bg-background`}>
				<PostHogProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<Header />
						<main>{children}</main>
						<Toaster />
						<LicenseNotice />
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	)
}
