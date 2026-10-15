import { readdir } from "node:fs/promises"
import { setTimeout } from "node:timers/promises"

const base = process.env.PB_URL?.replace(/\/$/, "")
if (!base) throw new Error("PB_URL is required")
let token = process.env.PB_ADMIN_TOKEN

async function collections() {
	const params = new URLSearchParams({
		filter: "name='submissions'||name='community_gallery'||name='submission_events'||name='publish_batches'",
		perPage: "4",
	})
	return fetch(`${base}/api/collections?${params}`, { headers: { Authorization: token || "" }, signal: AbortSignal.timeout(30000) })
}
let response = await collections()
if (!response.ok && process.env.PB_ADMIN && process.env.PB_ADMIN_PASS) {
	const auth = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ identity: process.env.PB_ADMIN, password: process.env.PB_ADMIN_PASS }),
		signal: AbortSignal.timeout(30000),
	})
	if (!auth.ok) throw new Error(`PocketBase schema authentication failed: HTTP ${auth.status}`)
	token = (await auth.json()).token
	response = await collections()
}
if (!response.ok) throw new Error(`PocketBase schema inspection failed: HTTP ${response.status}`)
const { items } = await response.json()
const submissions = items.find((item) => item.name === "submissions")
const gallery = items.find((item) => item.name === "community_gallery")
if (!submissions || !gallery) throw new Error("PocketBase submission collections are missing")
const target = submissions.fields.find((field) => field.name === "target_submission")
const uniqueName = submissions.indexes.some((index) => /CREATE\s+UNIQUE\s+INDEX.*\(\s*[`"]?name[`"]?\s*\)/i.test(index))
const galleryTarget = gallery.fields.some((field) => field.name === "target_submission")
const historyResponse = await fetch(`${base}/api/sql`, {
	method: "POST",
	headers: { Authorization: token, "Content-Type": "application/json" },
	body: JSON.stringify({ query: "SELECT file, applied FROM _migrations ORDER BY file" }),
	signal: AbortSignal.timeout(30000),
})
if (!historyResponse.ok) throw new Error(`PocketBase migration history inspection failed: HTTP ${historyResponse.status}`)
const history = (await historyResponse.json()).rows
const appliedMigrations = new Set(history.map(([file]) => file))
const packagedMigrations = (await readdir(new URL("../backend/pb_migrations/", import.meta.url))).filter((file) => file.endsWith(".js")).sort()
if (!packagedMigrations.length) throw new Error("No packaged PocketBase migrations found")
const missingMigrations = packagedMigrations.filter((file) => !appliedMigrations.has(file))
const proposalsApplied = appliedMigrations.has("1791800000_submission_proposals.js")
console.log(JSON.stringify({
	proposalsRelation: target?.type === "relation" && target.collectionId === submissions.id,
	uniqueName,
	galleryTarget,
	dashboardWorkspace: items.some((item) => item.name === "submission_events") && items.some((item) => item.name === "publish_batches"),
	submissionIndexes: submissions.indexes,
	galleryQuery: gallery.viewQuery,
	migrationHistory: history,
	latestPackagedMigration: packagedMigrations.at(-1),
	missingMigrations,
}))
if (process.argv.includes("--require-proposals") && (!proposalsApplied || target?.type !== "relation" || target.collectionId !== submissions.id || uniqueName || !galleryTarget)) {
	throw new Error("PocketBase proposal migration has not been applied correctly")
}
if (process.argv.includes("--require-current") && missingMigrations.length) {
	throw new Error(`PocketBase has unapplied migrations: ${missingMigrations.join(", ")}`)
}

if (process.argv.includes("--backup")) {
	const name = `before_deploy_${new Date().toISOString().replace(/\D/g, "")}.zip`
	const backup = await fetch(`${base}/api/backups`, {
		method: "POST",
		headers: { Authorization: token, "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
		signal: AbortSignal.timeout(120000),
	})
	if (!backup.ok) throw new Error(`PocketBase backup creation failed: HTTP ${backup.status}`)
	let completed = false
	for (let attempt = 0; attempt < 60; attempt++) {
		const listed = await fetch(`${base}/api/backups`, { headers: { Authorization: token }, signal: AbortSignal.timeout(30000) })
		if (!listed.ok) throw new Error(`PocketBase backup verification failed: HTTP ${listed.status}`)
		const archive = (await listed.json()).find((item) => item.key === name)
		if (archive?.size > 0) {
			console.log(`Verified pre-deployment PocketBase backup: ${name}`)
			completed = true
			break
		}
		await setTimeout(2000)
	}
	if (!completed) throw new Error("PocketBase backup did not complete within 2 minutes")
}
