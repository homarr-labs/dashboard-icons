import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatIconName(
	name: string,
	{ capitalize = false, aliases = [] }: { capitalize?: boolean; aliases?: readonly string[] } = {},
) {
	const words = name.split("-")
	if (!capitalize) return words.join(" ")
	const normalizedName = name.replace(/[\s.-]/g, "").toLowerCase()
	const alias = aliases.find((alias) => alias !== alias.toLowerCase() && alias.replace(/[\s.-]/g, "").toLowerCase() === normalizedName)
	if (alias) return alias.trim()
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

export {
	filterAndSortIcons,
	findMatchedVariant,
	normalizeForSearch,
	type SortOption,
} from "@/lib/icons/search"
