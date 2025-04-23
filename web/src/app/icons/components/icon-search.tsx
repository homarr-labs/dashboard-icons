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
import { ArrowDownAZ, ArrowUpZA, Calendar, ChevronLeft, ChevronRight, Filter, Search, SortAsc, X } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

type SortOption = "relevance" | "alphabetical-asc" | "alphabetical-desc" | "newest"

// Get the display rows count based on viewport size
function getDefaultRowsPerPage() {
	if (typeof window === "undefined") return 3; // Default for SSR

	// Calculate based on viewport height and width
	const vh = window.innerHeight;
	const vw = window.innerWidth;

	// Determine number of columns based on viewport width
	let columns = 2; // Default for small screens (sm)
	if (vw >= 1280) columns = 8; // xl breakpoint
	else if (vw >= 1024) columns = 6; // lg breakpoint
	else if (vw >= 768) columns = 4; // md breakpoint
	else if (vw >= 640) columns = 3; // sm breakpoint

	// Calculate rows (accounting for pagination UI space)
	const rowHeight = 130; // Approximate height of each row in pixels
	const availableHeight = vh * 0.6; // 60% of viewport height

	// Ensure at least 1 row, maximum 5 rows
	return Math.max(1, Math.min(5, Math.floor(availableHeight / rowHeight)));
}

export function IconSearch({ icons }: IconSearchProps) {
	const searchParams = useSearchParams()
	const initialQuery = searchParams.get("q")
	const initialCategories = searchParams.getAll("category")
	const initialSort = (searchParams.get("sort") as SortOption) || "relevance"
	const initialPage = Number(searchParams.get("page") || "1")
	const router = useRouter()
	const pathname = usePathname()
	const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
	const [debouncedQuery, setDebouncedQuery] = useState(initialQuery ?? "")
	const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories ?? [])
	const [sortOption, setSortOption] = useState<SortOption>(initialSort)
	const [currentPage, setCurrentPage] = useState(initialPage)
	const [iconsPerPage, setIconsPerPage] = useState(getDefaultRowsPerPage() * 8) // Default cols is 8 for xl screens
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const { resolvedTheme } = useTheme()
	const [isLazyRequestSubmitted, setIsLazyRequestSubmitted] = useState(false)

	// Add resize observer to update iconsPerPage when window size changes
	useEffect(() => {
		const updateIconsPerPage = () => {
			const rows = getDefaultRowsPerPage();

			// Determine columns based on current viewport
			const vw = window.innerWidth;
			let columns = 2; // Default for small screens
			if (vw >= 1280) columns = 8; // xl breakpoint
			else if (vw >= 1024) columns = 6; // lg breakpoint
			else if (vw >= 768) columns = 4; // md breakpoint
			else if (vw >= 640) columns = 3; // sm breakpoint

			setIconsPerPage(rows * columns);
		};

		// Initial setup
		updateIconsPerPage();

		// Add resize listener
		window.addEventListener('resize', updateIconsPerPage);

		// Cleanup
		return () => window.removeEventListener('resize', updateIconsPerPage);
	}, []);

	// Reset page when search parameters change
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedQuery, selectedCategories, sortOption]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery)
		}, 200)

		return () => clearTimeout(timer)
	}, [searchQuery])

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
				// Normalization function: lowercase, remove spaces and hyphens
				const normalizeString = (str: string) => str.toLowerCase().replace(/[-\s]/g, "")
				const normalizedQuery = normalizeString(query)

				filtered = filtered.filter(({ name, data }) => {
					// Check normalized name
					if (normalizeString(name).includes(normalizedQuery)) return true
					// Check normalized aliases
					if (data.aliases.some((alias) => normalizeString(alias).includes(normalizedQuery))) return true
					// Check normalized categories
					if (data.categories.some((category) => normalizeString(category).includes(normalizedQuery))) return true
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
			// TODO: Implement actual relevance sorting
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

	// Use useMemo for filtered icons with debounced query
	const filteredIcons = useMemo(() => {
		return filterIcons(debouncedQuery, selectedCategories, sortOption)
	}, [filterIcons, debouncedQuery, selectedCategories, sortOption])

	const updateResults = useCallback(
		(query: string, categories: string[], sort: SortOption, page = 1) => {
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

			// Add page parameter if not the first page
			if (page > 1) {
				params.set("page", page.toString())
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

	const handlePageChange = useCallback(
		(page: number) => {
			setCurrentPage(page);
			updateResults(searchQuery, selectedCategories, sortOption, page);
		},
		[updateResults, searchQuery, selectedCategories, sortOption],
	)

	const clearFilters = useCallback(() => {
		setSearchQuery("")
		setSelectedCategories([])
		setSortOption("relevance")
		setCurrentPage(1)
		updateResults("", [], "relevance", 1)
	}, [updateResults])

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		if (filteredIcons.length === 0 && searchQuery) {
			console.log("no icons found", {
				query: searchQuery,
			})
			posthog.capture("no icons found", {
				query: searchQuery,
			})
		}
	}, [filteredIcons, searchQuery])

	if (!searchParams) return null

	const getSortLabel = (sort: SortOption) => {
		switch (sort) {
			case "relevance":
				return "Relevance"
			case "alphabetical-asc":
				return "Name (A-Z)"
			case "alphabetical-desc":
				return "Name (Z-A)"
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
						placeholder="Search for icons..."
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
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm"
								aria-label="Filter icons"
							>
								<Filter className="h-4 w-4 mr-2" />
								<span>{selectedCategories.length > 0 ? `Filters (${selectedCategories.length})` : "Filter"}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64 sm:w-56">
							<DropdownMenuLabel className="font-semibold">Select Categories</DropdownMenuLabel>
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
										Clear categories
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
							<DropdownMenuLabel className="font-semibold">Sort Icons</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => handleSortChange(value as SortOption)}>
								<DropdownMenuRadioItem value="relevance" className="cursor-pointer">
									<Search className="h-4 w-4 mr-2" />
									Relevance
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-asc" className="cursor-pointer">
									<ArrowDownAZ className="h-4 w-4 mr-2" />Name (A-Z)
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="alphabetical-desc" className="cursor-pointer">
									<ArrowUpZA className="h-4 w-4 mr-2" />Name (Z-A)
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
						<Button
							variant="outline"
							size="sm"
							onClick={clearFilters}
							className="flex-1 sm:flex-none cursor-pointer bg-background"
							aria-label="Reset all filters"
						>
							<X className="h-4 w-4 mr-2" />
							<span>Reset</span>
						</Button>
					)}
				</div>

				{/* Active filter badges */}
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
				<div className="flex flex-col gap-8 py-12 max-w-2xl mx-auto items-center">
					<div className="text-center">
						<h2 className="text-3xl sm:text-5xl font-semibold">Icon not found</h2>
						<p className="text-lg text-muted-foreground mt-2">Help us expand our collection</p>
					</div>
					<div className="flex flex-col gap-4 items-center w-full">
						<IconSubmissionContent />
						<div className="mt-4 flex items-center gap-2 justify-center">
							<span className="text-sm text-muted-foreground">Can't submit it yourself?</span>
							<Button
								className="cursor-pointer"
								variant="outline"
								size="sm"
								onClick={() => {
									setIsLazyRequestSubmitted(true)
									toast("Request received!", {
										description: `We've noted your request for "${searchQuery || "this icon"}". Thanks for your suggestion.`,
									})
									posthog.capture("lazy icon request", {
										query: searchQuery,
										categories: selectedCategories,
									})
								}}
								disabled={isLazyRequestSubmitted}
							>
								Request this icon
							</Button>
						</div>
					</div>
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

					<IconsGrid
						filteredIcons={filteredIcons}
						matchedAliases={matchedAliases}
						currentPage={currentPage}
						iconsPerPage={iconsPerPage}
						onPageChange={handlePageChange}
						totalIcons={filteredIcons.length}
					/>
				</>
			)}
		</>
	)
}

function IconCard({
	name,
	data: iconData,
}: {
	name: string
	data: Icon
}) {
	return (
		<MagicCard className="rounded-md shadow-md cursor-pointer">
			<Link prefetch={false} href={`/icons/${name}`} className="group flex flex-col items-center p-3 sm:p-4">
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
			</Link>
		</MagicCard>
	)
}

interface IconsGridProps {
	filteredIcons: { name: string; data: Icon }[]
	matchedAliases: Record<string, string>
	currentPage: number
	iconsPerPage: number
	onPageChange: (page: number) => void
	totalIcons: number
}

function IconsGrid({ filteredIcons, matchedAliases, currentPage, iconsPerPage, onPageChange, totalIcons }: IconsGridProps) {
	// Calculate pagination values
	const totalPages = Math.ceil(totalIcons / iconsPerPage)
	const indexOfLastIcon = currentPage * iconsPerPage
	const indexOfFirstIcon = indexOfLastIcon - iconsPerPage
	const currentIcons = filteredIcons.slice(indexOfFirstIcon, indexOfLastIcon)

	// Calculate letter ranges for each page
	const getLetterRange = (pageNum: number) => {
		if (filteredIcons.length === 0) return '';
		const start = (pageNum - 1) * iconsPerPage;
		const end = Math.min(start + iconsPerPage - 1, filteredIcons.length - 1);

		if (start >= filteredIcons.length) return '';

		const firstLetter = filteredIcons[start].name.charAt(0).toUpperCase();
		const lastLetter = filteredIcons[end].name.charAt(0).toUpperCase();

		return firstLetter === lastLetter ? firstLetter : `${firstLetter} - ${lastLetter}`;
	};

	// Get current page letter range
	const currentLetterRange = getLetterRange(currentPage);

	// Handle direct page input
	const [pageInput, setPageInput] = useState(currentPage.toString());

	useEffect(() => {
		setPageInput(currentPage.toString());
	}, [currentPage]);

	const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPageInput(e.target.value);
	};

	const handlePageInputSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const pageNumber = parseInt(pageInput);
		if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
			onPageChange(pageNumber);
		} else {
			// Reset to current page if invalid
			setPageInput(currentPage.toString());
		}
	};

	return (
		<>
			<AnimatePresence mode="wait">
				<motion.div
					key={currentPage}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
					className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-2"
				>
					{currentIcons.map(({ name, data }) => (
						<IconCard key={name} name={name} data={data} />
					))}
				</motion.div>
			</AnimatePresence>

			{totalPages > 1 && (
				<div className="flex flex-col gap-4 mt-8">
					{/* Mobile view: centered content */}
					<div className="text-sm text-muted-foreground text-center md:text-left md:hidden">
						Showing {indexOfFirstIcon + 1}-{Math.min(indexOfLastIcon, totalIcons)} of {totalIcons} icons
						{currentLetterRange && (
							<span className="ml-2 font-medium">({currentLetterRange})</span>
						)}
					</div>

					{/* Desktop view layout */}
					<div className="hidden md:flex justify-between items-center">
						<div className="text-sm text-muted-foreground">
							Showing {indexOfFirstIcon + 1}-{Math.min(indexOfLastIcon, totalIcons)} of {totalIcons} icons
							{currentLetterRange && (
								<span className="ml-2 font-medium">({currentLetterRange})</span>
							)}
						</div>

						<div className="flex items-center gap-4">
							{/* Page input and total count */}
							<form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
								<Input
									type="number"
									min={1}
									max={totalPages}
									value={pageInput}
									onChange={handlePageInputChange}
									className="w-16 h-8 text-center cursor-text"
									aria-label="Go to page"
								/>
								<span className="text-sm whitespace-nowrap">of {totalPages}</span>
								<Button type="submit" size="sm" variant="outline" className="h-8 cursor-pointer">Go</Button>
							</form>

							{/* Pagination controls */}
							<div className="flex items-center">
								<Button
									onClick={() => onPageChange(currentPage - 1)}
									disabled={currentPage === 1}
									size="sm"
									variant="outline"
									className="h-8 rounded-r-none cursor-pointer"
									aria-label="Previous page"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>

								<div className="flex items-center overflow-hidden">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										// Show pages around current page
										let pageNum;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}

										// Calculate letter range for this page
										const letterRange = getLetterRange(pageNum);

										return (
											<Button
												key={pageNum}
												onClick={() => onPageChange(pageNum)}
												variant={pageNum === currentPage ? "default" : "outline"}
												size="sm"
												className={`h-8 w-8 p-0 rounded-none relative group cursor-pointer transition-colors duration-200 ${
													pageNum === currentPage ? "font-medium" : ""
												}`}
												aria-label={`Page ${pageNum}`}
												aria-current={pageNum === currentPage ? "page" : undefined}
											>
												{pageNum}
												{letterRange && (
													<span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md whitespace-nowrap">
														{letterRange}
													</span>
												)}
											</Button>
										);
									})}
								</div>

								<Button
									onClick={() => onPageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									size="sm"
									variant="outline"
									className="h-8 rounded-l-none cursor-pointer"
									aria-label="Next page"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Mobile-only pagination layout - centered */}
					<div className="flex flex-col items-center gap-4 md:hidden">
						{/* Mobile pagination controls */}
						<div className="flex items-center">
							<Button
								onClick={() => onPageChange(currentPage - 1)}
								disabled={currentPage === 1}
								size="sm"
								variant="outline"
								className="h-8 rounded-r-none cursor-pointer"
								aria-label="Previous page"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<div className="flex items-center overflow-hidden">
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									// Show pages around current page - same logic as desktop
									let pageNum;
									if (totalPages <= 5) {
										pageNum = i + 1;
									} else if (currentPage <= 3) {
										pageNum = i + 1;
									} else if (currentPage >= totalPages - 2) {
										pageNum = totalPages - 4 + i;
									} else {
										pageNum = currentPage - 2 + i;
									}

									return (
										<Button
											key={pageNum}
											onClick={() => onPageChange(pageNum)}
											variant={pageNum === currentPage ? "default" : "outline"}
											size="sm"
											className={`h-8 w-8 p-0 rounded-none cursor-pointer ${
												pageNum === currentPage ? "font-medium" : ""
											}`}
											aria-label={`Page ${pageNum}`}
											aria-current={pageNum === currentPage ? "page" : undefined}
										>
											{pageNum}
										</Button>
									);
								})}
							</div>

							<Button
								onClick={() => onPageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								size="sm"
								variant="outline"
								className="h-8 rounded-l-none cursor-pointer"
								aria-label="Next page"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>

						{/* Mobile page input */}
						<form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
							<Input
								type="number"
								min={1}
								max={totalPages}
								value={pageInput}
								onChange={handlePageInputChange}
								className="w-16 h-8 text-center cursor-text"
								aria-label="Go to page"
							/>
							<span className="text-sm whitespace-nowrap">of {totalPages}</span>
							<Button type="submit" size="sm" variant="outline" className="h-8 cursor-pointer">Go</Button>
						</form>
					</div>
				</div>
			)}
		</>
	)
}
