export type VariantStemSource = {
	colors?: { light?: string; dark?: string }
	wordmark?: { default?: string; light?: string; dark?: string }
	variants?: Record<string, string>
}

export type VariantStem = [key: string, stem: string]
export type StemOwnership = Map<string, Set<string>>

export const RESERVED_VARIANT_NAMES: readonly string[]
export function customVariantNameError(name: string): string | undefined
export function declaredVariantStems(name: string, data: VariantStemSource): VariantStem[]
export function submissionVariantStems(name: string, extras?: VariantStemSource): VariantStem[]
export function addStemOwnership(index: StemOwnership, owner: string, stems: VariantStem[]): StemOwnership
export function stemOwnership(metadata: Record<string, VariantStemSource>): StemOwnership
export function stemCollisionError(owner: string, stems: VariantStem[], index: StemOwnership): string | undefined
