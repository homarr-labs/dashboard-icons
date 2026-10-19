const policy = require("./icon-update-policy.js")
const variants = require("./custom-variants.js")

function read(record, key) {
	return JSON.parse(toString(record.get(key)) || "null")
}

function target(app, name, id, published) {
	let metadata
	let files
	let updated = ""
	let status = "published"
	let kind = "published"
	let source
	let unresolved
	if (id) {
		const record = app.findRecordById("submissions", id)
		if (record.getString("name") !== name || record.getString("status") !== "pending" || read(record, "icon_update"))
			throw new BadRequestError("Choose a pending new-Icon Submission as the target")
		const assets = Array.from(record.get("assets") || [])
		const originalMetadata = read(record, "extras") || {}
		const resolved = require("./submission-assets.js").snapshotVariantMetadata(
			originalMetadata,
			assets,
			Object.fromEntries(assets.map((file) => [file, file])),
			name,
		)
		metadata = { ...resolved.extras, aliases: originalMetadata.aliases || [], categories: originalMetadata.categories || [] }
		files = Object.fromEntries(Object.entries(resolved.asset_variants).map(([file, variant]) => [variant, file]))
		const unassigned = assets.filter((file) => !Object.hasOwn(resolved.asset_variants, file))
		if (unassigned.length || resolved.unresolved_variants.length || !files.base)
			unresolved = { assets: unassigned, references: resolved.unresolved_variants }
		if (!metadata.base && files.base) metadata.base = files.base.split(".").pop()
		updated = record.getString("updated")
		status = record.getString("status")
		kind = "submission"
		if (Object.hasOwn(published || variants.metadata(app), name))
			throw new BadRequestError("This Icon has been published. Select the published Icon instead.")
	} else {
		const snapshots = require("./published-icon-snapshot.js")
		const snapshot = snapshots.load(app)
		const data = snapshot.metadata
		if (!Object.hasOwn(data, name)) throw new BadRequestError("Published Icon not found")
		metadata = data[name]
		files = policy.variantFiles(name, metadata)
		source = snapshots.iconSource(snapshot, files)
	}
	if (!files.base && !unresolved) throw new BadRequestError("The target has no Base file")
	const content = { kind, name, id: id || "", metadata, files, updated, status }
	if (source) content.source = source
	if (unresolved) content.unresolved = unresolved
	return { ...content, revision: $security.sha256(policy.canonical(policy.revisionContent(content))) }
}

function load(e) {
	return e.json(200, target(e.app, e.request.url.query().get("name"), e.request.url.query().get("submission")))
}

function validate(app, record, old, creating, published) {
	const update = read(record, "icon_update")
	const previous = read(old, "icon_update")
	if (!update && !previous) return
	if (!update || !update.target) throw new BadRequestError("An Update proposal cannot be converted into a new Icon")
	if (!creating) {
		if (!previous || ["kind", "name", "id"].some((key) => update.target[key] !== previous.target[key]))
			throw new BadRequestError("An Update proposal's target identity cannot be changed")
		if (
			policy.canonical(update.target) !== policy.canonical(previous.target) &&
			record.getString("__icon_update_refresh") !== update.target.revision
		)
			throw new ApiError(409, "Explicitly review and choose the latest target before refreshing this proposal's revision")
	}
	if (record.getString("name") !== update.target.name || record.getString("target_submission") !== update.target.id)
		throw new BadRequestError("An Update proposal must keep its target identity")
	if (
		!creating &&
		record.getString("status") === "added_to_collection" &&
		record.getString("__dashboard_batch") &&
		policy.canonical(update) === policy.canonical(previous)
	)
		return
	const current = target(app, record.getString("name"), record.getString("target_submission"), published)
	if (update.target.revision !== current.revision)
		throw new ApiError(409, "Target Icon changed. Review and choose the latest target before saving.")
	if (creating && current.kind === "submission") {
		const owner = app.findRecordById("submissions", current.id).getString("created_by")
		if (owner === record.getString("created_by")) throw new BadRequestError("Edit your own pending Submission in place instead")
	}
	if (!Array.isArray(update.variants)) throw new BadRequestError("Variant changes must be a list")
	const stored = {}
	for (const file of record.getUnsavedFiles("assets")) stored[file.originalName] = file.name
	for (const change of update.variants) {
		if (!change || typeof change !== "object" || Array.isArray(change)) throw new BadRequestError("Invalid Variant change")
		if (change.action !== "remove" && Object.hasOwn(stored, change.file)) change.file = stored[change.file]
	}
	const assets = Array.from(record.get("assets") || []).map((file) => (typeof file === "string" ? file : file.name))
	const error = policy.validateDelta(update, current, assets)
	if (error) throw new BadRequestError(error)
	if (creating || record.getString("__icon_update_refresh")) update.target = current
	const index = require("./variant-policy.js").stemOwnership(published || variants.metadata(app))
	const pending = app.findRecordsByFilter("submissions", "id != {:id} && (status = 'pending' || status = 'approved')", "", 0, 0, {
		id: record.id,
	})
	const stemPolicy = require("./variant-policy.js")
	for (const item of pending) {
		const delta = read(item, "icon_update")
		let stems = stemPolicy.submissionVariantStems(item.getString("name"), read(item, "extras"))
		if (delta) stems = delta.variants.filter((change) => change.action !== "remove").map((change) => [change.key, change.destination])
		stemPolicy.addStemOwnership(index, item.getString("name"), stems)
	}
	const collision = stemPolicy.stemCollisionError(
		current.name,
		update.variants.filter((change) => change.action !== "remove").map((change) => [change.key, change.destination]),
		index,
	)
	if (collision) throw new BadRequestError(collision)
	record.set("icon_update", update)
	record.set("extras", { aliases: [], categories: [], base: current.metadata.base })
}

module.exports = { target, load, validate }
