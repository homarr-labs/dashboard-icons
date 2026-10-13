/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const submissions = app.findCollectionByNameOrId("submissions")
		// Production collections may have been exported with a different generated index name.
		submissions.indexes = submissions.indexes.filter((index) => !(
			/\bCREATE\s+UNIQUE\s+INDEX\b/i.test(index) &&
			/\(\s*[`"]?name[`"]?(?:\s+(?:ASC|DESC))?\s*\)\s*(?:WHERE\b.*)?;?\s*$/i.test(index)
		))
		submissions.indexes.push("CREATE INDEX idx_submissions_name ON submissions (name, created DESC, id DESC)")
		submissions.fields.add(new RelationField({
			name: "target_submission",
			collectionId: submissions.id,
			maxSelect: 1,
			cascadeDelete: false,
		}))
		submissions.updateRule = "@request.auth.id = created_by.id || @request.auth.admin = true"
		app.save(submissions)
		const gallery = app.findCollectionByNameOrId("community_gallery")
		// Extend the existing view so manual additions (review feedback, descriptions,
		// reviewer names, GitHub IDs) keep their columns and file-field provenance.
		if (!/\bFROM\s+[`"]?submissions[`"]?(?:\s+AS)?\s+s\b/i.test(gallery.viewQuery) || !/^\s*SELECT\s+/i.test(gallery.viewQuery)) {
			throw new Error("community_gallery must select from submissions as s before adding proposal targets")
		}
		gallery.viewQuery = gallery.viewQuery.replace(/^(\s*SELECT\s+(?:DISTINCT\s+)?)/i, "$1s.target_submission, ")
		app.save(gallery)
	},
	(app) => {
		// Restoring uniqueness fails transactionally if proposals share a name.
		// Keep those records intact; operators must resolve duplicates before rollback.
		const gallery = app.findCollectionByNameOrId("community_gallery")
		gallery.viewQuery = gallery.viewQuery.replace(/\bs\.target_submission\s*,\s*/i, "")
		app.save(gallery)
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.fields.removeByName("target_submission")
		submissions.indexes = submissions.indexes.filter((index) => !index.includes("idx_submissions_name"))
		submissions.indexes.push("CREATE UNIQUE INDEX `idx_vB4iK1BfdV` ON `submissions` (`name`)")
		submissions.updateRule = "@request.auth.id = created_by.id || @request.auth.admin = true || status = 'rejected'"
		app.save(submissions)
	},
)
