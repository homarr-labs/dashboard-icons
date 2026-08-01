import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatIconName(name: string) {
	return name.replace(/-/g, " ")
}

export {
	filterAndSortIcons,
	normalizeForSearch,
	type SortOption,
} from "@/lib/icons/search"
