import type { z } from "zod"
import { checkSubmittedSvg } from "@/lib/icons/svg-safety"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import { MAX_ASSET_BYTES, MAX_SUBMISSION_ASSETS, type SubmissionInput } from "@/lib/submission-service"
import { customVariantNameError, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import type { submissionFields } from "@/mcp/tools/submission-schemas"

const PNG_ORIGINS = new Set(["https://upload.wikimedia.org", "https://cdn.wikimg.net", "https://raw.githubusercontent.com"])
const MAX_PNG_FILES = 8
const MAX_PNG_BYTES = 16 * 1024 * 1024
const PNG_HEADER = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")
const PNG_END = Buffer.from("0000000049454e44ae426082", "hex")

type Artwork = string | { png_url: string }
type Variants = z.output<typeof submissionFields.variants>
type Files = Map<SubmissionVariant, File | URL>
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export function prepareArtwork(name: string, svg: string | undefined, pngUrl: string | undefined, variants: Variants): Result<Files> {
	if (svg !== undefined && pngUrl !== undefined) return { ok: false, error: "Supply only one Base: svg or png_url." }
	const entries = new Map<SubmissionVariant, Artwork>()
	if (svg !== undefined) entries.set("base", svg)
	if (pngUrl !== undefined) entries.set("base", { png_url: pngUrl })
	const { custom, ...standard } = variants ?? {}
	for (const [key, artwork] of Object.entries(standard)) if (artwork !== undefined) entries.set(key as SubmissionVariant, artwork)
	for (const [key, artwork] of Object.entries(custom ?? {})) {
		const reason = customVariantNameError(key)
		if (reason) return { ok: false, error: `Custom variant "${key}" was not accepted: ${reason}.` }
		entries.set(`custom:${key}`, artwork)
	}
	if (entries.size > MAX_SUBMISSION_ASSETS)
		return { ok: false, error: `The submission was not accepted: Upload at most ${MAX_SUBMISSION_ASSETS} files per Icon.` }
	const files: Files = new Map()
	let pngCount = 0
	for (const [key, artwork] of entries) {
		const { label, suffix } = variantKind(key)
		if (typeof artwork === "string") {
			const checked = checkSubmittedSvg(artwork)
			if (!checked.ok) return { ok: false, error: `The ${label} SVG was not accepted: ${checked.reason}.` }
			files.set(key, new File([checked.svg], `${name}${suffix}.svg`, { type: "image/svg+xml" }))
			continue
		}
		const url = URL.parse(artwork.png_url)
		if (
			!url ||
			url.protocol !== "https:" ||
			!PNG_ORIGINS.has(url.origin) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			!url.pathname.endsWith(".png")
		)
			return {
				ok: false,
				error: `The ${label} PNG must be a direct public .png URL on ${[...PNG_ORIGINS].join(", ")} without credentials, a query or a fragment.`,
			}
		if (++pngCount > MAX_PNG_FILES) return { ok: false, error: `Supply at most ${MAX_PNG_FILES} PNGs per Icon.` }
		files.set(key, url)
	}
	return { ok: true, value: files }
}

export async function resolveArtwork(name: string, files: Files): Promise<Result<SubmissionInput["assets"]>> {
	const assets: SubmissionInput["assets"] = {}
	const signal = AbortSignal.timeout(15_000)
	let remaining = MAX_PNG_BYTES
	for (const [key, file] of files) {
		if (!(file instanceof URL)) {
			assets[key] = file
			continue
		}
		const { label, suffix } = variantKind(key)
		try {
			const response = await fetch(file, {
				headers: { Accept: "image/png" },
				credentials: "omit",
				redirect: "error",
				cache: "no-store",
				signal,
			})
			if (!response.ok || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/png") {
				await response.body?.cancel()
				return { ok: false, error: `The ${label} URL did not return a PNG (HTTP ${response.status}).` }
			}
			const bytes = await readBoundedBytes(response, Math.min(MAX_ASSET_BYTES, remaining))
			if (!bytes) {
				if (!response.bodyUsed) await response.body?.cancel()
				return { ok: false, error: `The ${label} PNG exceeds the upload limit (5 MiB per PNG, 16 MiB combined).` }
			}
			const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
			if (data.length < 57 || !data.subarray(0, PNG_HEADER.length).equals(PNG_HEADER) || !data.subarray(-PNG_END.length).equals(PNG_END))
				return { ok: false, error: `The ${label} file is not a complete PNG.` }
			remaining -= bytes.byteLength
			assets[key] = new File([bytes], `${name}${suffix}.png`, { type: "image/png" })
		} catch {
			return { ok: false, error: `The ${label} PNG could not be downloaded. Use a direct URL that does not redirect.` }
		}
	}
	return { ok: true, value: assets }
}
