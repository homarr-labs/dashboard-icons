const policy = require("./variant-policy.js")

function canonical(value) {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
	if (value && typeof value === "object")
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(",")}}`
	return JSON.stringify(value)
}

function variantFiles(name, metadata, assets) {
	if (assets)
		return Object.fromEntries(
			require("./submission-assets.js")
				.resolveSubmissionAssets(metadata, assets, name)
				.assets.filter((asset) => asset.variant)
				.map((asset) => [asset.variant, asset.file]),
		)
	const files = {}
	for (const [key, stem] of policy.declaredVariantStems(name, metadata)) {
		let slot = key
		if (key === "wordmark-light" || key === "wordmark-dark") slot = key.replace("-", "_")
		if (key === "default") slot = "base"
		files[slot] = stem
	}
	return files
}

function revisionContent(target) {
	const content = {
		kind: target.kind,
		name: target.name,
		id: target.id,
		metadata: target.metadata,
		files: target.files,
		updated: target.updated,
		status: target.status,
	}
	if (target.kind === "published") content.blobs = target.source?.blobs || null
	if (target.unresolved) content.unresolved = target.unresolved
	return content
}

function destination(name, key, target) {
	if (
		target.kind === "published" &&
		target.files[key] &&
		Object.values(target.files).filter((file) => file === target.files[key]).length === 1
	)
		return target.files[key]
	if (key === "base") return name
	return `${name}-${key.replace("custom:", "").replace("wordmark_", "wordmark-")}`
}

function listDelta(before, after) {
	return {
		add: [...new Set(after)].filter((item) => !before.includes(item)),
		remove: [...new Set(before)].filter((item) => !after.includes(item)),
	}
}

function applyList(before, delta) {
	if (!delta) return before
	return [...before.filter((item) => !delta.remove.includes(item)), ...delta.add.filter((item) => !before.includes(item))]
}

function mergeMetadata(metadata, update) {
	const result = JSON.parse(JSON.stringify(metadata))
	for (const field of ["aliases", "categories"]) result[field] = applyList(result[field] || [], update[field])
	for (const change of update.variants) {
		const key = change.key
		if (change.action === "remove") {
			let group = "variants"
			let field = key.slice(7)
			if (key === "light" || key === "dark") {
				group = "colors"
				field = key
			} else if (key === "wordmark" || key.startsWith("wordmark_")) {
				group = "wordmark"
				field = key === "wordmark" ? "default" : key.slice(9)
			}
			if (result[group]) {
				delete result[group][field]
				if (!Object.keys(result[group]).length) delete result[group]
			}
			continue
		}
		if (key === "base") result.base = change.file.split(".").pop()
		else if (key === "light" || key === "dark") result.colors = { ...result.colors, [key]: change.destination }
		else if (key === "wordmark") result.wordmark = { ...result.wordmark, default: change.destination }
		else if (key.startsWith("wordmark_")) result.wordmark = { ...result.wordmark, [key.slice(9)]: change.destination }
		else if (key.startsWith("custom:")) result.variants = { ...result.variants, [key.slice(7)]: change.destination }
	}
	return result
}

function validateDelta(update, target, assets) {
	if (!update || update.version !== 1 || !Array.isArray(update.variants) || update.variants.length > 99) return "Invalid Update proposal"
	if (target.unresolved) return "The target has unassigned artwork. Ask its contributor to assign every file before proposing an update."
	if (target.kind === "published" && (!update.target?.source || !/^[a-f0-9]{40}$/.test(update.target.source.commit)))
		return "The published source snapshot is missing. Choose the Icon again before submitting a fresh proposal."
	if (update.target?.revision !== target.revision || canonical(revisionContent(update.target)) !== canonical(revisionContent(target)))
		return "Target Icon changed. Choose it again and review the latest content before submitting."
	const seen = new Set()
	const files = new Set()
	for (const change of update.variants) {
		if (!change || typeof change.key !== "string") return "Invalid Variant change"
		const key = change.key
		if (key === "base" && change.action !== "remove" && Object.values(target.files).filter((file) => file === target.files.base).length > 1)
			return "Base shares its file with another Variant. Replace that Variant separately first."
		if (!["base", "light", "dark", "wordmark", "wordmark_light", "wordmark_dark"].includes(key)) {
			if (!key.startsWith("custom:")) return "Unknown Variant"
			const error = policy.customVariantNameError(key.slice(7))
			if (error) return error
		}
		if (seen.has(key)) return "Each Variant can only change once"
		seen.add(key)
		if (change.action === "remove") {
			if (key === "base") return "Base cannot be removed"
			if (!Object.hasOwn(target.files, key) || !target.files[key]) return "Only an existing Variant can be removed"
			if (change.destination !== target.files[key]) return "Removal destination does not match the target"
			if (Object.hasOwn(change, "file")) return "A removal must not include an uploaded file"
			if (change.note !== undefined && (typeof change.note !== "string" || change.note.length > 10000))
				return "Removal notes must be at most 10000 characters"
			continue
		}
		let action = "add"
		if (target.files[key]) action = "replace"
		if (change.action !== action || change.destination !== destination(target.name, key, target))
			return "Variant action or destination does not match the target"
		if (Object.entries(target.files).some(([other, file]) => other !== key && file === change.destination))
			return "This destination is shared with another Variant. Ask a reviewer to separate the shared asset before replacing it."
		if (typeof change.file !== "string" || !/\.(svg|png)$/.test(change.file) || !assets.includes(change.file) || files.has(change.file))
			return "Each Variant change needs its own uploaded SVG or PNG"
		files.add(change.file)
	}
	if (assets.length !== files.size) return "Upload only the files changed by this proposal"
	let changes = update.variants.length
	for (const field of ["aliases", "categories"]) {
		const delta = update[field]
		if (!delta || !Array.isArray(delta.add) || !Array.isArray(delta.remove))
			return "Metadata changes must be explicit additions and removals"
		const before = target.metadata[field] || []
		for (const operation of ["add", "remove"]) {
			if (delta[operation].length > 100 || new Set(delta[operation]).size !== delta[operation].length)
				return "Too many or duplicate metadata changes"
			for (const value of delta[operation]) {
				if (typeof value !== "string" || !value.trim() || value.length > 100) return "Aliases and categories must be 1–100 characters"
				if ((operation === "add") === before.includes(value)) return "Metadata change does not match the target"
				if (delta.add.includes(value) && delta.remove.includes(value)) return "Conflicting metadata changes"
			}
			changes += delta[operation].length
		}
	}
	if (!changes) return "Make a change before sending an Update proposal"
	return undefined
}

const FIXUP_RENAME_ERROR = "Rename is not available for Update proposals. Their target identity is fixed."

function fixUpdate(update, assets, fixups) {
	const target = update.target
	const next = { ...update, variants: update.variants.map((change) => ({ ...change })) }
	const result = { update: next, assets: [...assets], variants: [], lists: [] }
	const operations = fixups.variants || []
	if (operations.length) {
		const resolved = require("./submission-assets.js").resolveSubmissionAssets(null, assets, target.name, update)
		if (resolved.assets.some((asset) => !asset.variant) || resolved.references.some((reference) => !reference.file))
			return { error: "Variant labels are ambiguous. Resolve the Submission's file labels before reviewing with Variant fix-ups." }
		const labels = new Map(resolved.assets.map((asset) => [asset.file, asset.variant]))
		const byFile = new Map()
		for (const operation of operations) {
			if (!labels.has(operation.file)) return { error: "Variant fix-ups must reference an existing Asset" }
			if (byFile.has(operation.file)) return { error: "Only one fix-up is allowed per Asset" }
			byFile.set(operation.file, operation)
			let to = null
			if (operation.action === "retag") to = operation.variant
			if (to !== labels.get(operation.file)) result.variants.push({ file: operation.file, from: labels.get(operation.file), to })
		}
		next.variants = []
		for (const change of update.variants) {
			const operation = byFile.get(change.file)
			if (!operation) next.variants.push({ ...change })
			else if (operation.action === "retag")
				next.variants.push({
					...change,
					key: operation.variant,
					action: target.files[operation.variant] ? "replace" : "add",
					destination: destination(target.name, operation.variant, target),
				})
		}
		if (new Set(next.variants.map((change) => change.key)).size !== next.variants.length)
			return { error: "That Variant slot is occupied. Choose another kind or drop its optional Asset first." }
		result.assets = assets.filter((file) => !byFile.has(file) || byFile.get(file).action !== "drop")
	}
	for (const field of ["aliases", "categories"]) {
		if (!Array.isArray(fixups[field])) continue
		const before = applyList(target.metadata[field] || [], update[field])
		const after = [...new Set(fixups[field].map((entry) => entry.trim()))]
		if (JSON.stringify(before) === JSON.stringify(after)) continue
		next[field] = listDelta(target.metadata[field] || [], after)
		result.lists.push({ field, before, after })
	}
	if (!result.variants.length && !result.lists.length) return result
	let changes = next.variants.length
	for (const field of ["aliases", "categories"]) changes += next[field].add.length + next[field].remove.length
	if (!changes) return { error: "An Update proposal needs at least one change. Reject it instead of removing every change." }
	const error = validateDelta(next, target, result.assets)
	if (error) return { error }
	return result
}

module.exports = {
	canonical,
	revisionContent,
	variantFiles,
	destination,
	listDelta,
	applyList,
	mergeMetadata,
	validateDelta,
	fixUpdate,
	FIXUP_RENAME_ERROR,
}
