/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
	const collection = app.findCollectionByNameOrId("external_icons")
	const sourceField = collection.fields.find((field) => field.name === "source")
	sourceField.values = ["selfhst", "lobehub", "simpleicons"]

	collection.fields.add(new Field({ name: "brand_color", type: "text", pattern: "^[0-9A-Fa-f]{6}$" }))
	collection.fields.add(new Field({ name: "guidelines_url", type: "url" }))
	collection.fields.add(new Field({ name: "license_url", type: "url" }))
	collection.fields.add(new Field({ name: "stable_svg_url", type: "url" }))
	collection.fields.add(new Field({ name: "upstream_version", type: "text" }))
	collection.fields.add(new Field({ name: "upstream_data", type: "json" }))

	return app.save(collection)
}, (app) => {
	const collection = app.findCollectionByNameOrId("external_icons")
	const simpleIconRecords = app.findRecordsByFilter(collection, "source = 'simpleicons'", "", 0, 0)
	for (const record of simpleIconRecords) app.delete(record)

	const sourceField = collection.fields.find((field) => field.name === "source")
	sourceField.values = ["selfhst", "lobehub"]

	for (const name of ["brand_color", "guidelines_url", "license_url", "stable_svg_url", "upstream_version", "upstream_data"]) {
		const field = collection.fields.find((candidate) => candidate.name === name)
		if (field) collection.fields.removeById(field.id)
	}

	return app.save(collection)
})
