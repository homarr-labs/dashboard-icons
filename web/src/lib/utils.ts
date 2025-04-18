import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
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
 * Advanced fuzzy search with multiple scoring methods
 * Returns a score from 0-1, where 1 is a perfect match
 */
export function fuzzySearch(text: string, query: string): number {
	if (!query) return 1
	if (!text) return 0

	// Direct inclusion check (highest priority)
	const normalizedText = text.toLowerCase()
	const normalizedQuery = query.toLowerCase()

	if (normalizedText === normalizedQuery) return 1
	if (normalizedText.includes(normalizedQuery)) return 0.9

	// Check for character sequence matches
	const sequenceScore = containsCharsInOrder(normalizedText, normalizedQuery)

	// Calculate string similarity
	const similarityScore = calculateStringSimilarity(normalizedText, normalizedQuery)

	// Word-by-word matching for multi-word queries
	const textWords = normalizedText.split(/\s+/)
	const queryWords = normalizedQuery.split(/\s+/)

	let wordMatchCount = 0
	for (const queryWord of queryWords) {
		for (const textWord of textWords) {
			if (
				textWord.includes(queryWord) ||
				calculateStringSimilarity(textWord, queryWord) > 0.7 ||
				containsCharsInOrder(textWord, queryWord) > 0
			) {
				wordMatchCount++
				break
			}
		}
	}

	const wordMatchScore = queryWords.length > 0 ? wordMatchCount / queryWords.length : 0

	// Combine scores with weights
	return Math.max(sequenceScore * 0.3, similarityScore * 0.3, wordMatchScore * 0.4)
}
