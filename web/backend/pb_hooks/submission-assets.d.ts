import type { LabelledAsset, SubmissionVariant, VariantExtras } from "../../src/lib/submission-variants"

export interface AssetReference {
	group: "colors" | "wordmark" | "variants"
	key: string
	variant: SubmissionVariant
	reference: string
	candidates: string[]
	file?: string
}

export interface UnresolvedVariantReference {
	variant: SubmissionVariant
	reference: string
	assets: string[]
}

export function matchingAssetNames(reference: string, assets: string[]): string[]
export function resolveSubmissionAssets(
	extras: VariantExtras | undefined,
	assets: string[],
	name?: string,
): {
	assets: LabelledAsset[]
	references: AssetReference[]
}
export function snapshotVariantMetadata<T extends VariantExtras>(
	extras: T,
	assets: string[],
	copies: Record<string, string>,
	name?: string,
): {
	extras: T
	asset_sources: Record<string, string>
	asset_variants: Record<string, SubmissionVariant>
	unresolved_variants: UnresolvedVariantReference[]
}
