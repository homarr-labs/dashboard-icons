import { GridBackground } from "@/components/grid-background"
import { getIconsArray } from "@/lib/api"
import type { Metadata } from "next"
import { IconSearch } from "./components/icon-search"

export const metadata: Metadata = {
	title: "Browse Icons | Dashboard Icons",
	description: "Search and browse through our collection of beautiful dashboard icons",
}

export default async function IconsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>
}) {
	// Get all icons as an array, sorted by name
	const icons = await getIconsArray()

	// Get the search query from URL params
	const { q } = await searchParams

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
			{/* Grid background with radial gradient */}
			<GridBackground />

			{/* Subtle glow effects */}
			<div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />
			<div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />

			<div className="container relative z-10 py-12 mx-auto px-4 sm:px-6">
				<div className="space-y-6 mb-12 max-w-3xl mx-auto text-center">
					<div className="animate-fade-in-up">
						<h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">Browse Icons</h1>
						<p className="text-xl mt-4 text-blue-100">
							Search through our collection of <span className="font-bold text-purple-300">{icons.length}</span> beautiful icons.
						</p>
					</div>

					<IconSearch icons={icons} initialQuery={q} />
				</div>
			</div>
		</div>
	)
}
