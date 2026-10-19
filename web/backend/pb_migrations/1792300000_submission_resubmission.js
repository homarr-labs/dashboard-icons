migrate(
	(app) => {
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.fields.add(new NumberField({ name: "round", min: 0, onlyInt: true }))
		submissions.fields.add(new JSONField({ name: "last_rejected", maxSize: 200000 }))
		submissions.fields.add(
			new FileField({ name: "reviewed_assets", maxSelect: 99, maxSize: 5242880, mimeTypes: ["image/svg+xml", "image/png"] }),
		)
		app.save(submissions)
		const gallery = app.findCollectionByNameOrId("community_gallery")
		for (const name of ["admin_comment", "round"]) {
			if (!gallery.fields.getByName(name))
				gallery.viewQuery = gallery.viewQuery.replace(/^(\s*SELECT\s+(?:DISTINCT\s+)?)/i, `$1s.${name}, `)
		}
		app.save(gallery)
	},
	(app) => {
		const gallery = app.findCollectionByNameOrId("community_gallery")
		gallery.viewQuery = gallery.viewQuery.replace(/\bs\.round\s*,\s*/i, "")
		app.save(gallery)
		const submissions = app.findCollectionByNameOrId("submissions")
		for (const name of ["round", "last_rejected", "reviewed_assets"]) submissions.fields.removeByName(name)
		app.save(submissions)
	},
)
