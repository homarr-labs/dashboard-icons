"use client"

import { IconSubmissionContent } from "@/components/icon-submission-form"
import { Input } from "@/components/ui/input"
import { BASE_URL } from "@/constants"
import type { IconSearchProps } from "@/types/icons"
import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function IconSearch({ icons, initialQuery = "" }: IconSearchProps) {
	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [filteredIcons, setFilteredIcons] = useState(() => {
		// Apply initial filtering if initialQuery exists
		if (!initialQuery.trim()) return icons

		const q = initialQuery.toLowerCase()
		return icons.filter(({ name, data }) => {
			// Check if the name contains the query
			if (name.toLowerCase().includes(q)) return true

			// Check if any aliases contains the query
			if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true

			// Check if any category contains the query
			if (data.categories.some((category) => category.toLowerCase().includes(q))) return true

			return false
		})
	})

	const handleSearch = (query: string) => {
		setSearchQuery(query)

		if (!query.trim()) {
			setFilteredIcons(icons)
			return
		}

		const q = query.toLowerCase()
		const filtered = icons.filter(({ name, data }) => {
			// Check if the name contains the query
			if (name.toLowerCase().includes(q)) return true

			// Check if any aliases contains the query
			if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true

			// Check if any category contains the query
			if (data.categories.some((category) => category.toLowerCase().includes(q))) return true

			return false
		})

		setFilteredIcons(filtered)
	}

	return (
		<>
			<div className="relative w-full sm:max-w-md">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search icons by name, aliases, or categories..."
					className="w-full pl-8"
					value={searchQuery}
					onChange={(e) => handleSearch(e.target.value)}
				/>
			</div>

			{filteredIcons.length === 0 ? (
				<div className="flex flex-col gap-8 py-12 max-w-2xl mx-auto">
					<div className="text-center">
						<h2 className="text-5xl font-semibold">We don't have this one...yet!</h2>
					</div>
					<IconSubmissionContent />
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-8">
					{filteredIcons.map(({ name, data }) => (
						<Link
							key={name}
							href={`/icons/${name}`}
							className="group flex flex-col items-center p-3 sm:p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
						>
							<div className="relative h-12 w-12 sm:h-16 sm:w-16 mb-2">
								<Image
									src={`${BASE_URL}/${data.base}/${name}.${data.base}`}
									alt={`${name} icon`}
									fill
									className="object-contain p-1 group-hover:scale-110 transition-transform"
								/>
							</div>
							<span className="text-xs sm:text-sm text-center truncate w-full capitalize">{name.replace(/-/g, " ")}</span>
						</Link>
					))}
				</div>
			)}
		</>
	)
}
