import type { CommunityGallery, Submission } from "@/lib/pb"
import { customVariantNameError, SUBMISSION_VARIANTS, variantKind } from "@/lib/submission-variants"
import type { IconFile } from "@/types/icons"
import { addStemOwnership, stemCollisionError, stemOwnership, submissionVariantStems } from "../../../backend/pb_hooks/variant-policy.js"

type PendingIcon = Pick<CommunityGallery, "name" | "extras">

export function submissionConflict(
	name: string,
	extras: Submission["extras"],
	native: IconFile,
	pending: PendingIcon[],
): string | undefined {
	const suffixes = new Set([
		...SUBMISSION_VARIANTS.filter((variant) => variant !== "base").map((variant) => variantKind(variant).suffix.slice(1)),
		"white",
		"black",
		"text",
		"4k",
		"dv",
		"2d",
		"3d",
		"animated",
		"animated-light",
		"animated-dark",
	])
	const names = new Set([...Object.keys(native), ...pending.map((item) => item.name)])
	if (!names.has(name)) {
		for (let divider = name.indexOf("-"); divider !== -1; divider = name.indexOf("-", divider + 1)) {
			const parent = name.slice(0, divider)
			if (!names.has(parent)) continue
			const suffix = name.slice(divider + 1)
			const ownCustom =
				Object.hasOwn(native[parent]?.variants ?? {}, suffix) ||
				pending.some((item) => item.name === parent && Object.hasOwn(item.extras?.variants ?? {}, suffix))
			if (!suffixes.has(suffix) && (customVariantNameError(suffix) || !ownCustom)) continue
			return `"${name}" looks like the "${suffix}" Variant of "${parent}". Send that SVG as a Variant of "${parent}", not as a separate Submission. Use one call per Icon; never split Variants into separate slugs. For an existing Icon, open https://dashboardicons.com/submit and propose an update.`
		}
	}
	const index = stemOwnership(native)
	for (const item of pending) addStemOwnership(index, item.name, submissionVariantStems(item.name, item.extras))
	return stemCollisionError(name, submissionVariantStems(name, extras), index)
}
