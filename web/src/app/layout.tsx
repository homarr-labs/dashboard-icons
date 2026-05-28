import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { LicenseNotice } from "@/components/license-notice"
import { PostHogProvider } from "@/components/PostHogProvider"
import { JsonLd } from "@/components/seo/json-ld"
import { getDescription, WEB_URL, websiteTitle } from "@/constants"
import { getTotalIcons } from "@/lib/api"
import { buildDefaultOgImages, buildDefaultTwitterImages } from "@/lib/seo/metadata"
import { buildOrganizationGraph } from "@/lib/seo/schemas"
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
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
	viewportFit: "cover",
}

export async function generateMetadata(): Promise<Metadata> {
	const { totalIcons } = await getTotalIcons()

	return {
		metadataBase: new URL(WEB_URL),
		title: {
			default: websiteTitle,
			template: "%s | Dashboard Icons & Logos",
		},
		description: getDescription(totalIcons),
		keywords: [
			"dashboard icons",
			"dashboard logos",
			"service icons",
			"service logos",
			"application icons",
			"app logos",
			"tool icons",
			"web dashboard",
			"app directory",
		],
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
			images: buildDefaultOgImages("Dashboard Icons - Free icons and logos for self-hosted services"),
		},
		twitter: {
			card: "summary_large_image",
			title: websiteTitle,
			description: getDescription(totalIcons),
			images: buildDefaultTwitterImages(),
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
			icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
			apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
		},
		manifest: "/site.webmanifest",
		formatDetection: {
			email: false,
			address: false,
			telephone: false,
		},
	}
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://cdn.jsdelivr.net" />
				<link rel="preconnect" href="https://raw.githubusercontent.com" />
				<link rel="preconnect" href="https://api.github.com" />
				<link rel="alternate" type="text/plain" href="/llms.txt" />
				{process.env.NEXT_PUBLIC_POSTHOG_HOST && (
					<link
						rel="preconnect"
						href={(() => {
							try {
								return new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST).origin
							} catch {
								return process.env.NEXT_PUBLIC_POSTHOG_HOST
							}
						})()}
					/>
				)}
			</head>
			<body className={`${inter.variable} antialiased bg-background flex flex-col min-h-screen`}>
				<JsonLd data={buildOrganizationGraph()} />
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
