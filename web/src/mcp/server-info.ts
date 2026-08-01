import { WEB_URL } from "@/constants"

export function getDashboardIconsServerInfo(webUrl: string = WEB_URL) {
	return {
		name: "dashboard-icons",
		title: "Dashboard Icons",
		version: "1.0.0",
		websiteUrl: webUrl,
		description: "Search and fetch icons for self-hosted services, dashboards, and app directories.",
		icons: [
			{
				src: `${webUrl}/favicon-96x96.png`,
				mimeType: "image/png",
				sizes: ["96x96"],
			},
			{
				src: `${webUrl}/favicon.svg`,
				mimeType: "image/svg+xml",
				sizes: ["any"],
			},
		],
	}
}
