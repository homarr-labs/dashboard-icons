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

export default async function IconsPage({
	searchParams,
}: {
	searchParams: { q?: string }
}) {
	// Read the metadata.json file at build time
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const iconsData = JSON.parse(file) as IconFile
	
	// Convert to array format for easier rendering and sort by name
	const icons = Object.entries(iconsData)
		.map(([name, data]) => ({
			name,
			data
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
	// Get the search query from URL params
	const { q } = await searchParams
	
	return (
		<div className="container py-8">
			<div className="space-y-4 mb-8">
				<h1 className="text-3xl font-bold">Browse Icons</h1>
				<p className="text-muted-foreground">Search through our collection of {icons.length} beautiful icons.</p>
				
				<IconSearch icons={icons} initialQuery={q} />
			</div>
		</div>
	)
}
