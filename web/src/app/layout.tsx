import { PostHogProvider } from "@/components/PostHogProvider";
import { Header } from "@/components/header";
import { LicenseNotice } from "@/components/license-notice";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#ffffff",
};

export const metadata: Metadata = {
	metadataBase: new URL("https://icons.homarr.dev"),
	title: "Dashboard Icons",
	description: "Curated icons for your dashboard",
	keywords: [
		"dashboard",
		"icons",
		"open source",
		"free icons",
		"dashboard design",
	],
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
		url: "https://icons.homarr.dev",
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
			"application/rss+xml": "https://icons.homarr.dev/rss.xml",
		},
	},
	icons: {
		icon: [
			{
				url: "/favicon.ico",
				type: "image/x-icon",
			},
		],
		shortcut: [
			{
				url: "/favicon.ico",
				type: "image/x-icon",
			},
		],
	},
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} antialiased bg-background`}>
				<PostHogProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<Header />
						<main>{children}</main>
						<Toaster />
						<LicenseNotice />
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
