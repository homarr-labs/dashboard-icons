import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { getIconsArray } from "@/lib/api"
import { getExternalIcons } from "@/lib/external-icons"
import type { IconWithName } from "@/types/icons"

const REVALIDATE_SECONDS = 900

const getCachedIconList = unstable_cache(
	async (): Promise<IconWithName[]> => {
		const [native, external] = await Promise.all([getIconsArray(), getExternalIcons()])
		return [...native, ...external]
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
