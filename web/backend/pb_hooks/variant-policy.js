const RESERVED_VARIANT_NAMES = ["base", "default", "light", "dark", "wordmark", "wordmark-light", "wordmark-dark"]

function customVariantNameError(name) {
	if (name.length > 32) return "Custom variant names must be at most 32 characters"
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return "Custom variant names must be lowercase letters and numbers separated by single hyphens"
	if (RESERVED_VARIANT_NAMES.includes(name)) return '"' + name + '" is reserved for a well-known Variant'
	return undefined
}

function declaredVariantStems(name, data) {
	const stems = [["default", name]]
	for (const tone of ["light", "dark"]) {
		const stem = (data.colors || {})[tone]
		if (typeof stem === "string" && stem) stems.push([tone, stem])
	}
	for (const tone of ["default", "light", "dark"]) {
		const stem = (data.wordmark || {})[tone]
		if (typeof stem === "string" && stem) {
			let key = "wordmark"
			if (tone !== "default") key += "-" + tone
			stems.push([key, stem])
		}
	}
	for (const [key, stem] of Object.entries(data.variants || {}))
		if (typeof stem === "string" && stem) stems.push(["custom:" + key, stem])
	return stems
}

function submissionVariantStems(name, extras) {
	return declaredVariantStems(name, extras || {}).map(([key]) => {
		if (key === "default") return [key, name]
		if (key.startsWith("custom:")) return [key, name + "-" + key.slice(7)]
		return [key, name + "-" + key]
	})
}

function addStemOwnership(index, owner, stems) {
	for (const [, stem] of stems) {
		if (!index.has(stem)) index.set(stem, new Set())
		index.get(stem).add(owner)
	}
	return index
}

function stemOwnership(metadata) {
	const index = new Map()
	for (const [owner, data] of Object.entries(metadata)) addStemOwnership(index, owner, declaredVariantStems(owner, data))
	return index
}

function stemCollisionError(owner, stems, index) {
	const destinations = new Map()
	for (const [key, stem] of stems) {
		if (destinations.has(stem) && destinations.get(stem) !== key)
			return "Variants " + destinations.get(stem) + " and " + key + " share destination " + stem + ". Choose distinct names."
		destinations.set(stem, key)
		for (const existing of index.get(stem) || [])
			if (existing !== owner) return "Variant " + key + " would overwrite the existing Icon " + existing + " at " + stem + ". Choose another name."
	}
	return undefined
}

module.exports = { RESERVED_VARIANT_NAMES, customVariantNameError, declaredVariantStems, submissionVariantStems, addStemOwnership, stemOwnership, stemCollisionError }
