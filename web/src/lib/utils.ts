import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IconWithName } from "@/types/icons"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatIconName(name: string) {
	return name.replace(/-/g, " ")
}

/**
 * Normalize a string for search by removing dashes and spaces
 * This allows "homeassistant" to match "home-assistant" and "home assistant"
 */
export function normalizeForSearch(str: string): string {
	return str.toLowerCase().replace(/[-\s]/g, "")
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = []

	// Initialize the matrix
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j
	}

	// Fill the matrix
	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			const cost = a[j - 1] === b[i - 1] ? 0 : 1
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1, // deletion
				matrix[i][j - 1] + 1, // insertion
				matrix[i - 1][j - 1] + cost, // substitution
			)
		}
	}

	return matrix[b.length][a.length]
}

/**
 * Calculate similarity score between two strings (0-1)
 * Higher score means more similar
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
	if (!str1.length || !str2.length) return 0
	if (str1 === str2) return 1

	const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
	const maxLength = Math.max(str1.length, str2.length)
	return 1 - distance / maxLength
}

/**
 * Check if string contains all characters from query in order
 * Returns match score (0 if no match)
 */
export function containsCharsInOrder(str: string, query: string): number {
	if (!query) return 1
	if (!str) return 0

	const normalizedStr = str.toLowerCase()
	const normalizedQuery = query.toLowerCase()

	let strIndex = 0
	let queryIndex = 0

	while (strIndex < normalizedStr.length && queryIndex < normalizedQuery.length) {
		if (normalizedStr[strIndex] === normalizedQuery[queryIndex]) {
			queryIndex++
		}
		strIndex++
	}

	// If we matched all characters in the query
	if (queryIndex === normalizedQuery.length) {
		// Calculate a score based on closeness of matches
		// Higher score if characters are close together
		const matchRatio = normalizedStr.length / (strIndex + 1)
		return matchRatio
	}

	return 0
}

/**
 * Advanced fuzzy search with composite scoring and bonuses:
 * - Bonus for exact, prefix, substring matches (additive)
 * - Penalize weak matches
 * - Require all query words to be present somewhere for multi-word queries
 * - Returns composite score (0-1+)
 */
export function fuzzySearch(text: string, query: string): number {
	if (!query) return 1
	if (!text) return 0

	const normalizedText = text.toLowerCase()
	const normalizedQuery = query.toLowerCase()
	
	// Also create versions without dashes/spaces for matching "homeassistant" -> "home-assistant"
	const strippedText = normalizeForSearch(text)
	const strippedQuery = normalizeForSearch(query)

	let score = 0

	// Bonuses for strong matches (check both normal and stripped versions)
	if (normalizedText === normalizedQuery || strippedText === strippedQuery) score += 1.0
	else if (normalizedText.startsWith(normalizedQuery) || strippedText.startsWith(strippedQuery)) score += 0.85
	else if (normalizedText.includes(normalizedQuery) || strippedText.includes(strippedQuery)) score += 0.7

	// Sequence, similarity, word match
	const sequenceScore = containsCharsInOrder(normalizedText, normalizedQuery)
	const similarityScore = calculateStringSimilarity(normalizedText, normalizedQuery)

	// Multi-word query: require all words to be present somewhere
	const textWords = normalizedText.split(/\s+/)
	const queryWords = normalizedQuery.split(/\s+/)
	let wordMatchCount = 0
	for (const queryWord of queryWords) {
		for (const textWord of textWords) {
			if (
				textWord === queryWord ||
				textWord.startsWith(queryWord) ||
				textWord.includes(queryWord) ||
				calculateStringSimilarity(textWord, queryWord) > 0.8 ||
				containsCharsInOrder(textWord, queryWord) > 0.5
			) {
				wordMatchCount++
				break
			}
		}
	}
	const allWordsPresent = wordMatchCount === queryWords.length
	const wordMatchScore = queryWords.length > 0 ? wordMatchCount / queryWords.length : 0

	// Composite score
	score += sequenceScore * 0.1 + similarityScore * 0.1 + wordMatchScore * 0.6

	// Penalize if not all words present in multi-word query
	if (queryWords.length > 1 && !allWordsPresent) score *= 0.4

	// Penalize very weak matches
	if (score < 0.5) score *= 0.3

	return score
}

/**
 * Filter and sort icons using advanced fuzzy search, categories, and sort options
 * - Tunable weights for name, alias, category
 * - Penalize if only category matches
 * - Require all query words to be present in at least one field
 */
export type SortOption = "relevance" | "alphabetical-asc" | "alphabetical-desc" | "newest"

export function filterAndSortIcons({
	icons,
	query = "",
	categories = [],
	sort = "relevance",
	limit,
}: {
	icons: IconWithName[]
	query?: string
	categories?: string[]
	sort?: SortOption
	limit?: number
}): IconWithName[] {
	const NAME_WEIGHT = 2.0
	const ALIAS_WEIGHT = 1.5
	const CATEGORY_WEIGHT = 1.0
	const CATEGORY_PENALTY = 0.7 // Penalize if only category matches

	let filtered = icons

	// Filter by categories if any are selected
	if (categories.length > 0) {
		filtered = filtered.filter(({ data }) =>
			data.categories.some((cat) => categories.some((selectedCat) => cat.toLowerCase() === selectedCat.toLowerCase())),
		)
	}

	if (query.trim()) {
		const queryWords = query.toLowerCase().split(/\s+/)
		const scored = filtered
			.map((icon) => {
				const nameScore = fuzzySearch(icon.name, query) * NAME_WEIGHT
				const aliasScore =
					icon.data.aliases && icon.data.aliases.length > 0
						? Math.max(...icon.data.aliases.map((alias) => fuzzySearch(alias, query))) * ALIAS_WEIGHT
						: 0
				const categoryScore =
					icon.data.categories && icon.data.categories.length > 0
						? Math.max(...icon.data.categories.map((category) => fuzzySearch(category, query))) * CATEGORY_WEIGHT
						: 0

				const maxScore = Math.max(nameScore, aliasScore, categoryScore)

				// Penalize if only category matches
				const onlyCategoryMatch = categoryScore > 0.7 && nameScore < 0.5 && aliasScore < 0.5
				const finalScore = onlyCategoryMatch ? maxScore * CATEGORY_PENALTY : maxScore

				// Require all query words to be present in at least one field
				// Also check with normalized strings (no dashes/spaces) for matches like "homeassistant" -> "home-assistant"
				const normalizedName = normalizeForSearch(icon.name)
				const normalizedAliases = icon.data.aliases.map(normalizeForSearch)
				const normalizedCategories = icon.data.categories.map(normalizeForSearch)
				const allWordsPresent = queryWords.every((word) => {
					const normalizedWord = normalizeForSearch(word)
					return (
						icon.name.toLowerCase().includes(word) ||
						normalizedName.includes(normalizedWord) ||
						icon.data.aliases.some((alias) => alias.toLowerCase().includes(word)) ||
						normalizedAliases.some((alias) => alias.includes(normalizedWord)) ||
						icon.data.categories.some((cat) => cat.toLowerCase().includes(word)) ||
						normalizedCategories.some((cat) => cat.includes(normalizedWord))
					)
				})

				return { icon, score: allWordsPresent ? finalScore : finalScore * 0.4 }
			})
			.filter((item) => item.score > 0.7)
			.sort((a, b) => {
				if (b.score !== a.score) return b.score - a.score
				return a.icon.name.localeCompare(b.icon.name)
			})

		filtered = scored.map((item) => item.icon)
	}

	// Sorting
	if (sort === "alphabetical-asc") {
		filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name))
	} else if (sort === "alphabetical-desc") {
		filtered = filtered.slice().sort((a, b) => b.name.localeCompare(a.name))
	} else if (sort === "newest") {
		filtered = filtered.slice().sort((a, b) => {
			const aTime = a.data.update?.timestamp ? new Date(a.data.update.timestamp).getTime() : 0
			const bTime = b.data.update?.timestamp ? new Date(b.data.update.timestamp).getTime() : 0
			return bTime - aTime
		})
	} // else: relevance (already sorted by score)

	if (limit && filtered.length > limit) {
		return filtered.slice(0, limit)
	}
	return filtered
}
