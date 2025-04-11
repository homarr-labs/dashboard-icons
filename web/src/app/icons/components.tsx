"use client"

import { Input } from "@/components/ui/input"
import { BASE_URL } from "@/constants"
import type { IconSearchProps, IconWithName } from "@/types/icons"
import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function IconSearch({ icons, initialQuery = "" }: IconSearchProps) {
	const [searchQuery, setSearchQuery] = useState(initialQuery)
	const [filteredIcons, setFilteredIcons] = useState<IconWithName[]>(() => {
		if (!initialQuery.trim()) return icons

		const q = initialQuery.toLowerCase()
		return icons.filter(({ name, data }) => {
			if (name.toLowerCase().includes(q)) return true
			if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true
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
			if (name.toLowerCase().includes(q)) return true
			if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true
			if (data.categories.some((category) => category.toLowerCase().includes(q))) return true

			return false
		})

		setFilteredIcons(filtered)
	}

	return (
		<>
			<div className="relative w-full max-w-md">
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
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold">No icons found</h2>
					<p className="text-muted-foreground mt-2">Try a different search term.</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-8">
					{filteredIcons.map(({ name, data }) => (
						<Link
							key={name}
							href={`/icons/${name}`}
							className="group flex flex-col items-center p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
						>
							<div className="relative h-16 w-16 mb-2">
								<Image
									src={`${BASE_URL}/${data.base}/${name}.${data.base}`}
									alt={`${name} icon`}
									fill
									className="object-contain p-1 group-hover:scale-110 transition-transform"
								/>
							</div>
							<span className="text-sm text-center truncate w-full">{name.replace(/-/g, " ")}</span>
						</Link>
					))}
				</div>
			)}
		</>
	)
}
