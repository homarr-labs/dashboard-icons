import type { IconWithName } from "@/types/icons"

export function normalizeForSearch(str: string): string {
	return str.toLowerCase().replace(/[-\s]/g, "")
}

export function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = []

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			const cost = a[j - 1] === b[i - 1] ? 0 : 1
			matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
		}
	}

	return matrix[b.length][a.length]
}

export function calculateStringSimilarity(str1: string, str2: string): number {
	if (!str1.length || !str2.length) return 0
	if (str1 === str2) return 1

	const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
	const maxLength = Math.max(str1.length, str2.length)
	return 1 - distance / maxLength
}

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

	if (queryIndex === normalizedQuery.length) {
		return normalizedStr.length / (strIndex + 1)
	}

	return 0
}

export function fuzzySearch(text: string, query: string): number {
	if (!query) return 1
	if (!text) return 0

	const normalizedText = text.toLowerCase()
	const normalizedQuery = query.toLowerCase()
	const strippedText = normalizeForSearch(text)
	const strippedQuery = normalizeForSearch(query)

	let score = 0

	if (normalizedText === normalizedQuery || strippedText === strippedQuery) score += 1.0
	else if (normalizedText.startsWith(normalizedQuery) || strippedText.startsWith(strippedQuery)) score += 0.85
	else if (normalizedText.includes(normalizedQuery) || strippedText.includes(strippedQuery)) score += 0.7

	const sequenceScore = containsCharsInOrder(normalizedText, normalizedQuery)
	const similarityScore = calculateStringSimilarity(normalizedText, normalizedQuery)

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
	const wordMatchScore = wordMatchCount / queryWords.length

	score += sequenceScore * 0.1 + similarityScore * 0.1 + wordMatchScore * 0.6

	if (queryWords.length > 1 && !allWordsPresent) score *= 0.4
	if (score < 0.5) score *= 0.3

	return score
}

export type SortOption = "relevance" | "alphabetical-asc" | "alphabetical-desc" | "newest"

export function scoreIcon(icon: IconWithName, query: string): number {
	const NAME_WEIGHT = 2.0
	const ALIAS_WEIGHT = 1.5
	const nameScore = fuzzySearch(icon.name, query) * NAME_WEIGHT
	const aliasScore =
		icon.data.aliases.length > 0 ? Math.max(...icon.data.aliases.map((alias) => fuzzySearch(alias, query))) * ALIAS_WEIGHT : 0
	return Math.max(nameScore, aliasScore)
}

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
	const CATEGORY_PENALTY = 0.7

	let filtered = icons

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
				const onlyCategoryMatch = categoryScore > 0.7 && nameScore < 0.5 && aliasScore < 0.5
				const finalScore = onlyCategoryMatch ? maxScore * CATEGORY_PENALTY : maxScore

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
				const externalRank = (icon: IconWithName) => Number(Boolean(icon.source && icon.source !== "native"))
				const rankDiff = externalRank(a.icon) - externalRank(b.icon)
				if (rankDiff !== 0) return rankDiff
				return a.icon.name.localeCompare(b.icon.name)
			})

		filtered = scored.map((item) => item.icon)
	}

	const nativeFirst = (a: IconWithName, b: IconWithName) => {
		const aExt = a.source && a.source !== "native" ? 1 : 0
		const bExt = b.source && b.source !== "native" ? 1 : 0
		return aExt - bExt
	}

	if (sort === "alphabetical-asc") {
		filtered = filtered.slice().sort((a, b) => nativeFirst(a, b) || a.name.localeCompare(b.name))
	} else if (sort === "alphabetical-desc") {
		filtered = filtered.slice().sort((a, b) => nativeFirst(a, b) || b.name.localeCompare(a.name))
	} else if (sort === "newest") {
		filtered = filtered.slice().sort((a, b) => {
			const nf = nativeFirst(a, b)
			if (nf !== 0) return nf
			const aTime = a.data.update?.timestamp ? new Date(a.data.update.timestamp).getTime() : 0
			const bTime = b.data.update?.timestamp ? new Date(b.data.update.timestamp).getTime() : 0
			return bTime - aTime
		})
	}

	if (limit && filtered.length > limit) {
		return filtered.slice(0, limit)
	}
	return filtered
}
