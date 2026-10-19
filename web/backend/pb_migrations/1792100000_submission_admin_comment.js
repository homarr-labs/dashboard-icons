/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const submissions = app.findCollectionByNameOrId("submissions")
		if (submissions.fields.getByName("admin_comment")) return
		submissions.fields.add(new TextField({ name: "admin_comment", max: 10000 }))
		app.save(submissions)
	},
	() => {},
)
