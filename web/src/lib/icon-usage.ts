import { WEB_URL } from "@/constants"

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

export function getIconUsageSnippets(name: string, assetUrl: string) {
	const url = new URL(assetUrl, WEB_URL).href
	return [
		{ label: "Homarr", description: "Paste into the app’s icon URL field.", code: url },
		{ label: "Dashy", description: "Set the icon field on an item in conf.yml.", code: `icon: ${JSON.stringify(url)}` },
		{
			label: "HTML",
			description: "Embed the hosted icon in a web page.",
			code: `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)} icon" width="48" height="48">`,
		},
	]
}
