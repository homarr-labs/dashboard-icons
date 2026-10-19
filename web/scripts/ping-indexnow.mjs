import { readFile } from "node:fs/promises"
import { setTimeout } from "node:timers/promises"

const HOST = "dashboardicons.com"
const KEY = "a94baf3b0f4aa0b1fa1ac28b021a9e6b"
const ENDPOINT = "https://api.indexnow.org/indexnow"
const BATCH_SIZE = 10000
const DEPLOY_WORKFLOW = "docker.yml"
const DEPLOY_JOB = "build-and-push"
const LOGGED_URLS = 20
const ROLLOUT_ATTEMPTS = 36
const ROLLOUT_INTERVAL_MS = 5000

const repository = process.env.GITHUB_REPOSITORY || "homarr-labs/dashboard-icons"

async function github(path) {
	const headers = { Accept: "application/vnd.github+json" }
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { headers, signal: AbortSignal.timeout(30000) })
	if (!response.ok) throw new Error(`GitHub ${path} failed: HTTP ${response.status}`)
	return response.json()
}

async function findLastDeployedSha() {
	const { workflow_runs: runs } = await github(`actions/workflows/${DEPLOY_WORKFLOW}/runs?branch=main&status=success&per_page=30`)
	for (const run of runs) {
		const { jobs } = await github(`actions/runs/${run.id}/jobs`)
		if (jobs.some((job) => job.name === DEPLOY_JOB && job.conclusion === "success")) return run.head_sha
	}
	return null
}

async function readMetadataAt(sha) {
	const response = await fetch(`https://raw.githubusercontent.com/${repository}/${sha}/metadata.json`, {
		signal: AbortSignal.timeout(30000),
	})
	if (!response.ok) throw new Error(`metadata.json at ${sha} failed: HTTP ${response.status}`)
	return response.json()
}

function changedSlugs(before, after) {
	const slugs = new Set([...Object.keys(before), ...Object.keys(after)])
	return [...slugs].filter((slug) => JSON.stringify(before[slug]) !== JSON.stringify(after[slug])).sort()
}

async function isServed(url) {
	try {
		const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(10000) })
		return response.status === 200
	} catch {
		return false
	}
}

async function waitForRollout(urls) {
	for (let attempt = 0; attempt < ROLLOUT_ATTEMPTS; attempt++) {
		const served = await Promise.all(urls.map(isServed))
		if (served.every(Boolean)) return
		await setTimeout(ROLLOUT_INTERVAL_MS)
	}
	throw new Error(`The site did not serve ${urls.join(" and ")} within ${(ROLLOUT_ATTEMPTS * ROLLOUT_INTERVAL_MS) / 1000}s`)
}

async function submit(urlList) {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
		signal: AbortSignal.timeout(30000),
	})
	const body = (await response.text()).trim()
	console.log(`IndexNow responded HTTP ${response.status} for ${urlList.length} URLs`)
	if (body) console.log(body)
	if (!response.ok) throw new Error(`IndexNow ping failed: HTTP ${response.status}`)
}

const baseSha = await findLastDeployedSha()
if (!baseSha) {
	console.log("No previous successful deployment found; skipping IndexNow ping")
	process.exit(0)
}

console.log(`Comparing metadata.json between ${baseSha} and the checked-out commit`)
const [before, after] = await Promise.all([readMetadataAt(baseSha), readFile("../metadata.json", "utf8").then(JSON.parse)])
const slugs = changedSlugs(before, after)
const urls = slugs.map((slug) => `https://${HOST}/icons/${slug}`)
console.log(`${urls.length} icon page URLs changed`)
for (const url of urls.slice(0, LOGGED_URLS)) console.log(url)
if (urls.length > LOGGED_URLS) console.log(`...and ${urls.length - LOGGED_URLS} more`)
if (urls.length === 0) process.exit(0)

const rolloutUrls = [`https://${HOST}/${KEY}.txt`]
const addedSlug = slugs.find((slug) => !(slug in before))
if (addedSlug) rolloutUrls.push(`https://${HOST}/icons/${addedSlug}`)
await waitForRollout(rolloutUrls)

for (let start = 0; start < urls.length; start += BATCH_SIZE) {
	await submit(urls.slice(start, start + BATCH_SIZE))
}
