import type { Metadata } from "next"
import { promises as fs } from "node:fs"
import { IconSearch } from "./components"

export const metadata: Metadata = {
	title: "Browse Icons | Dashboard Icons",
	description: "Search and browse through our collection of beautiful dashboard icons",
}

// This page is statically generated at build time
// Force static rendering and revalidate every 24 hours
export const revalidate = 86400

export default async function IconsPage() {
	// Read the metadata.json file at build time
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const iconsData = JSON.parse(file) as IconFile
	
	// Convert to array format for easier rendering
	const icons = Object.entries(iconsData).map(([name, data]) => ({
		name,
		data
	}))
	
	return (
		<div className="container py-8">
			<div className="space-y-4 mb-8">
				<h1 className="text-3xl font-bold">Browse Icons</h1>
				<p className="text-muted-foreground">Search through our collection of over {icons.length} beautiful icons.</p>
				
				<IconSearch icons={icons} />
			</div>
		</div>
	)
}
