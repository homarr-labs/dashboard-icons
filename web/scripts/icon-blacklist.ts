export const BLACKLISTED_ICONS = ["american-express", "americanexpress"]

const normalizedBlacklist = new Set(BLACKLISTED_ICONS.map((slug) => slug.toLocaleLowerCase()))

export function isBlacklistedIcon(slug: string): boolean {
	return normalizedBlacklist.has(slug.trim().toLocaleLowerCase())
}
