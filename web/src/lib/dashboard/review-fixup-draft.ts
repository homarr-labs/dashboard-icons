import type { ReviewFixups, ReviewVariantFixup, SubmissionEvent } from "@/lib/dashboard/types"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import type { Submission } from "@/lib/pb"
import {
	customVariantNameError,
	labelledAssets,
	resolveSubmissionAssets,
	SUBMISSION_VARIANTS,
	type SubmissionVariant,
	variantExtras,
	variantKind,
} from "@/lib/submission-variants"

export function isReviewVariant(value: unknown): value is SubmissionVariant {
	if (typeof value !== "string") return false
	if (value.startsWith("custom:")) return !customVariantNameError(value.slice(7))
	return SUBMISSION_VARIANTS.some((variant) => variant === value)
}

export function isReviewFixups(value: unknown): value is ReviewFixups {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false
	if (Object.keys(value).some((key) => !["name", "aliases", "categories", "variants"].includes(key))) return false
	if ("name" in value && (typeof value.name !== "string" || value.name.length > MAX_NAME_LENGTH || !ICON_NAME_REGEX.test(value.name)))
		return false
	for (const key of ["aliases", "categories"] as const) {
		if (!(key in value)) continue
		const entries = (value as Record<string, unknown>)[key]
		if (
			!Array.isArray(entries) ||
			entries.length > 100 ||
			entries.some((entry) => typeof entry !== "string" || !entry.trim() || entry.length > 200)
		)
			return false
	}
	if (!("variants" in value)) return true
	return (
		Array.isArray(value.variants) &&
		value.variants.length <= 99 &&
		value.variants.every((operation: unknown) => {
			if (
				!operation ||
				typeof operation !== "object" ||
				!("file" in operation) ||
				typeof operation.file !== "string" ||
				!("action" in operation)
			)
				return false
			if (Object.keys(operation).some((key) => !["action", "file", "variant"].includes(key))) return false
			if (operation.action === "drop") return !("variant" in operation)
			return operation.action === "retag" && "variant" in operation && isReviewVariant(operation.variant)
		})
	)
}

export function reviewFixupsUnavailable(record: Submission, publishedNames: string[] = []) {
	if (record.target_submission || publishedNames.includes(record.name))
		return "Update proposal fix-ups are not available yet. Its target identity and explicit changes must be preserved."
	if (!record.extras || typeof record.extras !== "object" || Array.isArray(record.extras))
		return "This Submission's metadata needs repair before reviewer fix-ups can be applied. You can still review without fix-ups."
	return null
}

export function normalizeReviewFixups(record: Submission, fixups: ReviewFixups): ReviewFixups {
	const next = { ...fixups }
	if (next.name === record.name) delete next.name
	for (const key of ["aliases", "categories"] as const)
		if (next[key] && JSON.stringify(next[key]) === JSON.stringify(record.extras?.[key] || [])) delete next[key]
	const original = labelledAssets(record.extras, record.assets, record.name)
	if (next.variants) {
		next.variants = next.variants.filter(
			(change) => change.action === "drop" || original.find((asset) => asset.file === change.file)?.variant !== change.variant,
		)
		if (!next.variants.length) delete next.variants
	}
	return next
}

export function reviewFixupPreview(record: Submission, fixups: ReviewFixups = {}) {
	const assets = labelledAssets(record.extras, record.assets, record.name).map((asset) => {
		const operation = fixups.variants?.find((change) => change.file === asset.file)
		let variant = asset.variant
		if (operation?.action === "retag") variant = operation.variant
		return { ...asset, variant, originalVariant: asset.variant, dropped: operation?.action === "drop", changed: !!operation }
	})
	const extras = { ...record.extras }
	if (fixups.aliases) extras.aliases = fixups.aliases
	if (fixups.categories) extras.categories = fixups.categories
	if (fixups.variants?.length) {
		delete extras.colors
		delete extras.wordmark
		delete extras.variants
		Object.assign(
			extras,
			variantExtras(
				Object.fromEntries(assets.filter((asset) => !asset.dropped && asset.variant).map((asset) => [asset.variant, asset.file])),
			),
		)
	}
	const changes: { key: string; text: string }[] = []
	if (fixups.name) changes.push({ key: "name", text: `Slug: ${record.name} → ${fixups.name}` })
	for (const asset of assets) {
		if (!asset.changed) continue
		let before = "Unlabelled asset"
		if (asset.originalVariant) before = variantKind(asset.originalVariant).label
		let text = `Drop ${before}`
		if (!asset.dropped && asset.variant) text = `${before} → ${variantKind(asset.variant).label}`
		changes.push({ key: `variant:${asset.file}`, text: `${text} (${asset.file})` })
	}
	for (const key of ["aliases", "categories"] as const) {
		if (!fixups[key]) continue
		const label = key.charAt(0).toUpperCase() + key.slice(1)
		changes.push({ key, text: `${label}: ${(record.extras?.[key] || []).join(", ") || "None"} → ${fixups[key].join(", ") || "None"}` })
	}
	return {
		assets,
		changes,
		record: {
			...record,
			name: fixups.name || record.name,
			extras,
			assets: assets.filter((asset) => !asset.dropped).map((asset) => asset.file),
		},
	}
}

export function reviewFixupError(record: Submission, fixups: ReviewFixups) {
	const unavailable = reviewFixupsUnavailable(record)
	if (unavailable) return unavailable
	if (!isReviewFixups(fixups)) return "Use a lowercase kebab-case slug and up to 100 aliases or categories of at most 200 characters each."
	if (!fixups.variants?.length) return null
	const resolved = resolveSubmissionAssets(record.extras, record.assets, record.name)
	if (resolved.assets.some((asset) => !asset.variant) || resolved.references.some((reference) => !reference.file))
		return "Variant labels are ambiguous. Resolve the Submission's file labels before reviewing with Variant fix-ups."
	const preview = reviewFixupPreview(record, fixups)
	if (preview.assets.some((asset) => asset.originalVariant === "base" && asset.dropped)) return "Base is required and cannot be dropped."
	const remaining = preview.assets.filter((asset) => !asset.dropped)
	if (!remaining.some((asset) => asset.variant === "base")) return "Base is required. Keep its Variant kind."
	if (new Set(remaining.map((asset) => asset.variant)).size !== remaining.length)
		return "That Variant slot is occupied. Choose another kind or drop its optional Asset first."
	return null
}

export function changeReviewVariant(fixups: ReviewFixups, operation: ReviewVariantFixup): ReviewFixups {
	return { ...fixups, variants: [...(fixups.variants || []).filter((change) => change.file !== operation.file), operation] }
}

export function undoReviewFixup(fixups: ReviewFixups, key: string): ReviewFixups {
	const next = { ...fixups }
	if (key.startsWith("variant:")) next.variants = next.variants?.filter((change) => change.file !== key.slice(8))
	else if (key === "name" || key === "aliases" || key === "categories") delete next[key]
	return next
}

export function savedReviewFixups(changes: SubmissionEvent["changes"]) {
	const value = changes?.fixups?.after
	if (!Array.isArray(value)) return []
	return value.filter((entry): entry is string => typeof entry === "string")
}
