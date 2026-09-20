migrate(
	(app) => {
		const admin = '@request.auth.id != "" && @request.auth.admin = true'
		const dates = [
			{ name: "created", type: "autodate", onCreate: true, onUpdate: false },
			{ name: "updated", type: "autodate", onCreate: true, onUpdate: true },
		]
		app.save(
			new Collection({
				name: "submission_events",
				type: "base",
				listRule: admin,
				viewRule: admin,
				fields: [
					{ name: "submission_id", type: "text", required: true },
					{ name: "submission_name", type: "text" },
					{ name: "actor_id", type: "text" },
					{ name: "actor_name", type: "text" },
					{ name: "actor_kind", type: "text" },
					{ name: "action", type: "text", required: true },
					{ name: "changes", type: "json" },
					{ name: "feedback", type: "text" },
					{ name: "operation_id", type: "text" },
					{ name: "batch_id", type: "text" },
					...dates,
				],
				indexes: [
					"CREATE INDEX idx_submission_events_time ON submission_events (created DESC, id DESC)",
					"CREATE INDEX idx_submission_events_submission ON submission_events (submission_id, created DESC)",
				],
			}),
		)
		app.save(
			new Collection({
				name: "publish_batches",
				type: "base",
				listRule: admin,
				viewRule: admin,
				fields: [
					{ name: "requester_id", type: "text" },
					{ name: "requester_name", type: "text" },
					{ name: "items", type: "json", required: true },
					{ name: "state", type: "text", required: true },
					{ name: "run_id", type: "text" },
					{ name: "run_url", type: "url" },
					{ name: "message", type: "text" },
					{ name: "commit_sha", type: "text" },
					{ name: "active", type: "bool" },
					...dates,
				],
				indexes: [
					"CREATE UNIQUE INDEX idx_publish_batches_active ON publish_batches (active) WHERE active = 1",
					"CREATE INDEX idx_publish_batches_created ON publish_batches (created DESC)",
				],
			}),
		)
		const submissions = app.findCollectionByNameOrId("submissions")
		if (!submissions.fields.getByName("description")) submissions.fields.add(new TextField({ name: "description", max: 10000 }))
		submissions.indexes = [
			...submissions.indexes,
			"CREATE INDEX idx_dashboard_submissions_updated ON submissions (updated DESC, id DESC)",
			"CREATE INDEX idx_dashboard_submissions_status ON submissions (status, updated DESC)",
		]
		app.save(submissions)
	},
	(app) => {
		app.delete(app.findCollectionByNameOrId("submission_events"))
		app.delete(app.findCollectionByNameOrId("publish_batches"))
		const submissions = app.findCollectionByNameOrId("submissions")
		submissions.indexes = submissions.indexes.filter((index) => !index.includes("idx_dashboard_submissions_"))
		app.save(submissions)
	},
)
