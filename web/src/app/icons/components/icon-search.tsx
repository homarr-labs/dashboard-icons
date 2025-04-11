"use client"

import { IconSubmissionContent } from "@/components/icon-submission-form"
import { Input } from "@/components/ui/input"
import { BASE_URL } from "@/constants"
import type { IconSearchProps } from "@/types/icons"
import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

export function IconSearch({ icons }: IconSearchProps) {
	const searchParams = useSearchParams()
	const initialQuery = searchParams.get("q")
	const router = useRouter()
	const pathname = usePathname()
	const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const [filteredIcons, setFilteredIcons] = useState(() => {
		if (!initialQuery?.trim()) return icons

		const q = initialQuery.toLowerCase()
		return icons.filter(({ name, data }) => {
			if (name.toLowerCase().includes(q)) return true
			if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true
			if (data.categories.some((category) => category.toLowerCase().includes(q))) return true

			return false
		})
	})
	const filterIcons = useCallback(
		(query: string) => {
			if (!query.trim()) {
				return icons
			}

			const q = query.toLowerCase()
			return icons.filter(({ name, data }) => {
				if (name.toLowerCase().includes(q)) return true
				if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true
				if (data.categories.some((category) => category.toLowerCase().includes(q))) return true

				return false
			})
		},
		[icons],
	)
	const updateResults = useCallback(
		(query: string) => {
			setFilteredIcons(filterIcons(query))
			const params = new URLSearchParams()
			if (query) params.set("q", query)

			const newUrl = query ? `${pathname}?${params.toString()}` : pathname

			router.push(newUrl, { scroll: false })
		},
		[filterIcons, pathname, router],
	)
	const handleSearch = useCallback(
		(query: string) => {
			setSearchQuery(query)
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			timeoutRef.current = setTimeout(() => {
				updateResults(query)
			}, 100)
		},
		[updateResults],
	)
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	if (!searchParams) return null

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
