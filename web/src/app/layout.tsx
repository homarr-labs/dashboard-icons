import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { LicenseNotice } from "@/components/license-notice"
import { PostHogProvider } from "@/components/PostHogProvider"
import { getDescription, WEB_URL, websiteTitle } from "@/constants"
import { getTotalIcons } from "@/lib/api"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ThemeProvider } from "./theme-provider"

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
		metadataBase: new URL(WEB_URL),
		title: websiteTitle,
		description: getDescription(totalIcons),
		keywords: ["dashboard icons", "service icons", "application icons", "tool icons", "web dashboard", "app directory"],
		robots: {
			index: true,
			follow: true,
			googleBot: "index, follow",
		},
		openGraph: {
			siteName: "Dashboard Icons",
			title: websiteTitle,
			url: WEB_URL,
			description: getDescription(totalIcons),
			images: [
				{
					url: "/og-image.png",
					width: 1200,
					height: 630,
					alt: "Dashboard Icons - Dashboard icons for self hosted services",
					type: "image/png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: websiteTitle,
			description: getDescription(totalIcons),
			images: ["/og-image.png"],
		},
		applicationName: "Dashboard Icons",
		alternates: {
			canonical: WEB_URL,
		},

		appleWebApp: {
			title: "Dashboard Icons",
			statusBarStyle: "default",
			capable: true,
		},
		icons: {
			icon: [
				{ url: "/favicon.ico", sizes: "any" },
				{ url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
				{ url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
				{ url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
			],
			apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
		},
		manifest: "/site.webmanifest",
	}
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://cdn.jsdelivr.net" />
				<link rel="preconnect" href="https://raw.githubusercontent.com" />
			</head>
			<body className={`${inter.variable} antialiased bg-background flex flex-col min-h-screen`}>
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Needs to be done
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "WebSite",
							name: "Dashboard Icons",
							url: WEB_URL,
							potentialAction: {
								"@type": "SearchAction",
								target: {
									"@type": "EntryPoint",
									urlTemplate: `${WEB_URL}/icons?q={search_term_string}`,
								},
								"query-input": "required name=search_term_string",
							},
						}),
					}}
				/>
				<Providers>
					<PostHogProvider>
						<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
							<HeaderWrapper />
							<main className="flex-grow">{children}</main>
							<Footer />
							<Toaster />
							<LicenseNotice />
						</ThemeProvider>
					</PostHogProvider>
				</Providers>
			</body>
		</html>
	)
}
