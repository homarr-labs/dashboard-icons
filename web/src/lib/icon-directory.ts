import "server-only"

import { unstable_cache } from "next/cache"
import { cache } from "react"
import { EXTERNAL_SOURCES } from "@/constants"
import { getAllIcons } from "@/lib/api"
import { getExternalIconPagePath } from "@/lib/external-icon-urls"
import { getExternalIcons } from "@/lib/external-icons"
import { formatIconName } from "@/lib/utils"

const ICONS_PER_PAGE = 120

export function getIconDirectoryPath(page: number): string {
	if (page === 1) return "/icons"
	return `/icons/directory/${page}`
}

const getCachedIconDirectoryPage = unstable_cache(
	async (page: number) => {
		const [nativeIcons, externalIcons] = await Promise.all([getAllIcons(), getExternalIcons()])
		const icons = [
			...Object.keys(nativeIcons).map((slug) => ({
				name: formatIconName(slug, { capitalize: true }),
				href: `/icons/${slug}`,
				source: "Dashboard Icons",
			})),
			...externalIcons.map((icon) => ({
				name: icon.name,
				href: getExternalIconPagePath(icon),
				source: EXTERNAL_SOURCES[icon.source].label,
			})),
		].sort((a, b) => a.name.localeCompare(b.name, "en") || a.href.localeCompare(b.href, "en"))

		const totalPages = Math.max(1, Math.ceil(icons.length / ICONS_PER_PAGE))
		const start = (page - 1) * ICONS_PER_PAGE

		return {
			items: icons.slice(start, start + ICONS_PER_PAGE),
			page,
			totalPages,
			totalItems: icons.length,
			start: start + 1,
			end: Math.min(start + ICONS_PER_PAGE, icons.length),
		}
	},
	["icon-directory-page"],
	{ revalidate: 900, tags: ["native-icons", "external-icons"] },
)

export const getIconDirectoryPage = cache(getCachedIconDirectoryPage)

export type IconDirectoryPage = Awaited<ReturnType<typeof getIconDirectoryPage>>
