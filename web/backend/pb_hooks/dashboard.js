// Shared by request/model hooks and workflow callbacks. All queries bind user input.
function json(value) {
	return JSON.parse(JSON.stringify(value))
}
function field(record, key) {
	const value = record.get(key)
	if (key === "items" || key === "extras") {
		try {
			return JSON.parse(toString(value))
		} catch (_) {
			return null
		}
	}
	if (key === "assets")
		return Array.from(value || []).map((asset) => {
			if (typeof asset === "string") return asset
			return asset.name
		})
	return json(value)
}
function items(record) {
	return field(record, "items") || []
}
function actor(auth) {
	if (!auth || auth.collection().name === "_superusers") return { id: "", name: "Automation", kind: "automation" }
	return { id: auth.id, name: auth.getString("username") || "Contributor", kind: auth.getBool("admin") ? "admin" : "contributor" }
}
function context(record, auth, operation, batch) {
	record.set("__dashboard_actor", actor(auth))
	record.set("__dashboard_operation", operation || "")
	record.set("__dashboard_batch", batch || "")
}
function event(app, record, action, changes, who, operation, batch) {
	const entry = new Record(app.findCollectionByNameOrId("submission_events"))
	entry.load({
		submission_id: record.id,
		submission_name: record.getString("name"),
		actor_id: who.id,
		actor_name: who.name,
		actor_kind: who.kind,
		action,
		changes,
		feedback: record.getString("admin_comment"),
		operation_id: operation || "",
		batch_id: batch || "",
	})
	app.save(entry)
}
function audit(e, creating) {
	const old = e.record.original()
	e.record.set("__previous_status", old.getString("status"))
	const changes = {}
	for (const key of ["name", "status", "description", "assets", "extras", "admin_comment"]) {
		const before = field(old, key)
		const after = field(e.record, key)
		if (JSON.stringify(before) !== JSON.stringify(after)) changes[key] = { before, after }
	}
	// The upload flow resolves variant filenames in a second write. Do not log it as an edit.
	if (!creating && Object.keys(changes).length === 1 && changes.extras) {
		const a = changes.extras.before || {}
		const b = changes.extras.after || {}
		if (
			JSON.stringify(a.aliases) === JSON.stringify(b.aliases) &&
			JSON.stringify(a.categories) === JSON.stringify(b.categories) &&
			a.base === b.base
		) {
			const assets = e.record.getStringSlice("assets")
			let normalized = true
			for (const kind of ["colors", "wordmark"])
				for (const mode of ["light", "dark"]) {
					const from = (a[kind] || {})[mode]
					const to = (b[kind] || {})[mode]
					if (from !== to && (!from || !to || assets.indexOf(to) < 0)) normalized = false
				}
			if (normalized) delete changes.extras
		}
	}
	const hasChanges = creating || Object.keys(changes).length > 0
	let action = "edited"
	if (creating) action = "submitted"
	else if (changes.status) {
		const state = e.record.getString("status")
		if (state === "pending") action = "resubmitted"
		if (state === "approved") action = "approved"
		if (state === "rejected") action = "rejected"
		if (state === "added_to_collection") action = "published"
	}
	const who = e.record.get("__dashboard_actor") || actor(null)
	const originalApp = e.app
	originalApp.runInTransaction((tx) => {
		if (!creating) {
			const current = tx.findRecordById("submissions", e.record.id)
			if (current.getString("updated") !== old.getString("updated"))
				throw new BadRequestError("Submission changed. Refresh before editing.")
			const batch = reservation(tx, e.record.id)
			if (batch && e.record.getString("__dashboard_batch") !== batch.id)
				throw new BadRequestError("Submission is reserved by an active publish batch")
		}
		e.app = tx
		e.next()
		if (hasChanges)
			event(tx, e.record, action, changes, who, e.record.getString("__dashboard_operation"), e.record.getString("__dashboard_batch"))
	})
	e.app = originalApp
}
function requireAdmin(e) {
	if (!e.auth || (!e.hasSuperuserAuth() && !e.auth.getBool("admin"))) throw new ForbiddenError("Administrator access required")
}
function reservation(app, id) {
	const batches = app.findRecordsByFilter("publish_batches", "active = true", "", 1, 0)
	if (!batches.length) return null
	if (items(batches[0]).some((item) => item.id === id)) return batches[0]
	return null
}
function reserved(app, id) {
	return !!reservation(app, id)
}

function guard(e, creating) {
	if (!e.auth) throw new ForbiddenError("Sign in to submit icons")
	const old = e.record.original()
	const admin = e.hasSuperuserAuth() || e.auth.getBool("admin")
	if (!creating && reserved(e.app, e.record.id)) throw new BadRequestError("This submission is reserved by an active publish batch")
	if (!admin) {
		if (creating || old.getString("status") === "rejected") {
			if (e.record.getString("status") !== "pending" || e.record.getString("created_by") !== e.auth.id)
				throw new ForbiddenError("Resubmit as yourself with pending status")
			e.record.set("approved_by", "")
			e.record.set("admin_comment", "")
		} else {
			if (old.getString("created_by") !== e.auth.id || old.getString("status") !== "pending")
				throw new ForbiddenError("Only your pending submissions can be edited")
			for (const key of ["status", "created_by", "approved_by", "admin_comment"])
				if (e.record.getString(key) !== old.getString(key)) throw new ForbiddenError("Moderation fields are managed by administrators")
		}
	} else if (!e.hasSuperuserAuth()) {
		if (creating) {
			e.record.set("status", "pending")
			e.record.set("approved_by", "")
			e.record.set("admin_comment", "")
		} else
			for (const key of ["status", "approved_by", "admin_comment"]) {
				if (e.record.getString(key) !== old.getString(key))
					throw new BadRequestError("Use the dashboard review action to change moderation fields")
			}
	}
	context(e.record, e.auth, "", "")
	e.next()
}
function summary(e) {
	requireAdmin(e)
	const counts = {}
	for (const status of ["pending", "approved", "rejected", "added_to_collection"])
		counts[status] = e.app.countRecords("submissions", $dbx.hashExp({ status }))
	const pending = e.app.findRecordsByFilter("submissions", 'status = "pending"', "-updated,-id", 5, 0)
	const approved = e.app.findRecordsByFilter("submissions", 'status = "approved"', "-updated,-id", 5, 0)
	const oldest = e.app.findRecordsByFilter("submissions", 'status = "pending"', "created,id", 1, 0)
	const batches = e.app.findRecordsByFilter("publish_batches", "", "-created,-id", 5, 0)
	return e.json(200, { counts, pending, approved, oldest: oldest[0] || null, batches })
}
function review(e) {
	requireAdmin(e)
	const body = e.requestInfo().body
	if (!["approved", "rejected"].includes(body.status) || !Array.isArray(body.items) || !body.items.length || body.items.length > 100)
		throw new BadRequestError("Choose 1–100 submissions and a review action")
	const operation = $security.randomString(24)
	const results = []
	for (const item of body.items) {
		try {
			e.app.runInTransaction((tx) => {
				const record = tx.findRecordById("submissions", String(item.id))
				if (record.getString("status") !== "pending") throw new BadRequestError("Already reviewed. Refresh to see the current decision.")
				if (record.getString("updated") !== item.updated) throw new BadRequestError("Submission changed. Refresh before reviewing.")
				if (reserved(tx, record.id)) throw new BadRequestError("Submission is being published")
				context(record, e.auth, operation, "")
				if (body.status === "rejected" && body.items.length > 1) record.set("__defer_bulk_email", true)
				record.set("status", body.status)
				record.set("approved_by", e.auth.id)
				record.set("admin_comment", String(body.comment || "").slice(0, 10000))
				tx.save(record)
			})
			results.push({ id: item.id, success: true })
		} catch (err) {
			let current = null
			try {
				current = e.app.findRecordById("submissions", String(item.id))
			} catch (_) {}
			results.push({ id: item.id, success: false, error: String(err), current })
		}
	}
	let emailFailed = false
	if (body.status === "rejected" && body.items.length > 1 && $os.getenv("DASHBOARD_DISABLE_EMAIL") !== "1") {
		try {
			const mailer = require(__hooks + "/submission-email.js")
			for (const result of results.filter((item) => item.success)) {
				const record = e.app.findRecordById("submissions", result.id)
				record.set("__previous_status", "pending")
				record.set("__bulk_reject_id", operation)
				mailer.notify({ app: e.app, record })
			}
			mailer.sendBulkRejectionEmails(e.app, operation, e.app.logger())
		} catch (_) {
			emailFailed = true
		}
	}
	return e.json(200, { results, emailFailed })
}
function reserve(e) {
	requireAdmin(e)
	const input = e.requestInfo().body.items
	if (!Array.isArray(input) || !input.length || input.length > 100 || new Set(input.map((x) => x.id)).size !== input.length)
		throw new BadRequestError("Choose 1–100 distinct approved submissions")
	let batch
	e.app.runInTransaction((tx) => {
		if (tx.countRecords("publish_batches", $dbx.hashExp({ active: true })) > 0)
			throw new BadRequestError("A publish batch is already active. Open Publish to follow its progress.")
		const snapshots = input.map((item) => {
			const record = tx.findRecordById("submissions", String(item.id))
			if (record.getString("status") !== "approved" || record.getString("updated") !== item.updated)
				throw new BadRequestError("Submission changed or is no longer approved. Refresh before publishing.")
			return { id: record.id, name: record.getString("name"), updated: record.getString("updated"), state: "waiting" }
		})
		batch = new Record(tx.findCollectionByNameOrId("publish_batches"))
		batch.load({ requester_id: e.auth.id, requester_name: actor(e.auth).name, items: snapshots, state: "requesting", active: true })
		tx.save(batch)
		for (const item of snapshots)
			event(tx, tx.findRecordById("submissions", item.id), "publish_requested", {}, actor(e.auth), batch.id, batch.id)
	})
	return e.json(200, batch)
}
function updateBatch(app, batchId, data) {
	let batch
	app.runInTransaction((tx) => {
		batch = tx.findRecordById("publish_batches", batchId)
		const previous = batch.getString("state")
		if (previous === "succeeded") return
		if (data.run_id) batch.set("run_id", String(data.run_id))
		if (data.run_url) batch.set("run_url", data.run_url)
		if (data.commit_sha) batch.set("commit_sha", data.commit_sha)
		let state = data.state
		if (previous === "running" && state === "queued") state = "running"
		if (["failed", "cancelled"].includes(previous) && ["requesting", "queued", "running"].includes(state)) return
		if (!["requesting", "queued", "running", "succeeded", "failed", "cancelled", "unknown"].includes(state))
			throw new BadRequestError("Invalid publishing state")
		if (state === "succeeded") {
			if (!batch.getString("commit_sha")) throw new BadRequestError("Publication needs a pushed commit")
			const rows = items(batch)
			for (const item of rows) {
				const record = tx.findRecordById("submissions", item.id)
				if (record.getString("status") !== "added_to_collection") {
					if (record.getString("status") !== "approved" || record.getString("updated") !== item.updated)
						throw new BadRequestError("Published record changed; reconciliation requires administrator attention")
					context(record, null, batch.id, batch.id)
					record.set("status", "added_to_collection")
					tx.save(record)
				}
				item.state = "published"
			}
			batch.set("items", rows)
		}
		if (["failed", "cancelled"].includes(state))
			batch.set(
				"items",
				items(batch).map((item) => ({ ...item, state: "not_published" })),
			)
		batch.set("state", state)
		batch.set("message", String(data.message || ""))
		batch.set("active", ["requesting", "queued", "running", "unknown"].includes(state))
		tx.save(batch)
		if (previous !== state && ["succeeded", "failed", "cancelled", "unknown"].includes(state)) {
			for (const item of items(batch))
				event(tx, tx.findRecordById("submissions", item.id), "publish_" + state, {}, actor(null), batch.id, batch.id)
		}
	})
	return batch
}
module.exports = { audit, guard, requireAdmin, summary, review, reserve, updateBatch, reserved, context }
function github(path, method, body) {
	let base = "https://api.github.com"
	const mock = $os.getenv("DASHBOARD_MOCK_GITHUB_URL")
	if (mock && /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(mock)) base = mock
	const token = $os.getenv("GITHUB_TOKEN")
	if (!token && base === "https://api.github.com")
		throw new BadRequestError("Publishing is not configured: GITHUB_TOKEN is missing on PocketBase")
	return $http.send({
		url: base + "/repos/homarr-labs/dashboard-icons" + path,
		method: method || "GET",
		headers: {
			Authorization: "Bearer " + token,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
			"X-GitHub-Api-Version": "2026-03-10",
		},
		body: body && JSON.stringify(body),
		timeout: 15,
	})
}
function dispatch(e) {
	requireAdmin(e)
	// Check configuration before taking a reservation.
	if (!$os.getenv("GITHUB_TOKEN") && !$os.getenv("DASHBOARD_MOCK_GITHUB_URL"))
		throw new BadRequestError("Publishing is not configured: GITHUB_TOKEN is missing on PocketBase")
	// reserve() is also usable independently by the server integration.
	let captured
	const wrapped = {
		app: e.app,
		auth: e.auth,
		hasSuperuserAuth: () => e.hasSuperuserAuth(),
		requestInfo: () => e.requestInfo(),
		json: (_status, value) => {
			captured = value
		},
	}
	reserve(wrapped)
	const batch = captured
	try {
		const response = github("/actions/workflows/add-icon.yml/dispatches", "POST", {
			ref: "main",
			inputs: {
				submissionIds: items(batch)
					.map((x) => x.id)
					.join(","),
				dryRun: "false",
				batchId: batch.id,
			},
		})
		if (response.statusCode >= 400 && response.statusCode < 500)
			return e.json(
				200,
				updateBatch(e.app, batch.id, {
					state: "failed",
					message: "GitHub rejected the publish request (" + response.statusCode + "). Check workflow configuration and permissions.",
				}),
			)
		if (response.statusCode !== 200 || !response.json.workflow_run_id) throw new Error("No workflow run confirmation received")
		return e.json(
			200,
			updateBatch(e.app, batch.id, { state: "queued", run_id: response.json.workflow_run_id, run_url: response.json.html_url }),
		)
	} catch (_) {
		return e.json(
			200,
			updateBatch(e.app, batch.id, {
				state: "unknown",
				message: "GitHub did not confirm the request. Refresh to reconcile; do not dispatch it again.",
			}),
		)
	}
}
function reconcile(e) {
	requireAdmin(e)
	const batches = e.app.findRecordsByFilter("publish_batches", "active = true", "", 1, 0)
	for (let batch of batches) {
		try {
			let runId = batch.getString("run_id")
			if (!runId) {
				const found = github("/actions/workflows/add-icon.yml/runs?event=workflow_dispatch&per_page=100")
				if (found.statusCode !== 200) continue
				const run = (found.json.workflow_runs || []).find((r) => r.display_title === "Publish " + batch.id)
				if (!run) continue
				runId = String(run.id)
			}
			const response = github("/actions/runs/" + runId)
			if (response.statusCode !== 200) continue
			const run = response.json
			let state = "queued"
			if (run.status === "in_progress") state = "running"
			if (run.status === "completed") {
				state = "failed"
				if (run.conclusion === "cancelled") state = "cancelled"
				if (run.conclusion === "success") {
					// The workflow records the pushed commit before finalizing database updates.
					// Recover missing callbacks from the uniquely marked commit on main.
					if (!batch.getString("commit_sha")) {
						const commits = github("/commits?sha=main&per_page=100")
						if (commits.statusCode === 200) {
							const match = commits.json.find((c) => c.commit.message.includes("Dashboard-Publish-Batch: " + batch.id))
							if (match)
								batch = updateBatch(e.app, batch.id, { state: "running", commit_sha: match.sha, run_id: runId, run_url: run.html_url })
						}
					}
					state = "succeeded"
					if (!batch.getString("commit_sha")) state = "unknown"
				}
				// A successful push followed by a callback error needs reconciliation, not re-publication.
				if (batch.getString("commit_sha")) state = "succeeded"
			}
			updateBatch(e.app, batch.id, {
				state,
				run_id: runId,
				run_url: run.html_url,
				message:
					state === "unknown"
						? "Run finished, but the pushed commit could not be verified. Inspect the run before taking further action."
						: "",
			})
		} catch (_) {
			updateBatch(e.app, batch.id, {
				state: "unknown",
				message: "Publication could not be reconciled. The reservation is retained; inspect the GitHub run before retrying.",
			})
		}
	}
	return e.json(200, { ok: true })
}
module.exports.dispatch = dispatch
module.exports.reconcile = reconcile

module.exports.deleteRecord = (e) => {
	const app = e.app
	app.runInTransaction((tx) => {
		if (reserved(tx, e.record.id)) throw new BadRequestError("Submission is being published")
		e.app = tx
		e.next()
	})
	e.app = app
}
