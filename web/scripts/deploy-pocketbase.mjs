import { setTimeout } from "node:timers/promises"

const base = process.env.DOKPLOY_URL?.replace(/\/api\/?$/, "").replace(/\/$/, "")
const key = process.env.DOKPLOY_API_KEY
const applicationId = process.env.DOKPLOY_POCKETBASE_APPLICATION_ID
if (!base || !key || !applicationId) throw new Error("Dokploy URL, API key, and PocketBase application ID are required")

async function request(method, body) {
	const url = new URL(`${base}/api/${method}`)
	if (!body) url.searchParams.set("applicationId", applicationId)
	const response = await fetch(url, {
		method: body ? "POST" : "GET",
		headers: { "x-api-key": key, "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(30000),
	})
	if (!response.ok) throw new Error(`Dokploy ${method} failed: HTTP ${response.status}`)
	const content = await response.text()
	if (!content.trim()) {
		if (body) return null // Dokploy deployment mutations may acknowledge success without a body.
		throw new Error(`Dokploy ${method} returned an empty response`)
	}
	return JSON.parse(content)
}

const before = await request("application.one")
const replicas = before.modeSwarm?.Replicated?.Replicas ?? before.replicas
if (before.sourceType !== "docker" || replicas !== 1 || before.updateConfigSwarm?.Order !== "stop-first") {
	throw new Error("PocketBase must be a single-replica Docker application using stop-first updates")
}
if (!before.mounts?.some((mount) => mount.mountPath === "/pb/pb_data" && mount.type === "volume")) {
	throw new Error("PocketBase's persistent data volume is missing")
}
const packagedPaths = ["/pb/pocketbase", "/pb/pocketbase-release.json", "/pb/required-migration", "/pb/pb_hooks", "/pb/pb_migrations"]
if (before.mounts.some((mount) => mount.mountPath === "/pb" || packagedPaths.some((path) => mount.mountPath === path || mount.mountPath.startsWith(`${path}/`)))) {
	throw new Error("A PocketBase mount hides the image's binary, hooks, or migrations")
}
if (process.argv.includes("--inspect")) {
	console.log(JSON.stringify({ applicationId, image: before.dockerImage, status: before.applicationStatus, replicas, dataVolume: true }))
} else {
	const image = process.env.POCKETBASE_IMAGE || "ghcr.io/homarr-labs/dashboard-icons:latest"
	if (!/^ghcr\.io\/homarr-labs\/dashboard-icons(?::latest|@sha256:[a-f0-9]{64})$/.test(image)) {
		throw new Error("The Dashboard Icons latest tag or an explicit recovery image digest is required")
	}
	const env = (before.env || "").split("\n").filter((line) => !/^\s*SERVICE_MODE\s*=/.test(line)).concat("SERVICE_MODE=backend").join("\n")
	await request("application.update", { applicationId, dockerImage: image, command: "/usr/local/bin/start-dashboard", args: [], env })
	const previousIds = new Set((before.deployments || []).map((deployment) => deployment.deploymentId))
	await request("application.deploy", { applicationId, title: "Deploy PocketBase application and apply migrations" })
	let deployed = false
	let consecutiveFailures = 0
	for (let attempt = 0; attempt < 120; attempt++) {
		await setTimeout(5000)
		let application
		try {
			application = await request("application.one")
			consecutiveFailures = 0
		} catch {
			consecutiveFailures++
			if (consecutiveFailures >= 3) throw new Error("PocketBase deployment status could not be confirmed after 3 consecutive failures; inspect Dokploy")
			console.warn(`Dokploy status poll failed (${consecutiveFailures}/3); retrying`)
			continue
		}
		const deployment = (application.deployments || [])
			.filter((item) => !previousIds.has(item.deploymentId))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
		if (deployment?.status === "error") throw new Error("PocketBase deployment failed; inspect Dokploy's deployment log")
		if (deployment?.status === "done") {
			if (application.dockerImage !== image) throw new Error("PocketBase image changed during deployment")
			console.log(`PocketBase deployed successfully: ${image}`)
			deployed = true
			break
		}
	}
	if (!deployed) throw new Error("PocketBase deployment did not finish within 10 minutes")
}
