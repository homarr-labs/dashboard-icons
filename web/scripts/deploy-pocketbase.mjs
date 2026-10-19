import { setTimeout } from "node:timers/promises"

const base = process.env.DOKPLOY_URL?.replace(/\/api\/?$/, "").replace(/\/$/, "")
const key = process.env.DOKPLOY_API_KEY
const frontend = process.argv.includes("--frontend")
const applicationId = frontend ? process.env.DOKPLOY_FRONTEND_APPLICATION_ID : process.env.DOKPLOY_POCKETBASE_APPLICATION_ID
if (!base || !key || !applicationId) throw new Error("Dokploy URL, API key, and application ID are required")

async function request(method, body, params = { applicationId }) {
	const url = new URL(`${base}/api/${method}`)
	if (!body) for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
	const response = await fetch(url, {
		method: body ? "POST" : "GET",
		headers: { "x-api-key": key, "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(30000),
	})
	if (!response.ok) throw new Error(`Dokploy ${method} failed: HTTP ${response.status}`)
	const content = await response.text()
	if (!content.trim()) {
		if (body) return null
		throw new Error(`Dokploy ${method} returned an empty response`)
	}
	return JSON.parse(content)
}

const before = await request("application.one")
const replicas = before.modeSwarm?.Replicated?.Replicas ?? before.replicas
if (before.sourceType !== "docker" || !Number.isInteger(replicas) || replicas < 1) throw new Error("A replicated Docker application is required")
if (frontend && replicas !== 3) throw new Error("Frontend must have exactly three replicas before rollout")
if (!frontend && (replicas !== 1 || before.updateConfigSwarm?.Order !== "stop-first")) {
	throw new Error("PocketBase must be a single-replica Docker application using stop-first updates")
}
if (!frontend && !before.mounts?.some((mount) => mount.mountPath === "/pb/pb_data" && mount.type === "volume")) {
	throw new Error("PocketBase's persistent data volume is missing")
}
const packagedPaths = ["/pb/pocketbase", "/pb/pocketbase-release.json", "/pb/required-migration", "/pb/pb_hooks", "/pb/pb_migrations"]
if (before.mounts.some((mount) =>
	mount.mountPath === "/" || mount.mountPath === "/pb" ||
	packagedPaths.some((path) => mount.mountPath === path || mount.mountPath.startsWith(`${path}/`)),
)) {
	throw new Error("A PocketBase mount hides the image's binary, hooks, or migrations")
}
const serverParams = before.serverId ? { serverId: before.serverId } : {}
async function inspect(id) {
	const config = await request("docker.getConfig", undefined, { containerId: id, ...serverParams })
	if (typeof config === "string") return JSON.parse(config)
	return config
}
async function tasks() {
	const listed = await request("docker.getServiceContainersByAppName", undefined, { appName: before.appName, ...serverParams })
	return Promise.all(listed.filter((task) => task.state !== "shutdown").map((task) => inspect(task.containerId)))
}
const currentTasks = await tasks()
const dataNode = currentTasks.find((task) => task.Status?.State === "running")?.NodeID
if (!frontend) {
	const running = currentTasks.filter((task) => task.Status?.State === "running")
	const constraints = before.placementSwarm?.Constraints || []
	if (running.length !== 1 || !constraints.some((constraint) => constraint.replace(/\s/g, "") === `node.id==${running[0].NodeID}`)) {
		throw new Error("Pin PocketBase to its current data node with a node.id placement constraint before rollout")
	}
}
if (process.argv.includes("--inspect")) {
	const service = await inspect(before.appName)
	console.log(JSON.stringify({
		applicationId,
		image: before.dockerImage,
		status: before.applicationStatus,
		replicas,
		update: service.UpdateStatus?.State,
		tasks: currentTasks.map((task) => ({ id: task.ID, state: task.Status?.State, image: task.Spec?.ContainerSpec?.Image })),
	}))
} else {
	const image = process.env.DEPLOY_IMAGE || process.env.POCKETBASE_IMAGE || ""
	const revision = process.env.EXPECTED_REVISION || ""
	if (!/^ghcr\.io\/homarr-labs\/dashboard-icons@sha256:[a-f0-9]{64}$/.test(image) || !/^[a-f0-9]{40}$/.test(revision)) {
		throw new Error("An immutable Dashboard Icons image digest and expected Git revision are required")
	}
	const mode = frontend ? "web" : "backend"
	const env = (before.env || "").split("\n")
		.filter((line) => !/^\s*SERVICE_MODE\s*=/.test(line))
		.concat(`SERVICE_MODE=${mode}`).join("\n")
	await request("application.update", { applicationId, dockerImage: image, command: "/usr/local/bin/start-dashboard", args: [], env })
	const previousIds = new Set((before.deployments || []).map((deployment) => deployment.deploymentId))
	await request("application.deploy", { applicationId, dockerImage: image, title: `Deploy ${mode} ${revision}` })
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
			if (consecutiveFailures >= 3) throw new Error("Deployment status could not be confirmed after 3 consecutive failures; inspect Dokploy")
			console.warn(`Dokploy status poll failed (${consecutiveFailures}/3); retrying`)
			continue
		}
		const deployment = (application.deployments || [])
			.filter((item) => !previousIds.has(item.deploymentId))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
		if (deployment?.status === "error") throw new Error(`${mode} deployment failed; inspect Dokploy's deployment log`)
		if (deployment?.status === "done") {
			if (application.dockerImage !== image) throw new Error("Application image changed during deployment")
			const service = await inspect(before.appName)
			const state = service.UpdateStatus?.State
			if (state && /pause|rollback/.test(state)) throw new Error(`${mode} rollout ${state}; inspect Swarm before retrying`)
			if (state !== "completed") continue
			if (service.Spec?.TaskTemplate?.ContainerSpec?.Image !== image) throw new Error("Swarm service image does not match the build digest")
			if (service.Spec?.Mode?.Replicated?.Replicas !== replicas) throw new Error("Swarm replica target changed during deployment")
			const active = await tasks()
			if (active.length !== replicas || active.some((task) =>
				task.DesiredState !== "running" || task.Status?.State !== "running" || task.Spec?.ContainerSpec?.Image !== image,
			)) continue
			if (!frontend && active[0].NodeID !== dataNode) throw new Error("PocketBase moved away from its original data node")
			console.log(`${mode} rollout completed: ${replicas} running tasks at ${image}, build revision ${revision}`)
			deployed = true
			break
		}
	}
	if (!deployed) throw new Error(`${mode} deployment did not converge to the expected image within 10 minutes`)
}
