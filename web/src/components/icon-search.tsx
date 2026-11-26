"use client"

import { ArrowDownAZ, ArrowUpZA, Calendar, Filter, Search, SortAsc, X } from "lucide-react"
import { useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AddMcpButton } from "@/components/add-mcp-button"
import { AddToSearchBarButton } from "@/components/add-to-search-bar-button"
import { VirtualizedIconsGrid } from "@/components/icon-grid"
import { IconSubmissionContent } from "@/components/icon-submission-form"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { DASHBOARD_ICONS_ICON, EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import type { IconVariantMatch } from "@/lib/icons/variants"
import { cn, filterAndSortIcons, findMatchedVariant, formatIconName, normalizeForSearch, type SortOption } from "@/lib/utils"
import type { IconSearchEntry, IconSearchProps } from "@/types/icons"

type SourceFilter = "all" | "native" | ExternalSourceId

type BrowseUpdate = {
	sort?: SortOption
	source?: SourceFilter
	removeCategory?: string
	reset?: boolean
}

function parseSortOption(value: string | null): SortOption | null {
	switch (value) {
		case "alphabetical-asc":
		case "alphabetical-desc":
		case "newest":
		case "relevance":
			return value
		default:
			return null
	}
}

function parseSourceFilter(value: string | null): SourceFilter {
	if (value === "native") return value
	if (value && EXTERNAL_SOURCE_IDS.some((sourceId) => sourceId === value)) return value as ExternalSourceId
	return "all"
}

function readCategories(params: URLSearchParams): string[] {
	const categories = new Map<string, string>()
	for (const value of params.getAll("category")) {
		const category = value.trim()
		const key = category.toLowerCase()
		if (category && !categories.has(key)) categories.set(key, category)
	}
	return Array.from(categories.values())
}

function updateResults(query: string, { sort, source, removeCategory, reset }: BrowseUpdate = {}) {
	const url = new URL(window.location.href)
	const categories = readCategories(url.searchParams)
	const params = new URLSearchParams()
	if (!reset) {
		const nextSource = source ?? parseSourceFilter(url.searchParams.get("source"))
		const nextSort = sort ?? parseSortOption(url.searchParams.get("sort"))
		if (query) params.set("q", query)
		if (nextSource !== "all") params.set("source", nextSource)
		if (nextSort) params.set("sort", nextSort)
		for (const category of categories) {
			if (category !== removeCategory) params.append("category", category)
		}
	}

	url.search = params.toString()
	if (url.href === window.location.href) return
	if (removeCategory || (reset && categories.length > 0)) window.history.pushState(null, "", url)
	else window.history.replaceState(null, "", url)
}

function getResultsStatus(count: number): string {
	if (count === 0) return "No icons found."
	if (count === 1) return "Found 1 icon."
	return `Found ${count} icons.`
}

function getIconsForSource(icons: IconSearchEntry[], source: SourceFilter) {
	if (source === "all") return icons
	return icons.filter((icon) => icon.source === source)
}

export function IconSearch({ icons }: IconSearchProps) {
	const searchParams = useSearchParams()
	const debouncedQuery = searchParams.get("q") ?? ""
	const explicitSort = parseSortOption(searchParams.get("sort"))
	const sortOption = explicitSort ?? "newest"
	const sourceFilter = parseSourceFilter(searchParams.get("source"))
	const categories = useMemo(() => readCategories(searchParams), [searchParams])
	const [queryDraft, setQueryDraft] = useState<string | null>(null)
	const searchQuery = queryDraft ?? debouncedQuery
	const sortButtonRef = useRef<HTMLButtonElement>(null)
	const pendingSearchRef = useRef<{ timeout: ReturnType<typeof setTimeout>; url: string } | null>(null)
	const noIconsFoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const cancelPendingSearch = useCallback(() => {
		if (pendingSearchRef.current === null) return
		clearTimeout(pendingSearchRef.current.timeout)
		pendingSearchRef.current = null
	}, [])

	useEffect(() => {
		const url = new URL(window.location.href)
		if (url.searchParams.toString() !== searchParams.toString()) return
		// Next.js can reflect an earlier history write while the next query is pending.
		if (pendingSearchRef.current?.url === url.href) return
		cancelPendingSearch()
		setQueryDraft(null)
	}, [cancelPendingSearch, searchParams])

	useEffect(() => {
		const restoreSearch = () => {
			cancelPendingSearch()
			setQueryDraft(new URLSearchParams(window.location.search).get("q") ?? "")
		}
		window.addEventListener("popstate", restoreSearch)
		return () => window.removeEventListener("popstate", restoreSearch)
	}, [cancelPendingSearch])

	// Find matched aliases for display purposes
	const matchedAliases = useMemo(() => {
		if (!debouncedQuery.trim()) return {}

		const q = debouncedQuery.toLowerCase()
		const qNormalized = normalizeForSearch(debouncedQuery)
		const matches: Record<string, string> = {}

		for (const { name, data } of icons) {
			const nameNormalized = normalizeForSearch(name)
			if (!name.toLowerCase().includes(q) && !nameNormalized.includes(qNormalized)) {
				const matchingAlias = data.aliases.find((alias) => {
					const aliasLower = alias.toLowerCase()
					const aliasNormalized = normalizeForSearch(alias)
					return aliasLower.includes(q) || aliasNormalized.includes(qNormalized)
				})
				if (matchingAlias) {
					matches[name] = matchingAlias
				}
			}
		}

		return matches
	}, [icons, debouncedQuery])

	const filteredIcons = useMemo(() => {
		return filterAndSortIcons({
			icons: getIconsForSource(icons, sourceFilter),
			query: debouncedQuery,
			categories,
			sort: sortOption,
		})
	}, [icons, debouncedQuery, categories, sortOption, sourceFilter])

	const matchedVariants = useMemo(() => {
		const matches = new Map<IconSearchEntry, IconVariantMatch>()
		for (const icon of filteredIcons) {
			const variant = findMatchedVariant(icon, debouncedQuery)
			if (variant) matches.set(icon, variant)
		}
		return matches
	}, [filteredIcons, debouncedQuery])

	function handleSearch(query: string) {
		setQueryDraft(query)
		cancelPendingSearch()
		const url = window.location.href
		const timeout = setTimeout(() => {
			pendingSearchRef.current = null
			if (window.location.href === url) updateResults(query)
			else setQueryDraft(null)
		}, 200)
		pendingSearchRef.current = { timeout, url }
	}

	function changeFilters(update: BrowseUpdate) {
		const url = new URL(window.location.href)
		let query = url.searchParams.get("q") ?? ""
		if (pendingSearchRef.current?.url === url.href && queryDraft !== null) query = queryDraft
		cancelPendingSearch()
		updateResults(query, update)
	}

	function removeCategory(category: string, button: HTMLButtonElement) {
		if (document.activeElement === button) {
			const adjacentButton = button.nextElementSibling ?? button.previousElementSibling
			let focusTarget = sortButtonRef.current
			if (adjacentButton instanceof HTMLButtonElement) focusTarget = adjacentButton
			focusTarget?.focus({ preventScroll: true })
		}
		changeFilters({ removeCategory: category })
	}

	function clearSearch() {
		cancelPendingSearch()
		setQueryDraft("")
		updateResults("")
	}

	function clearFilters() {
		cancelPendingSearch()
		setQueryDraft("")
		updateResults("", { reset: true })
	}

	useEffect(() => {
		return () => {
			cancelPendingSearch()
			if (noIconsFoundTimeoutRef.current) {
				clearTimeout(noIconsFoundTimeoutRef.current)
			}
		}
	}, [cancelPendingSearch])

	useEffect(() => {
		if (noIconsFoundTimeoutRef.current) {
			clearTimeout(noIconsFoundTimeoutRef.current)
		}

		if (filteredIcons.length === 0 && debouncedQuery.trim().length >= 2) {
			noIconsFoundTimeoutRef.current = setTimeout(() => {
				if (filteredIcons.length === 0 && debouncedQuery.trim().length >= 2) {
					console.log("no icons found", {
						query: debouncedQuery,
					})
					posthog.capture("no icons found", {
						query: debouncedQuery,
					})
				}
			}, 500)
		}

		return () => {
			if (noIconsFoundTimeoutRef.current) {
				clearTimeout(noIconsFoundTimeoutRef.current)
			}
		}
	}, [filteredIcons, debouncedQuery])

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

	const getSourceLabel = (source: SourceFilter) => {
		if (source === "native") return "Dashboard Icons"
		if (source === "all") return "All sources"
		return EXTERNAL_SOURCES[source]?.label ?? source
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
						placeholder="Search icons by name, alias or variant..."
						aria-label="Search icons"
						className={cn(
							"w-full h-10 pl-9 cursor-text transition-all duration-300 text-sm md:text-base border-border shadow-sm",
							searchQuery && "pr-9",
						)}
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
					/>
					{searchQuery && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
							aria-label="Clear search"
							onClick={clearSearch}
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>

				{/* Filter and sort controls */}
				<div className="flex flex-wrap gap-2 justify-start">
					{/* Sort dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								ref={sortButtonRef}
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm"
							>
								{getSortIcon(sortOption)}
								<span className="ml-2">{getSortLabel(sortOption)}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel className="font-semibold">Sort By</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => changeFilters({ sort: value as SortOption })}>
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

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="flex-1 sm:flex-none cursor-pointer bg-background border-border shadow-sm">
								{sourceFilter === "all" ? (
									<Filter className="h-4 w-4 mr-2" />
								) : sourceFilter === "native" ? (
									<UnoptimizedImage src={DASHBOARD_ICONS_ICON} alt="" width={16} height={16} className="shrink-0 mr-2" />
								) : (
									<UnoptimizedImage src={EXTERNAL_SOURCES[sourceFilter].icon} alt="" width={16} height={16} className="shrink-0 mr-2" />
								)}
								<span>{getSourceLabel(sourceFilter)}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel className="font-semibold">Source</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value={sourceFilter} onValueChange={(value) => changeFilters({ source: value as SourceFilter })}>
								<DropdownMenuRadioItem value="all" className="cursor-pointer">
									All
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="native" className="cursor-pointer">
									<UnoptimizedImage src={DASHBOARD_ICONS_ICON} alt="" width={14} height={14} className="shrink-0" />
									Dashboard Icons
								</DropdownMenuRadioItem>
								{EXTERNAL_SOURCE_IDS.map((sourceId) => (
									<DropdownMenuRadioItem key={sourceId} value={sourceId} className="cursor-pointer">
										<UnoptimizedImage src={EXTERNAL_SOURCES[sourceId].icon} alt="" width={14} height={14} className="shrink-0" />
										{EXTERNAL_SOURCES[sourceId].label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>

					<AddToSearchBarButton className="flex-1 sm:flex-none rounded-sm" />
					<AddMcpButton className="flex-1 sm:flex-none rounded-sm" source="icon_search" />

					{/* Clear all button */}
					{(searchQuery || explicitSort !== null || sourceFilter !== "all" || categories.length > 0) && (
						<Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none cursor-pointer bg-background">
							<X className="h-4 w-4 mr-2" />
							<span>Reset all</span>
						</Button>
					)}
				</div>

				{categories.length > 0 && (
					<fieldset className="flex min-w-0 flex-wrap gap-2">
						<legend className="sr-only">Active categories</legend>
						{categories.map((category) => (
							<Button
								key={category.toLowerCase()}
								type="button"
								variant="secondary"
								size="sm"
								className="h-auto min-h-9 max-w-full rounded-full py-1 text-start whitespace-normal"
								onClick={(event) => removeCategory(category, event.currentTarget)}
							>
								<span className="[overflow-wrap:anywhere]">
									<span className="sr-only">Remove category </span>
									{formatIconName(category, { capitalize: true })}
								</span>
								<X aria-hidden="true" className="size-4" />
							</Button>
						))}
					</fieldset>
				)}

				<Separator className="my-2" />
			</div>

			<div className="flex justify-between items-center">
				<output aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
					{getResultsStatus(filteredIcons.length)}
				</output>
				{filteredIcons.length > 0 && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						{getSortIcon(sortOption)}
						<span>{getSortLabel(sortOption)}</span>
					</div>
				)}
			</div>

			{filteredIcons.length === 0 ? (
				<div className="flex flex-col gap-8 py-12 px-2 w-full max-w-full sm:max-w-2xl mx-auto items-center overflow-x-hidden">
					<div className="text-center w-full">
						<h2 className="text-3xl sm:text-5xl font-semibold">No icons found</h2>
						<p className="text-muted-foreground mt-2">Try different keywords or reset your filters.</p>
						<Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 cursor-pointer">
							<X className="h-4 w-4 mr-2" />
							Reset all filters
						</Button>
					</div>
					{debouncedQuery.trim().length >= 2 && (
						<div className="flex flex-col gap-4 items-center w-full">
							<div id="icon-submission-content" className="w-full">
								<IconSubmissionContent />
							</div>
						</div>
					)}
				</div>
			) : (
				<VirtualizedIconsGrid filteredIcons={filteredIcons} matchedAliases={matchedAliases} matchedVariants={matchedVariants} />
			)}
		</>
	)
}
