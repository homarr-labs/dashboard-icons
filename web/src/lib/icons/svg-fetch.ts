import "server-only"

import { BASE_URL, EXTERNAL_SOURCES } from "@/constants"

const SVG_FETCH_TIMEOUT_MS = 5_000
const SVG_CACHE_TTL_MS = 60 * 60 * 1000
const SVG_CACHE_MAX_ENTRIES = 200
export const MAX_SVG_BYTES = 512 * 1024

const TRUSTED_HOSTS = new Set(
	[BASE_URL, ...Object.values(EXTERNAL_SOURCES).map((source) => source.cdnBase)].map((url) => new URL(url).host),
)
const SVG_ROOT = /<svg[\s>]/i

const svgCache = new Map<string, { svg: string; expiresAt: number }>()

export function isTrustedSvgUrl(url: string): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return false
	}
	return parsed.protocol === "https:" && TRUSTED_HOSTS.has(parsed.host) && !parsed.username && !parsed.password
}

async function readCappedText(response: Response): Promise<string | null> {
	if (Number(response.headers.get("content-length")) > MAX_SVG_BYTES || !response.body) return null

	const reader = response.body.getReader()
	const chunks: Uint8Array[] = []
	let size = 0
	let chunk = await reader.read()
	while (!chunk.done) {
		size += chunk.value.byteLength
		if (size > MAX_SVG_BYTES) {
			await reader.cancel()
			return null
		}
		chunks.push(chunk.value)
		chunk = await reader.read()
	}
	return new TextDecoder().decode(Buffer.concat(chunks))
}

function remember(url: string, svg: string): void {
	svgCache.delete(url)
	svgCache.set(url, { svg, expiresAt: Date.now() + SVG_CACHE_TTL_MS })
	if (svgCache.size > SVG_CACHE_MAX_ENTRIES) {
		const [oldest] = svgCache.keys()
		svgCache.delete(oldest)
	}
}

export async function fetchTrustedSvg(url: string): Promise<string | null> {
	if (!isTrustedSvgUrl(url)) return null

	const cached = svgCache.get(url)
	if (cached && cached.expiresAt > Date.now()) return cached.svg

	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(SVG_FETCH_TIMEOUT_MS),
			headers: { Accept: "image/svg+xml" },
			redirect: "error",
			cache: "no-store",
		})
		if (!response.ok) return null

		const svg = await readCappedText(response)
		if (!svg || !SVG_ROOT.test(svg)) return null

		remember(url, svg)
		return svg
	} catch {
		return null
	}
}

export function clearSvgCacheForTests(): void {
	svgCache.clear()
}

export function getSvgCacheSizeForTests(): number {
	return svgCache.size
}
