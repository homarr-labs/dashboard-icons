const { FIXUP_RENAME_ERROR, fixUpdate } = require("./icon-update-policy.js")
const { resolveSubmissionAssets } = require("./submission-assets.js")
const { customVariantNameError } = require("./variant-policy.js")

function allowKeys(value, keys, label) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestError(`${label} must be an object`)
	for (const key of Object.keys(value)) if (!keys.includes(key)) throw new BadRequestError(`Unsupported ${label} field: ${key}`)
}

function validateItem(item) {
	allowKeys(item, ["id", "updated", "fixups"], "review item")
	if (typeof item.id !== "string" || !item.id || typeof item.updated !== "string" || !item.updated)
		throw new BadRequestError("Each review item needs its id and updated token")
}

function variantLabel(variant) {
	if (variant.startsWith("custom:")) return `Custom ${variant.slice(7)}`
	return {
		base: "Base",
		light: "Light",
		dark: "Dark",
		wordmark: "Wordmark",
		wordmark_light: "Wordmark light",
		wordmark_dark: "Wordmark dark",
	}[variant]
}

function validateVariant(variant) {
	if (typeof variant !== "string") throw new BadRequestError("Choose a Variant kind")
	if (variant.startsWith("custom:")) {
		const error = customVariantNameError(variant.slice(7))
		if (error) throw new BadRequestError(error)
	} else if (!["base", "light", "dark", "wordmark", "wordmark_light", "wordmark_dark"].includes(variant))
		throw new BadRequestError(`Unknown Variant kind: ${variant}`)
}

function validateOperation(operation) {
	allowKeys(operation, ["action", "file", "variant"], "Variant fix-up")
	if (!["drop", "retag"].includes(operation.action)) throw new BadRequestError("Choose drop or retag for each Variant fix-up")
	if (typeof operation.file !== "string") throw new BadRequestError("Variant fix-ups must reference an existing Asset")
	if (operation.action === "drop") {
		if (Object.hasOwn(operation, "variant")) throw new BadRequestError("A drop cannot specify a Variant kind")
	} else validateVariant(operation.variant)
}

function listFixup(key, value) {
	if (
		!Array.isArray(value) ||
		value.length > 100 ||
		value.some((entry) => typeof entry !== "string" || !entry.trim() || entry.length > 200)
	)
		throw new BadRequestError(`${key} must contain at most 100 non-empty strings, each at most 200 characters`)
	return Array.from(new Set(value.map((entry) => entry.trim())))
}

function checkedOperations(operations) {
	if (!Array.isArray(operations) || operations.length > 99) throw new BadRequestError("Variant fix-ups must contain at most 99 changes")
	for (const operation of operations) validateOperation(operation)
	return operations
}

function applyProposal(record, update, fixups) {
	if (Object.hasOwn(fixups, "name")) throw new BadRequestError(FIXUP_RENAME_ERROR)
	const input = {}
	if (Object.hasOwn(fixups, "variants")) input.variants = checkedOperations(fixups.variants)
	for (const key of ["aliases", "categories"]) if (Object.hasOwn(fixups, key)) input[key] = listFixup(key, fixups[key])
	const files = Array.from(record.get("assets") || [])
	const result = fixUpdate(update, files, input)
	if (result.error) throw new BadRequestError(result.error)
	const messages = result.variants.map((change) => {
		if (!change.to) return `Dropped ${variantLabel(change.from)} (${change.file}).`
		return `Retagged ${variantLabel(change.from)} as ${variantLabel(change.to)} (${change.file}).`
	})
	for (const list of result.lists)
		messages.push(`Changed ${list.field} from ${JSON.stringify(list.before)} to ${JSON.stringify(list.after)}.`)
	if (messages.length) record.set("icon_update", result.update)
	if (result.assets.length !== files.length) record.set("assets", result.assets)
	return messages
}

function changeVariants(record, extras, operations) {
	checkedOperations(operations)
	if (!operations.length) return []
	const files = Array.from(record.get("assets") || [])
	const resolved = resolveSubmissionAssets(extras, files, record.getString("name"))
	if (resolved.assets.some((asset) => !asset.variant) || resolved.references.some((reference) => !reference.file))
		throw new BadRequestError("Variant labels are ambiguous. Resolve the Submission's file labels before reviewing with Variant fix-ups.")
	const labels = new Map(resolved.assets.map((asset) => [asset.file, asset.variant]))
	const changed = new Set()
	const messages = []
	for (const operation of operations) {
		if (!labels.has(operation.file)) throw new BadRequestError("Variant fix-ups must reference an existing Asset")
		if (changed.has(operation.file)) throw new BadRequestError("Only one fix-up is allowed per Asset")
		changed.add(operation.file)
		const before = labels.get(operation.file)
		if (operation.action === "drop") {
			if (before === "base") throw new BadRequestError("Base cannot be dropped")
			labels.delete(operation.file)
			messages.push(`Dropped ${variantLabel(before)} (${operation.file}).`)
		} else {
			labels.set(operation.file, operation.variant)
			if (before !== operation.variant)
				messages.push(`Retagged ${variantLabel(before)} as ${variantLabel(operation.variant)} (${operation.file}).`)
		}
	}
	if (!Array.from(labels.values()).includes("base")) throw new BadRequestError("Base is required")
	if (new Set(labels.values()).size !== labels.size) throw new BadRequestError("Two Assets cannot occupy the same Variant slot")
	if (!messages.length) return []
	for (const group of ["colors", "wordmark", "variants"]) delete extras[group]
	for (const [file, variant] of labels) {
		if (variant === "base") extras.base = file.split(".").pop().toLowerCase()
		else {
			let group = "colors"
			let key = variant
			if (variant.startsWith("custom:")) {
				group = "variants"
				key = variant.slice(7)
			} else if (variant.startsWith("wordmark")) {
				group = "wordmark"
				key = variant.replace("wordmark_", "")
				if (variant === "wordmark") key = "default"
			}
			if (!extras[group]) extras[group] = {}
			extras[group][key] = file
		}
	}
	record.set(
		"assets",
		files.filter((file) => labels.has(file)),
	)
	return messages
}

function apply(record, fixups) {
	if (fixups === undefined) return []
	allowKeys(fixups, ["name", "aliases", "categories", "variants"], "fix-up")
	if (!Object.keys(fixups).length) return []
	const messages = []
	const extras = JSON.parse(toString(record.get("extras")) || "null")
	if (!extras || typeof extras !== "object" || Array.isArray(extras))
		throw new BadRequestError("Submission metadata must be a non-null object before applying reviewer fix-ups")
	const update = JSON.parse(toString(record.get("icon_update")) || "null")
	if (update) return applyProposal(record, update, fixups)
	if (record.getString("target_submission"))
		throw new BadRequestError("This Update proposal predates explicit changes, so fix-ups are not available. Review it without fix-ups.")
	const previousExtras = JSON.stringify(extras)
	if (Object.hasOwn(fixups, "variants")) messages.push(...changeVariants(record, extras, fixups.variants))
	if (Object.hasOwn(fixups, "name")) {
		if (typeof fixups.name !== "string" || fixups.name.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fixups.name))
			throw new BadRequestError("Icon name must be lowercase letters and numbers separated by single hyphens, at most 80 characters")
		const before = record.getString("name")
		if (before !== fixups.name) {
			record.set("name", fixups.name)
			messages.unshift(`Renamed slug from "${before}" to "${fixups.name}".`)
		}
	}
	for (const key of ["aliases", "categories"]) {
		if (!Object.hasOwn(fixups, key)) continue
		const after = listFixup(key, fixups[key])
		const before = extras[key] || []
		if (JSON.stringify(before) !== JSON.stringify(after)) {
			extras[key] = after
			messages.push(`Changed ${key} from ${JSON.stringify(before)} to ${JSON.stringify(after)}.`)
		}
	}
	if (JSON.stringify(extras) !== previousExtras) record.set("extras", extras)
	return messages
}

module.exports = { validateItem, apply }
