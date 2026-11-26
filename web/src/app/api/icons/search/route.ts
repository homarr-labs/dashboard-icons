import { createHash } from "node:crypto"
import { getExternalIconsSnapshot } from "@/lib/external-icons"
import { getMetadataSnapshot } from "@/lib/icons/service"
import type { IconSearchEntry, IconWithName } from "@/types/icons"

const REVALIDATE_SECONDS = 900
const CACHE_CONTROL = `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`

let cachedResponse:
	| {
			native: WeakRef<object>
			external: WeakRef<object>
			body: Blob
			etag: string
	  }
	| undefined

function toCommandMenuEntry(icon: IconWithName): IconSearchEntry {
	return {
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

export async function GET(request: Request) {
	const [metadata, externalSnapshot] = await Promise.all([getMetadataSnapshot(), getExternalIconsSnapshot()])
	const native = metadata.data
	const external = externalSnapshot.data
	const fresh = metadata.retryAfter === undefined && externalSnapshot.fresh

	// Reuse only the response for the currently loaded source snapshots.
	if (!fresh || cachedResponse?.native.deref() !== native || cachedResponse.external.deref() !== external) {
		const nativeEntries = Object.keys(native)
			.sort((a, b) => a.localeCompare(b))
			.map((name) => toCommandMenuEntry({ name, source: "native", slug: name, data: native[name] }))
		const entries = nativeEntries.concat(external.map(toCommandMenuEntry))
		if (!fresh) return Response.json(entries, { headers: { "Cache-Control": "no-store" } })

		const json = JSON.stringify(entries)
		const hash = createHash("sha256").update(json).digest("base64url")
		cachedResponse = {
			native: new WeakRef(native),
			external: new WeakRef(external),
			body: new Blob([json], { type: "application/json" }),
			etag: `W/"${hash}"`,
		}
	}

	const { body, etag } = cachedResponse
	const headers = { "Cache-Control": CACHE_CONTROL, ETag: etag, Vary: "Accept-Encoding" }
	const ifNoneMatch = request.headers.get("if-none-match")
	if (ifNoneMatch?.trim() === "*" || ifNoneMatch?.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag.slice(2))) {
		return new Response(null, { status: 304, headers })
	}

	return new Response(body, { headers })
}
