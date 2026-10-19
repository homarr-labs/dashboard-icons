function normalizedStem(filename) {
	return filename
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-z0-9]/gi, "")
		.toLowerCase()
}

function matchingAssetNames(reference, assets) {
	if (!reference) return []
	if (assets.includes(reference)) return [reference]
	const extension = reference.split(".").pop().toLowerCase()
	const stem = normalizedStem(reference)
	return assets.filter((file) => {
		if (file.split(".").pop().toLowerCase() !== extension) return false
		if (normalizedStem(file) === stem) return true
		return normalizedStem(file.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, "$1")) === stem
	})
}

function resolveSubmissionAssets(extras, assets, name, iconUpdate) {
	const references = []
	if (iconUpdate) {
		for (const [index, change] of iconUpdate.variants.entries()) {
			if (typeof change.file !== "string") continue
			references.push({
				group: "icon_update",
				key: String(index),
				variant: change.key,
				reference: change.file,
				candidates: matchingAssetNames(change.file, assets),
			})
		}
	}
	if (!iconUpdate) {
		for (const [group, keys] of [
			["colors", ["light", "dark"]],
			["wordmark", ["default", "light", "dark"]],
			["variants", Object.keys(extras?.variants || {})],
		]) {
			for (const key of keys) {
				const reference = extras?.[group]?.[key]
				if (typeof reference !== "string" || !reference) continue
				let variant = key
				if (group === "wordmark") variant = key === "default" ? "wordmark" : `wordmark_${key}`
				if (group === "variants") variant = `custom:${key}`
				references.push({ group, key, variant, reference, candidates: matchingAssetNames(reference, assets) })
			}
		}
	}
	const tagged = new Map()
	for (const reference of references) {
		if (reference.candidates.length !== 1) continue
		const file = reference.candidates[0]
		if (references.some((other) => other !== reference && other.candidates.length === 1 && other.candidates[0] === file)) continue
		reference.file = file
		tagged.set(file, reference.variant)
	}
	const remaining = assets.filter((file) => !tagged.has(file))
	const eligibleBase = (file) => !references.some((reference) => !reference.file && reference.candidates.includes(file))
	let base
	if (!iconUpdate && name) {
		const candidates = remaining.filter((file) => matchingAssetNames(`${name}.${file.split(".").pop()}`, remaining).includes(file))
		if (candidates.length === 1 && eligibleBase(candidates[0])) base = candidates[0]
	}
	if (!iconUpdate && !base && remaining.length === 1 && references.every((reference) => reference.file)) base = remaining[0]
	if (base) tagged.set(base, "base")
	return { assets: assets.map((file) => ({ file, variant: tagged.get(file) || null })), references }
}

function snapshotVariantMetadata(extras, assets, copies, name, iconUpdate) {
	const normalized = JSON.parse(JSON.stringify(extras || {}))
	const resolved = resolveSubmissionAssets(extras, assets, name, iconUpdate)
	let update
	if (iconUpdate) update = JSON.parse(JSON.stringify(iconUpdate))
	const unresolved = []
	for (const reference of resolved.references) {
		if (reference.file) {
			if (update) update.variants[Number(reference.key)].file = copies[reference.file]
			else normalized[reference.group][reference.key] = copies[reference.file]
		} else {
			if (!update) delete normalized[reference.group][reference.key]
			unresolved.push({
				variant: reference.variant,
				reference: reference.reference,
				assets: reference.candidates.map((file) => copies[file]),
			})
		}
	}
	return {
		...(update ? { icon_update: update } : {}),
		extras: normalized,
		asset_sources: Object.fromEntries(assets.map((file) => [copies[file], file])),
		asset_variants: Object.fromEntries(
			resolved.assets.filter((asset) => asset.variant).map((asset) => [copies[asset.file], asset.variant]),
		),
		unresolved_variants: unresolved,
	}
}

module.exports = { matchingAssetNames, resolveSubmissionAssets, snapshotVariantMetadata }
