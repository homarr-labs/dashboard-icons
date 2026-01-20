"use client"

import { ArrowDownAZ, ArrowUpZA, Calendar, Filter, Search, SortAsc, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconsGrid } from "@/components/icon-grid"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { filterAndSortIcons, type SortOption } from "@/lib/utils"
import type { IconWithName } from "@/types/icons"

type IconWithStatus = IconWithName & { status: string }

interface CommunityIconSearchProps {
	icons: IconWithStatus[]
}

export function CommunityIconSearch({ icons }: CommunityIconSearchProps) {
	const searchParams = useSearchParams()
	const initialQuery = searchParams.get("q")
	const initialCategories = searchParams.getAll("category")
	const initialSort = (searchParams.get("sort") as SortOption) || "relevance"
	const router = useRouter()
	const pathname = usePathname()
	const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
	const [debouncedQuery, setDebouncedQuery] = useState(initialQuery ?? "")
	const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories ?? [])
	const [sortOption, setSortOption] = useState<SortOption>(initialSort)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery)
		}, 200)

		return () => clearTimeout(timer)
	}, [searchQuery])

	const allCategories = useMemo(() => {
		const categories = new Set<string>()
		for (const icon of icons) {
			for (const category of icon.data.categories) {
				categories.add(category.toLowerCase())
			}
		}
		return Array.from(categories).sort()
	}, [icons])

	const matchedAliases = useMemo(() => {
		if (!searchQuery.trim()) return {}

		const q = searchQuery.toLowerCase()
		const matches: Record<string, string> = {}

		for (const { name, data } of icons) {
			if (!name.toLowerCase().includes(q)) {
				const matchingAlias = data.aliases.find((alias) => alias.toLowerCase().includes(q))
				if (matchingAlias) {
					matches[name] = matchingAlias
				}
			}
		}

		return matches
	}, [icons, searchQuery])

	const filteredIcons = useMemo(() => {
		const result = filterAndSortIcons({
			icons,
			query: debouncedQuery,
			categories: selectedCategories,
			sort: sortOption,
		}) as IconWithStatus[]

		return result
	}, [icons, debouncedQuery, selectedCategories, sortOption])

	const groupedIcons = useMemo(() => {
		const statusPriority = { pending: 0, approved: 2, rejected: 3, added_to_collection: 1 }

		const groups: Record<string, IconWithStatus[]> = {}

		for (const icon of filteredIcons) {
			const iconWithStatus = icon as IconWithStatus
			const status = iconWithStatus.status || "pending"

			if (!groups[status]) {
				groups[status] = []
			}
			groups[status].push(iconWithStatus)
		}

		return Object.entries(groups)
			.sort(([a], [b]) => {
				return (statusPriority[a as keyof typeof statusPriority] ?? 999) - (statusPriority[b as keyof typeof statusPriority] ?? 999)
			})
			.map(([status, items]) => ({ status, items }))
	}, [filteredIcons])

	const updateResults = useCallback(
		(query: string, categories: string[], sort: SortOption) => {
			const params = new URLSearchParams()
			if (query) params.set("q", query)

			for (const category of categories) {
				params.append("category", category)
			}

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
			}, 200)
		},
		[updateResults, selectedCategories, sortOption],
	)

	const handleCategoryChange = useCallback(
		(category: string) => {
			const normalizedCategory = category.toLowerCase()
			let newCategories: string[]

			if (selectedCategories.some((c) => c.toLowerCase() === normalizedCategory)) {
				newCategories = selectedCategories.filter((c) => c.toLowerCase() !== normalizedCategory)
			} else {
				newCategories = [...selectedCategories, normalizedCategory]
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
				<div className="relative w-full">
					<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground transition-all duration-300">
						<Search className="h-4 w-4" />
					</div>
					<Input
						type="search"
						placeholder="Search icons by name, alias, or category..."
						className="w-full h-10 pl-9 cursor-text transition-all duration-300 text-sm md:text-base border-border shadow-sm"
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
					/>
				</div>

				<div className="flex flex-wrap gap-2 justify-start">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm">
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
							<DropdownMenuLabel className="font-semibold">Select Categories</DropdownMenuLabel>
							<DropdownMenuSeparator />

							<div className="max-h-[40vh] overflow-y-auto p-1">
								{allCategories.map((category) => (
									<DropdownMenuCheckboxItem
										key={category}
										checked={selectedCategories.some((c) => c.toLowerCase() === category.toLowerCase())}
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
										className="cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/20"
									>
										Clear categories
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

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
									Relevance
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-asc" className="cursor-pointer">
									<ArrowDownAZ className="h-4 w-4 mr-2" />
									Name (A-Z)
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-desc" className="cursor-pointer">
									<ArrowUpZA className="h-4 w-4 mr-2" />
									Name (Z-A)
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="newest" className="cursor-pointer">
									<Calendar className="h-4 w-4 mr-2" />
									Newest first
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>

					{(searchQuery || selectedCategories.length > 0 || sortOption !== "relevance") && (
						<Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none cursor-pointer bg-background">
							<X className="h-4 w-4 mr-2" />
							<span>Reset all</span>
						</Button>
					)}
				</div>

				{selectedCategories.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 mt-2">
						<span className="text-sm text-muted-foreground">Selected:</span>
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
							Clear
						</Button>
					</div>
				)}

				<Separator className="my-2" />
			</div>

			{filteredIcons.length === 0 ? (
				<div className="flex flex-col gap-8 py-12 px-2 w-full max-w-full sm:max-w-2xl mx-auto items-center overflow-x-hidden">
					<div className="text-center w-full">
						<h2 className="text-3xl sm:text-5xl font-semibold">No icons found</h2>
						<p className="text-lg text-muted-foreground mt-2">Try adjusting your search or filters</p>
					</div>
				</div>
			) : (
				<div className="space-y-8">
					<div className="flex justify-between items-center">
						<p className="text-sm text-muted-foreground">
							Found {filteredIcons.length} icon
							{filteredIcons.length !== 1 ? "s" : ""}.
						</p>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							{getSortIcon(sortOption)}
							<span>{getSortLabel(sortOption)}</span>
						</div>
					</div>

					{groupedIcons.map(({ status, items }) => (
						<section key={status} className="space-y-4">
							<div className="flex items-center gap-3">
								<StatusBadge status={status} showCollectionStatus />
								<span className="text-sm text-muted-foreground">
									{items.length} {items.length === 1 ? "icon" : "icons"}
								</span>
							</div>
							<Card className="bg-background/50 border shadow-lg">
								<CardContent>
									<IconsGrid filteredIcons={items} matchedAliases={matchedAliases} />
								</CardContent>
							</Card>
						</section>
					))}
				</div>
			)}
		</>
	)
}
