/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const admin = '@request.auth.id != "" && @request.auth.admin = true'
		const dates = [
			{ name: "created", type: "autodate", onCreate: true, onUpdate: false },
			{ name: "updated", type: "autodate", onCreate: true, onUpdate: true },
		]
		app.save(
			new Collection({
				name: "takedowns",
				type: "base",
				// Only administrators may list or view takedowns. The public icon
				// page reads the removal ledger (takedowns.json) from the repository
				// instead, so requester contact details stay private.
				listRule: admin,
				viewRule: admin,
				// Records are created and updated by the API hooks / workflow callbacks only.
				createRule: null,
				updateRule: null,
				deleteRule: null,
				fields: [
					{ name: "icon", type: "text", required: true },
					{ name: "reason", type: "text" },
					{ name: "requester_name", type: "text" },
					{ name: "requester_email", type: "email" },
					{ name: "description", type: "text" },
					{ name: "status", type: "text", required: true },
					{ name: "requested_by", type: "text" },
					{ name: "requested_by_name", type: "text" },
					{ name: "run_id", type: "text" },
					{ name: "run_url", type: "url" },
					{ name: "commit_sha", type: "text" },
					{ name: "message", type: "text" },
					{ name: "active", type: "bool" },
					...dates,
				],
				indexes: [
					"CREATE UNIQUE INDEX idx_takedowns_icon_active ON takedowns (icon) WHERE status != 'cancelled' AND status != 'failed'",
					"CREATE INDEX idx_takedowns_created ON takedowns (created DESC, id DESC)",
				],
			}),
		)
	},
	(app) => {
		app.delete(app.findCollectionByNameOrId("takedowns"))
	},
)