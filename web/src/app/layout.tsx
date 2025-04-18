import { PostHogProvider } from "@/components/PostHogProvider"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { LicenseNotice } from "@/components/license-notice"
import { getTotalIcons } from "@/lib/api"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "./theme-provider"
import { getDescription, websiteTitle } from "@/constants"

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
})

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 5,
	userScalable: true,
	themeColor: "#ffffff",
	viewportFit: "cover",
}

export async function generateMetadata(): Promise<Metadata> {
	const { totalIcons } = await getTotalIcons()

	return {
		metadataBase: new URL("https://dashboardicons.com"),
		title: websiteTitle,
		description: getDescription(totalIcons),
		keywords: ["dashboard icons", "service icons", "application icons", "tool icons", "web dashboard", "app directory"],
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
			title: websiteTitle,
			description: getDescription(totalIcons),
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
			title: websiteTitle,
			description: getDescription(totalIcons),
			images: ["/og-image.png"],
		},
		applicationName: "Dashboard Icons",
		appleWebApp: {
			title: "Dashboard Icons",
			statusBarStyle: "default",
			capable: true,
		},
		icons: {
			icon: [
				{ url: "/favicon.ico", sizes: "any" },
				{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
				{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			],
			apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
			other: [
				{
					rel: "mask-icon",
					url: "/safari-pinned-tab.svg",
					color: "#000000",
				},
			],
		},
		manifest: "/site.webmanifest",
	}
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased bg-background flex flex-col min-h-screen`}>
				<PostHogProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<HeaderWrapper />
						<main className="flex-grow">{children}</main>
						<Footer />
						<Toaster />
						<LicenseNotice />
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	)
}
