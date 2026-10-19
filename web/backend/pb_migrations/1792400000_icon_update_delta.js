migrate(
	(app) => {
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.fields.add(new JSONField({ name: "icon_update", maxSize: 131072 }))
		submissions.fields.getByName("assets").required = false
		app.save(submissions)
		const gallery = app.findCollectionByNameOrId("community_gallery")
		gallery.viewQuery = gallery.viewQuery.replace(/^(\s*SELECT\s+(?:DISTINCT\s+)?)/i, "$1s.icon_update, ")
		app.save(gallery)
	},
	(app) => {
		const gallery = app.findCollectionByNameOrId("community_gallery")
		gallery.viewQuery = gallery.viewQuery.replace(/\bs\.icon_update\s*,\s*/i, "")
		app.save(gallery)
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.fields.removeByName("icon_update")
		submissions.fields.getByName("assets").required = true
		app.save(submissions)
	},
)
