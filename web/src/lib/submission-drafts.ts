import type { SubmissionInput } from "@/lib/submission-service"
import { SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"

export interface DraftAsset {
	id: string
	file: File
	variant: SubmissionVariant
}

export interface SubmissionDraft {
	id: string
	name: string
	description: string
	aliases: string
	categories: string[]
	customVariantName: string
	assets: DraftAsset[]
}

export function newSubmissionDraft(name = ""): SubmissionDraft {
	return { id: crypto.randomUUID(), name, description: "", aliases: "", categories: [], customVariantName: "", assets: [] }
}

export function isEmptyDraft(draft: SubmissionDraft): boolean {
	return (
		!draft.name &&
		!draft.description &&
		!draft.aliases &&
		!draft.customVariantName &&
		draft.categories.length === 0 &&
		draft.assets.length === 0
	)
}

export function draftInput(draft: SubmissionDraft): SubmissionInput {
	return {
		name: draft.name,
		description: draft.description,
		aliases: draft.aliases
			.split(",")
			.map((alias) => alias.trim())
			.filter(Boolean),
		categories: draft.categories,
		targetSubmission: "",
		assets: Object.fromEntries(draft.assets.map((asset) => [asset.variant, asset.file])),
	}
}

export function filenameAssignment(
	filename: string,
	customNames: string[],
	knownSlugs: Set<string>,
): { name: string; variant: SubmissionVariant } {
	const stem = filename
		.replace(/\.[^.]+$/, "")
		.toLowerCase()
		.replace(/\s+/g, "-")
	if (knownSlugs.has(stem)) return { name: stem, variant: "base" }
	const suffixes: { suffix: string; variant: SubmissionVariant }[] = SUBMISSION_VARIANTS.filter((variant) => variant !== "base").map(
		(variant) => ({
			suffix: variantKind(variant).suffix,
			variant,
		}),
	)
	suffixes.push({ suffix: "-white", variant: "light" }, { suffix: "-black", variant: "dark" }, { suffix: "-text", variant: "wordmark" })
	for (const name of customNames) suffixes.push({ suffix: `-${name}`, variant: `custom:${name}` })
	suffixes.sort((a, b) => b.suffix.length - a.suffix.length)
	const match = suffixes.find(({ suffix }) => stem.endsWith(suffix) && stem.length > suffix.length)
	if (match) return { name: stem.slice(0, -match.suffix.length), variant: match.variant }
	return { name: stem, variant: "base" }
}

export function addDraftFiles(
	drafts: SubmissionDraft[],
	files: File[],
	customNames: string[],
	knownSlugs: Set<string>,
	targetId?: string,
): SubmissionDraft[] {
	const next = drafts.map((draft) => ({ ...draft, assets: [...draft.assets] }))
	for (const file of files) {
		const assignment = filenameAssignment(file.name, customNames, knownSlugs)
		let target = next.find((draft) => draft.id === targetId)
		if (!target) target = next.find((draft) => draft.name === assignment.name)
		if (!target) target = next.find(isEmptyDraft)
		if (!target) {
			target = newSubmissionDraft(assignment.name)
			next.push(target)
		}
		if (!target.name) target.name = assignment.name
		target.assets.push({ id: crypto.randomUUID(), file, variant: assignment.variant })
	}
	return next
}

export function sameProductSuggestion(
	draft: SubmissionDraft,
	drafts: SubmissionDraft[],
	knownSlugs: Set<string>,
): { name: string; variant: `custom:${string}`; draftId?: string } | null {
	if (knownSlugs.has(draft.name)) return null
	const names = [...new Set([...knownSlugs, ...drafts.filter((item) => item.id !== draft.id).map((item) => item.name)])]
	const parent = names.filter((name) => name && draft.name.startsWith(`${name}-`)).sort((a, b) => b.length - a.length)[0]
	if (!parent) return null
	return {
		name: parent,
		variant: `custom:${draft.name.slice(parent.length + 1)}`,
		draftId: drafts.find((item) => item.name === parent)?.id,
	}
}

export function moveDraftAssets(
	drafts: SubmissionDraft[],
	sourceId: string,
	targetId: string,
	variant: `custom:${string}`,
): SubmissionDraft[] {
	const source = drafts.find((draft) => draft.id === sourceId)
	if (!source) return drafts
	return drafts
		.map((draft) => {
			if (draft.id === sourceId) return { ...draft, assets: [] }
			if (draft.id === targetId)
				return {
					...draft,
					assets: [
						...draft.assets,
						...source.assets.map((asset) => {
							if (asset.variant === "base") return { ...asset, variant }
							const suffix = variantKind(asset.variant).suffix
							return { ...asset, variant: `${variant}${suffix}` as const }
						}),
					],
					aliases: [draft.aliases, source.aliases].filter(Boolean).join(", "),
					categories: [...new Set([...draft.categories, ...source.categories])],
					description: [draft.description, source.description].filter(Boolean).join("\n\n"),
				}
			return draft
		})
		.filter((draft) => draft.id !== sourceId || Boolean(source.customVariantName))
}
