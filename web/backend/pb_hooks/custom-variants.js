const policy = require("./variant-policy.js")
const nameError = policy.customVariantNameError

function metadata(app) {
	const local = $os.getenv("DASHBOARD_ICONS_METADATA_PATH")
	if (local) {
		if (!app.isDev()) throw new BadRequestError("Local metadata is only allowed in development")
		return JSON.parse(toString($os.readFile(local)))
	}
	const cached = app.store().get("custom_variant_metadata")
	if (cached) {
		const value = JSON.parse(toString(cached))
		if (Date.now() - value.loaded < 60000) return value.data
	}
	const response = $http.send({
		url: "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json",
		headers: { Accept: "application/json" },
		timeout: 10,
	})
	if (response.statusCode !== 200 || !response.json || Array.isArray(response.json))
		throw new BadRequestError("Published Icon names could not be checked. Try again in a minute.")
	app.store().set("custom_variant_metadata", JSON.stringify({ loaded: Date.now(), data: response.json }))
	return response.json
}

function customMap(extras) {
	if (!extras || extras.variants === undefined) return {}
	if (!extras.variants || typeof extras.variants !== "object" || Array.isArray(extras.variants))
		throw new BadRequestError("Custom variants must map each name to one uploaded file")
	return extras.variants
}

function validate(app, record, extras, published) {
	const variants = customMap(extras)
	const names = Object.keys(variants)
	for (const name of names) {
		const error = nameError(name)
		if (error) throw new BadRequestError(error)
		if (typeof variants[name] !== "string" || !variants[name]) throw new BadRequestError("Custom variant " + name + " needs one uploaded file")
	}
	const data = published || metadata(app)
	const index = policy.stemOwnership(data)
	const pending = app.findRecordsByFilter("submissions", "id != {:id} && (status = 'pending' || status = 'approved')", "", 0, 0, { id: record.id })
	for (const item of pending) {
		const owner = item.getString("name")
		const pendingExtras = JSON.parse(toString(item.get("extras")) || "null")
		const update = JSON.parse(toString(item.get("icon_update")) || "null")
		let stems = policy.submissionVariantStems(owner, pendingExtras)
		if (update) stems = update.variants.map((change) => [change.key, change.destination])
		policy.addStemOwnership(index, owner, stems)
	}
	const error = policy.stemCollisionError(record.getString("name"), policy.submissionVariantStems(record.getString("name"), extras), index)
	if (error) throw new BadRequestError(error)
}

function suggestions(e) {
	const names = new Set()
	for (const entry of Object.values(metadata(e.app)))
		for (const name of Object.keys(entry.variants || {})) if (!nameError(name)) names.add(name)
	const pending = e.app.findRecordsByFilter("submissions", "status = 'pending' || status = 'approved'", "", 0, 0)
	for (const record of pending) {
		const extras = JSON.parse(toString(record.get("extras")) || "{}")
		for (const name of Object.keys(customMap(extras))) if (!nameError(name)) names.add(name)
		const update = JSON.parse(toString(record.get("icon_update")) || "null")
		if (update) for (const change of update.variants) if (change.key.startsWith("custom:") && !nameError(change.key.slice(7))) names.add(change.key.slice(7))
	}
	return e.json(200, { names: Array.from(names).sort() })
}

module.exports = { nameError, metadata, customMap, validate, suggestions }
