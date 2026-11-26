import { NextResponse } from "next/server"
import { getIconsArray } from "@/lib/api"
import { getExternalIcons } from "@/lib/external-icons"
import { getNativeIconPreviewFormats } from "@/lib/icons/files"
import type { IconSearchEntry, IconWithName } from "@/types/icons"

const REVALIDATE_SECONDS = 900

function toIconSearchEntry(icon: IconWithName): IconSearchEntry {
	const entry: IconSearchEntry = {
		name: icon.name,
		source: icon.source,
		slug: icon.slug,
		data: {
			base: icon.data.base,
			aliases: icon.data.aliases,
			categories: icon.data.categories,
			update: icon.data.update,
			colors: icon.data.colors,
			wordmark: icon.data.wordmark,
			variants: icon.data.variants,
		},
	}
	if (icon.source === "native") {
		entry.nativePreviewFormats = getNativeIconPreviewFormats(icon.name, icon.data)
	}
	if (icon.external) {
		const { source, slug, formats, url_templates, brand_color } = icon.external
		entry.external = { source, slug, formats, url_templates, brand_color }
	}
	return entry
}

export async function GET() {
	const [native, external] = await Promise.all([getIconsArray(), getExternalIcons()])
	const icons = [...native, ...external].map(toIconSearchEntry)
	return NextResponse.json(icons, {
		headers: {
			"Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
		},
	})
}
