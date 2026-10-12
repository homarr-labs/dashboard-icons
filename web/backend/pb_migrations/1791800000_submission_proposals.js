/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.indexes = submissions.indexes.filter((index) => !index.includes("idx_vB4iK1BfdV"))
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
		gallery.viewQuery = "SELECT s.id, s.name, s.target_submission, s.status, s.assets, s.updated, s.created, s.extras, u.username AS created_by FROM submissions s JOIN users u ON s.created_by = u.id"
		app.save(gallery)
	},
	(app) => {
		// Restoring uniqueness fails transactionally if proposals share a name.
		// Keep those records intact; operators must resolve duplicates before rollback.
		const gallery = app.findCollectionByNameOrId("community_gallery")
		gallery.viewQuery = "SELECT s.id, s.name, s.status, s.assets, s.updated, s.created, s.extras, u.username AS created_by FROM submissions s JOIN users u ON s.created_by = u.id"
		app.save(gallery)
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.fields.removeByName("target_submission")
		submissions.indexes = submissions.indexes.filter((index) => !index.includes("idx_submissions_name"))
		submissions.indexes.push("CREATE UNIQUE INDEX `idx_vB4iK1BfdV` ON `submissions` (`name`)")
		submissions.updateRule = "@request.auth.id = created_by.id || @request.auth.admin = true || status = 'rejected'"
		app.save(submissions)
	},
)
