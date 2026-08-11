import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"
import { getIconsArray } from "@/lib/api"
import { getExternalIcons } from "@/lib/external-icons"
import type { IconSearchEntry, IconWithName } from "@/types/icons"

const REVALIDATE_SECONDS = 900

function toCommandMenuEntry(icon: IconWithName): IconSearchEntry {
	return {
		name: icon.name,
		source: icon.source,
		slug: icon.slug,
		data: {
			base: icon.data.base,
			aliases: icon.data.aliases,
			categories: icon.data.categories,
		},
		...(icon.external
			? {
					external: {
						source: icon.external.source,
						slug: icon.external.slug,
						formats: icon.external.formats,
						url_templates: icon.external.url_templates,
						brand_color: icon.external.brand_color,
					},
				}
			: {}),
	}
}

const getCachedIconList = unstable_cache(
	async (): Promise<IconSearchEntry[]> => {
		const [native, external] = await Promise.all([getIconsArray(), getExternalIcons()])
		return [...native, ...external].map(toCommandMenuEntry)
	},
	["icons-search-list"],
	{ revalidate: REVALIDATE_SECONDS, tags: ["icons-search"] },
)

export async function GET() {
	const icons = await getCachedIconList()
	return NextResponse.json(icons, {
		headers: {
			"Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
		},
	})
}
