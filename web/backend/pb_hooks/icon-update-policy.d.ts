export interface UpdateMetadata {
	base: string
	aliases: string[]
	categories: string[]
	colors?: { light?: string; dark?: string }
	wordmark?: { default?: string; light?: string; dark?: string }
	variants?: Record<string, string>
	[key: string]: unknown
}
export type UpdateVariantKey = "base" | "light" | "dark" | "wordmark" | "wordmark_light" | "wordmark_dark" | `custom:${string}`
export interface PublishedIconSource {
	commit: string
	blobs: Record<string, string>
}
export type RemovableVariantKey = Exclude<UpdateVariantKey, "base">
export interface RemoveVariantInput {
	key: RemovableVariantKey
	note?: string
}
export type VariantChange =
	| { key: UpdateVariantKey; action: "add" | "replace"; file: string; destination: string }
	| { key: RemovableVariantKey; action: "remove"; destination: string; note?: string }
export interface UpdateTarget {
	kind: "published" | "submission"
	name: string
	id: string
	revision: string
	updated: string
	status: string
	metadata: UpdateMetadata
	files: Partial<Record<UpdateVariantKey, string>>
	source?: PublishedIconSource
	unresolved?: {
		assets: string[]
		references: { variant: UpdateVariantKey; reference: string; assets: string[] }[]
	}
}
export interface ListDelta {
	add: string[]
	remove: string[]
}
export interface IconUpdate {
	version: 1
	target: UpdateTarget
	variants: VariantChange[]
	aliases: ListDelta
	categories: ListDelta
}
export function canonical(value: unknown): string
export function revisionContent(target: Omit<UpdateTarget, "revision">): Record<string, unknown>
export function variantFiles(name: string, metadata: Partial<UpdateMetadata>, assets?: string[]): UpdateTarget["files"]
export function destination(name: string, key: UpdateVariantKey, target: UpdateTarget): string
export function listDelta(before: string[], after: string[]): ListDelta
export function applyList(before: string[], delta?: ListDelta): string[]
export function mergeMetadata(metadata: UpdateMetadata, update: IconUpdate): UpdateMetadata
export function validateDelta(update: unknown, target: UpdateTarget, assets: string[]): string | undefined
