import { HeroSection } from "@/components/hero"
import { BASE_URL } from "@/constants"
import { getTotalIcons } from "@/lib/api"
import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Dashboard Icons - Beautiful icons for your dashboard",
	description: "Free, open-source icons for your dashboard. Choose from hundreds of high-quality icons for your web applications.",
	keywords: ["self hosted", "dashboard icons", "free icons", "open source icons", "web dashboard", "application icons"],
	openGraph: {
		title: "Dashboard Icons - Your definitive source for dashboard icons",
		description: "Free, open-source icons for your dashboard. Choose from thousands of high-quality icons.",
		type: "website",
		url: BASE_URL,
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Dashboard Icons",
			},
		],
	},
	twitter: {
		title: "Dashboard Icons - Your definitive source for dashboard icons",
		description: "Free, open-source icons for your dashboard. Choose from thousands of high-quality icons.",
		card: "summary_large_image",
		images: ["/og-image.png"],
	},
	alternates: {
		canonical: BASE_URL,
	},
}

export default async function Home() {
	const { totalIcons } = await getTotalIcons()

	return (
		<div className="flex flex-col min-h-screen">
			<HeroSection totalIcons={totalIcons} />
		</div>
	)
}
