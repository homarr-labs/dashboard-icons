import { PostHogProvider } from "@/components/PostHogProvider"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { LicenseNotice } from "@/components/license-notice"
import { getTotalIcons } from "@/lib/api"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, GITHUB_URL, ORGANIZATION_NAME, ORGANIZATION_SCHEMA, SITE_NAME, SITE_TAGLINE, WEB_URL, getDescription, getWebsiteSchema, websiteFullTitle, websiteTitle } from "@/constants"
import { ThemeProvider } from "./theme-provider"
import Script from "next/script"

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
	const description = getDescription(totalIcons)

	return {
		metadataBase: new URL(WEB_URL),
		title: websiteTitle,
		description,
		keywords: DEFAULT_KEYWORDS,
		robots: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
			"max-video-preview": -1,
			googleBot: "index, follow",
		},
		openGraph: {
			siteName: SITE_NAME,
			type: "website",
			locale: "en_US",
			title: websiteFullTitle,
			description,
			url: WEB_URL,
			images: [DEFAULT_OG_IMAGE],
		},
		twitter: {
			card: "summary_large_image",
			title: websiteFullTitle,
			description,
			images: [DEFAULT_OG_IMAGE.url],
		},
		applicationName: SITE_NAME,
		appleWebApp: {
			title: SITE_NAME,
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
		authors: [{ name: ORGANIZATION_NAME, url: GITHUB_URL }],
		creator: ORGANIZATION_NAME,
		publisher: ORGANIZATION_NAME,
		archives: [`${WEB_URL}/icons`],
		category: "Icons",
		classification: "Dashboard Design Resources",
		other: {
			"revisit-after": "7 days",
		},
	}
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const { totalIcons } = await getTotalIcons()
	const websiteSchema = getWebsiteSchema(totalIcons)

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<Script id="schema-org" type="application/ld+json">
					{JSON.stringify(websiteSchema)}
				</Script>
				<Script id="org-schema" type="application/ld+json">
					{JSON.stringify(ORGANIZATION_SCHEMA)}
				</Script>
			</head>
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
