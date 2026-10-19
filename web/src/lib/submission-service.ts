import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import type { createServerPB, Submission } from "@/lib/pb"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantExtras, variantKind } from "@/lib/submission-variants"

export const ASSET_EXTENSIONS = { "image/svg+xml": "svg", "image/png": "png" } as const
type AssetType = keyof typeof ASSET_EXTENSIONS

export const MAX_ASSET_BYTES = 1024 * 1024 * 5
export const MAX_SUBMISSION_ASSETS = 99
const MAX_DESCRIPTION_LENGTH = 10000

export interface SubmissionInput {
	name: string
	description: string
	aliases: string[]
	categories: string[]
	targetSubmission: string
	assets: Partial<Record<SubmissionVariant, File>>
}

export type SubmissionOutcome = { ok: true; record: Submission } | { ok: false; error: string }

type PreparedAssets =
	| { ok: true; files: File[]; filenames: Partial<Record<SubmissionVariant, string>>; base: string }
	| { ok: false; error: string }

type SubmissionPocketBase = ReturnType<typeof createServerPB>

function assetType(file: File): AssetType | null {
	if (Object.hasOwn(ASSET_EXTENSIONS, file.type)) return file.type as AssetType
	const name = file.name.toLowerCase()
	if (name.endsWith(".svg")) return "image/svg+xml"
	if (name.endsWith(".png")) return "image/png"
	return null
}

function prepareAssets(input: SubmissionInput): PreparedAssets {
	const base = input.assets.base
	if (!base) return { ok: false, error: "Base icon is required" }
	const baseType = assetType(base)
	if (!baseType) return { ok: false, error: "The Base file must be an SVG or PNG" }

	const files: File[] = []
	const filenames: Partial<Record<SubmissionVariant, string>> = {}
	const customVariants = Object.keys(input.assets).filter((key): key is `custom:${string}` => key.startsWith("custom:"))
	if (Object.keys(input.assets).length > MAX_SUBMISSION_ASSETS)
		return { ok: false, error: `Upload at most ${MAX_SUBMISSION_ASSETS} files per Icon` }
	for (const variant of [...SUBMISSION_VARIANTS, ...customVariants]) {
		if (variant.startsWith("custom:")) {
			const error = customVariantNameError(variant.slice(7))
			if (error) return { ok: false, error }
		}
		const file = input.assets[variant]
		if (!file) continue
		const kind = variantKind(variant)
		const label = `${kind.label} variant`
		const type = assetType(file)
		if (!type) return { ok: false, error: `The ${label} file must be an SVG or PNG` }
		if (file.size === 0) return { ok: false, error: `The ${label} file is empty` }
		if (file.size > MAX_ASSET_BYTES) return { ok: false, error: `The ${label} file is larger than ${MAX_ASSET_BYTES / 1024 / 1024} MB` }
		const filename = `${input.name}${kind.suffix}.${ASSET_EXTENSIONS[type]}`
		files.push(new File([file], filename, { type }))
		filenames[variant] = filename
	}
	return { ok: true, files, filenames, base: ASSET_EXTENSIONS[baseType] }
}

export type PreparedSubmission =
	| { ok: false; error: string }
	| {
			ok: true
			data: {
				name: string
				assets: File[]
				created_by: string
				status: "pending"
				description: string
				target_submission: string
				extras: Submission["extras"]
			}
	  }

export function prepareSubmission(userId: string, input: SubmissionInput): PreparedSubmission {
	if (input.name.length > MAX_NAME_LENGTH || !ICON_NAME_REGEX.test(input.name))
		return { ok: false, error: "Icon name must be lowercase letters and numbers separated by single hyphens" }
	if (input.description.length > MAX_DESCRIPTION_LENGTH)
		return { ok: false, error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters` }
	const prepared = prepareAssets(input)
	if (!prepared.ok) return prepared

	const extras: Submission["extras"] = {
		aliases: [...new Set(input.aliases)],
		categories: [...new Set(input.categories)],
		base: prepared.base,
		...variantExtras(prepared.filenames),
	}

	return {
		ok: true,
		data: {
			name: input.name,
			assets: prepared.files,
			created_by: userId,
			status: "pending",
			description: input.description,
			target_submission: input.targetSubmission,
			extras,
		},
	}
}

export async function createSubmission(pb: SubmissionPocketBase, userId: string, input: SubmissionInput): Promise<SubmissionOutcome> {
	const prepared = prepareSubmission(userId, input)
	if (!prepared.ok) return prepared
	const record = await pb.collection("submissions").create(prepared.data, { requestKey: null })
	return { ok: true, record }
}
