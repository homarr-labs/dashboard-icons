onRecordAfterUpdateSuccess((e) => {
	e.next()
	if (e.record.getBool("__defer_bulk_email")) return
	require(`${__hooks}/submission-email.js`).notify(e)
}, "submissions")

routerAdd(
	"POST",
	"/api/submissions/bulk-rejection-email",
	(e) => {
		const logger = e.app.logger().withGroup("submission_update_email")
		const info = e.requestInfo()
		const auth = info.auth

		if (!auth || auth.get("admin") !== true) {
			return e.json(403, { error: "Forbidden" })
		}

		const batchId = info.headers["x_bulk_reject_id"]
		if (!batchId) {
			return e.json(400, { error: "Missing X-Bulk-Reject-Id" })
		}

		try {
			const sent = require(`${__hooks}/submission-email.js`).sendBulkRejectionEmails(e.app, batchId, logger)
			return e.json(200, { sent: sent })
		} catch (err) {
			logger.error("Failed to send bulk rejection emails", "error", err, "batch_id", batchId)
			return e.json(500, { error: "Failed to send bulk rejection emails" })
		}
	},
	$apis.requireAuth("users"),
)
