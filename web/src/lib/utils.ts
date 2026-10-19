import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatIconName(name: string, { capitalize = false } = {}) {
	const words = name.split("-")
	if (!capitalize) return words.join(" ")
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

export {
	filterAndSortIcons,
	findMatchedVariant,
	normalizeForSearch,
	type SortOption,
} from "@/lib/icons/search"
