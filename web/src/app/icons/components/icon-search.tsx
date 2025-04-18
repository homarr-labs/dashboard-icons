"use client"

import { IconSubmissionContent } from "@/components/icon-submission-form"
import { MagicCard } from "@/components/magicui/magic-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { BASE_URL } from "@/constants"
import type { Icon, IconSearchProps } from "@/types/icons"
import { ArrowDownAZ, ArrowUpZA, Calendar, Filter, Search, SortAsc, X } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type SortOption = "relevance" | "alphabetical-asc" | "alphabetical-desc" | "newest"

export function IconSearch({ icons }: IconSearchProps) {
	const searchParams = useSearchParams()
	const initialQuery = searchParams.get("q")
	const initialCategories = searchParams.getAll("category")
	const initialSort = (searchParams.get("sort") as SortOption) || "relevance"
	const router = useRouter()
	const pathname = usePathname()
	const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
	const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories ?? [])
	const [sortOption, setSortOption] = useState<SortOption>(initialSort)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const { resolvedTheme } = useTheme()

	// Extract all unique categories
	const allCategories = useMemo(() => {
		const categories = new Set<string>()
		for (const icon of icons) {
			for (const category of icon.data.categories) {
				categories.add(category)
			}
		}
		return Array.from(categories).sort()
	}, [icons])

	// Simple filter function using substring matching
	const filterIcons = useCallback(
		(query: string, categories: string[], sort: SortOption) => {
			// First filter by categories if any are selected
			let filtered = icons
			if (categories.length > 0) {
				filtered = filtered.filter(({ data }) =>
					data.categories.some((cat) => categories.some((selectedCat) => cat.toLowerCase() === selectedCat.toLowerCase())),
				)
			}

			// Then filter by search query
			if (query.trim()) {
				const q = query.toLowerCase()
				filtered = filtered.filter(({ name, data }) => {
					if (name.toLowerCase().includes(q)) return true
					if (data.aliases.some((alias) => alias.toLowerCase().includes(q))) return true
					if (data.categories.some((category) => category.toLowerCase().includes(q))) return true
					return false
				})
			}

			// Apply sorting
			if (sort === "alphabetical-asc") {
				return filtered.sort((a, b) => a.name.localeCompare(b.name))
			}
			if (sort === "alphabetical-desc") {
				return filtered.sort((a, b) => b.name.localeCompare(a.name))
			}
			if (sort === "newest") {
				return filtered.sort((a, b) => {
					return new Date(b.data.update.timestamp).getTime() - new Date(a.data.update.timestamp).getTime()
				})
			}

			// Default sort (relevance or fallback to alphabetical)
			return filtered.sort((a, b) => a.name.localeCompare(b.name))
		},
		[icons],
	)

	// Find matched aliases for display purposes
	const matchedAliases = useMemo(() => {
		if (!searchQuery.trim()) return {}

		const q = searchQuery.toLowerCase()
		const matches: Record<string, string> = {}

		for (const { name, data } of icons) {
			// If name doesn't match but an alias does, store the first matching alias
			if (!name.toLowerCase().includes(q)) {
				const matchingAlias = data.aliases.find((alias) => alias.toLowerCase().includes(q))
				if (matchingAlias) {
					matches[name] = matchingAlias
				}
			}
		}

		return matches
	}, [icons, searchQuery])

	// Use useMemo for filtered icons
	const filteredIcons = useMemo(() => {
		return filterIcons(searchQuery, selectedCategories, sortOption)
	}, [filterIcons, searchQuery, selectedCategories, sortOption])

	const updateResults = useCallback(
		(query: string, categories: string[], sort: SortOption) => {
			const params = new URLSearchParams()
			if (query) params.set("q", query)

			// Clear existing category params and add new ones
			for (const category of categories) {
				params.append("category", category)
			}

			// Add sort parameter if not default
			if (sort !== "relevance" || initialSort !== "relevance") {
				params.set("sort", sort)
			}

			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
			router.push(newUrl, { scroll: false })
		},
		[pathname, router, initialSort],
	)

	const handleSearch = useCallback(
		(query: string) => {
			setSearchQuery(query)
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			timeoutRef.current = setTimeout(() => {
				updateResults(query, selectedCategories, sortOption)
			}, 200) // Changed from 100ms to 200ms
		},
		[updateResults, selectedCategories, sortOption],
	)

	const handleCategoryChange = useCallback(
		(category: string) => {
			let newCategories: string[]

			if (selectedCategories.includes(category)) {
				// Remove the category if it's already selected
				newCategories = selectedCategories.filter((c) => c !== category)
			} else {
				// Add the category if it's not selected
				newCategories = [...selectedCategories, category]
			}

			setSelectedCategories(newCategories)
			updateResults(searchQuery, newCategories, sortOption)
		},
		[updateResults, searchQuery, selectedCategories, sortOption],
	)

	const handleSortChange = useCallback(
		(sort: SortOption) => {
			setSortOption(sort)
			updateResults(searchQuery, selectedCategories, sort)
		},
		[updateResults, searchQuery, selectedCategories],
	)

	const clearFilters = useCallback(() => {
		setSearchQuery("")
		setSelectedCategories([])
		setSortOption("relevance")
		updateResults("", [], "relevance")
	}, [updateResults])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	if (!searchParams) return null

	const getSortLabel = (sort: SortOption) => {
		switch (sort) {
			case "relevance":
				return "Best match"
			case "alphabetical-asc":
				return "A to Z"
			case "alphabetical-desc":
				return "Z to A"
			case "newest":
				return "Newest first"
			default:
				return "Sort"
		}
	}

	const getSortIcon = (sort: SortOption) => {
		switch (sort) {
			case "relevance":
				return <Search className="h-4 w-4" />
			case "alphabetical-asc":
				return <ArrowDownAZ className="h-4 w-4" />
			case "alphabetical-desc":
				return <ArrowUpZA className="h-4 w-4" />
			case "newest":
				return <Calendar className="h-4 w-4" />
			default:
				return <SortAsc className="h-4 w-4" />
		}
	}

	return (
		<>
			<div className="space-y-4 w-full">
				{/* Search input */}
				<div className="relative w-full">
					<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground transition-all duration-300">
						<Search className="h-4 w-4" />
					</div>
					<Input
						type="search"
						placeholder="Search icons by name, alias, or category..."
						className="w-full h-10 pl-9 cursor-text transition-all duration-300 text-sm md:text-base   border-border shadow-sm"
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
					/>
				</div>

				{/* Filter and sort controls */}
				<div className="flex flex-wrap gap-2 justify-start">
					{/* Filter dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm ">
								<Filter className="h-4 w-4 mr-2" />
								<span>Filter</span>
								{selectedCategories.length > 0 && (
									<Badge variant="secondary" className="ml-2 px-1.5">
										{selectedCategories.length}
									</Badge>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64 sm:w-56">
							<DropdownMenuLabel className="font-semibold">Categories</DropdownMenuLabel>
							<DropdownMenuSeparator />

							<div className="max-h-[40vh] overflow-y-auto p-1">
								{allCategories.map((category) => (
									<DropdownMenuCheckboxItem
										key={category}
										checked={selectedCategories.includes(category)}
										onCheckedChange={() => handleCategoryChange(category)}
										className="cursor-pointer capitalize"
									>
										{category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
									</DropdownMenuCheckboxItem>
								))}
							</div>

							{selectedCategories.length > 0 && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => {
											setSelectedCategories([])
											updateResults(searchQuery, [], sortOption)
										}}
										className="cursor-pointer  focus: focus:bg-rose-50 dark:focus:bg-rose-950/20"
									>
										Clear all filters
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Sort dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm">
								{getSortIcon(sortOption)}
								<span className="ml-2">{getSortLabel(sortOption)}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel className="font-semibold">Sort By</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => handleSortChange(value as SortOption)}>
								<DropdownMenuRadioItem value="relevance" className="cursor-pointer">
									<Search className="h-4 w-4 mr-2" />
									Best match
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-asc" className="cursor-pointer">
									<ArrowDownAZ className="h-4 w-4 mr-2" />A to Z
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-desc" className="cursor-pointer">
									<ArrowUpZA className="h-4 w-4 mr-2" />Z to A
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="newest" className="cursor-pointer">
									<Calendar className="h-4 w-4 mr-2" />
									Newest first
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Clear all button */}
					{(searchQuery || selectedCategories.length > 0 || sortOption !== "relevance") && (
						<Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none cursor-pointer bg-background">
							<X className="h-4 w-4 mr-2" />
							<span>Clear all</span>
						</Button>
					)}
				</div>

				{/* Active filter badges */}
				{selectedCategories.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 mt-2">
						<span className="text-sm text-muted-foreground">Filters:</span>
						<div className="flex flex-wrap gap-2">
							{selectedCategories.map((category) => (
								<Badge key={category} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
									{category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
									<Button
										variant="ghost"
										size="sm"
										className="h-4 w-4 p-0 hover:bg-transparent cursor-pointer"
										onClick={() => handleCategoryChange(category)}
									>
										<X className="h-3 w-3" />
									</Button>
								</Badge>
							))}
						</div>

						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setSelectedCategories([])
								updateResults(searchQuery, [], sortOption)
							}}
							className="text-xs h-7 px-2 cursor-pointer"
						>
							Clear all
						</Button>
					</div>
				)}

				<Separator className="my-2" />
			</div>

			{filteredIcons.length === 0 ? (
				<div className="flex flex-col gap-8 py-12 max-w-2xl mx-auto">
					<div className="text-center">
						<h2 className="text-3xl sm:text-5xl font-semibold">We don't have this one...yet!</h2>
						<p className="mt-4 text-muted-foreground">
							{searchQuery && selectedCategories.length > 0
								? `No icons found matching "${searchQuery}" with the selected filters.`
								: searchQuery
									? `No icons found matching "${searchQuery}".`
									: selectedCategories.length > 0
										? "No icons found with the selected filters."
										: "No icons found matching your criteria."}
						</p>
					</div>
					<IconSubmissionContent />
				</div>
			) : (
				<>
					<div className="flex justify-between items-center pb-2">
						<p className="text-sm text-muted-foreground">
							Found {filteredIcons.length} icon
							{filteredIcons.length !== 1 ? "s" : ""}.
						</p>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							{getSortIcon(sortOption)}
							<span>{getSortLabel(sortOption)}</span>
						</div>
					</div>

					<IconsGrid filteredIcons={filteredIcons} matchedAliases={matchedAliases} />
				</>
			)}
		</>
	)
}

function IconCard({
	name,
	data: iconData,
	matchedAlias,
}: {
	name: string
	data: Icon
	matchedAlias?: string | null
}) {
	return (
		<MagicCard className="rounded-md shadow-md">
			<Link prefetch={false} href={`/icons/${name}`} className="group flex flex-col items-center p-3 sm:p-4 cursor-pointer">
				<div className="relative h-12 w-12 sm:h-16 sm:w-16 mb-2">
					<Image
						src={`${BASE_URL}/${iconData.base}/${name}.${iconData.base}`}
						alt={`${name} icon`}
						fill
						className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
					/>
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize group- dark:group-hover:text-rose-400 transition-colors duration-200 font-medium">
					{name.replace(/-/g, " ")}
				</span>

				{matchedAlias && <span className="text-[10px] text-center truncate w-full mt-1">Alias: {matchedAlias}</span>}
			</Link>
		</MagicCard>
	)
}

interface IconsGridProps {
	filteredIcons: { name: string; data: Icon }[]
	matchedAliases: Record<string, string>
}

function IconsGrid({ filteredIcons, matchedAliases }: IconsGridProps) {
	return (
		<>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-2">
				{filteredIcons.slice(0, 120).map(({ name, data }) => (
					<IconCard key={name} name={name} data={data} matchedAlias={matchedAliases[name] || null} />
				))}
			</div>
			{filteredIcons.length > 120 && <p className="text-sm text-muted-foreground">And {filteredIcons.length - 120} more...</p>}
		</>
	)
}
