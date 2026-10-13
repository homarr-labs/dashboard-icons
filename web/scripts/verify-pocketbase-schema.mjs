const base = process.env.PB_URL?.replace(/\/$/, "")
if (!base) throw new Error("PB_URL is required")
let token = process.env.PB_ADMIN_TOKEN

async function collections() {
	return fetch(`${base}/api/collections?perPage=100`, { headers: { Authorization: token || "" }, signal: AbortSignal.timeout(30000) })
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
console.log(JSON.stringify({
	proposalsRelation: target?.type === "relation" && target.collectionId === submissions.id,
	uniqueName,
	galleryTarget,
	dashboardWorkspace: items.some((item) => item.name === "submission_events") && items.some((item) => item.name === "publish_batches"),
}))
if (process.argv.includes("--require-proposals") && (target?.type !== "relation" || target.collectionId !== submissions.id || uniqueName || !galleryTarget)) {
	throw new Error("PocketBase proposal migration has not been applied correctly")
}
