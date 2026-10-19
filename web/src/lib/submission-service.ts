import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import type { createServerPB, Submission } from "@/lib/pb"
import { SUBMISSION_VARIANTS, type SubmissionVariant, VARIANT_KINDS, variantExtras } from "@/lib/submission-variants"

export const ASSET_EXTENSIONS = { "image/svg+xml": "svg", "image/png": "png" } as const
type AssetType = keyof typeof ASSET_EXTENSIONS

export const MAX_ASSET_BYTES = 1024 * 1024 * 5
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
	for (const variant of SUBMISSION_VARIANTS) {
		const file = input.assets[variant]
		if (!file) continue
		const label = `${VARIANT_KINDS[variant].label} variant`
		const type = assetType(file)
		if (!type) return { ok: false, error: `The ${label} file must be an SVG or PNG` }
		if (file.size === 0) return { ok: false, error: `The ${label} file is empty` }
		if (file.size > MAX_ASSET_BYTES) return { ok: false, error: `The ${label} file is larger than ${MAX_ASSET_BYTES / 1024 / 1024} MB` }
		const filename = `${input.name}${VARIANT_KINDS[variant].suffix}.${ASSET_EXTENSIONS[type]}`
		files.push(new File([file], filename, { type }))
		filenames[variant] = filename
	}
	return { ok: true, files, filenames, base: ASSET_EXTENSIONS[baseType] }
}

export async function createSubmission(pb: SubmissionPocketBase, userId: string, input: SubmissionInput): Promise<SubmissionOutcome> {
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

	const record = await pb.collection("submissions").create(
		{
			name: input.name,
			assets: prepared.files,
			created_by: userId,
			status: "pending",
			description: input.description,
			target_submission: input.targetSubmission,
			extras,
		},
		{ requestKey: null },
	)
	return { ok: true, record }
}
