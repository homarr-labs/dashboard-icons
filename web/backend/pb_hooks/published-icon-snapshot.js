const HASH = /^[a-f0-9]{40}$/
const MAX_METADATA_BYTES = 4 * 1024 * 1024
const MAX_TREE_ENTRIES = 100000
const REPOSITORY = "https://api.github.com/repos/homarr-labs/dashboard-icons"

function unavailable() {
	throw new ApiError(503, "Published Icon sources could not be verified. Try again in a minute.")
}

function request(url, raw) {
	const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" }
	if (raw) headers.Accept = "application/vnd.github.raw+json"
	const token = $os.getenv("GITHUB_TOKEN")
	if (token) headers.Authorization = `Bearer ${token}`
	const response = $http.send({ url, headers, timeout: 10 })
	if (response.statusCode !== 200) unavailable()
	return response
}

function decode(commit, raw, blobs, metadataSha256) {
	if (!HASH.test(commit) || typeof raw !== "string" || !blobs || typeof blobs !== "object" || Array.isArray(blobs)) unavailable()
	if (Object.keys(blobs).length > MAX_TREE_ENTRIES || !Object.hasOwn(blobs, "metadata.json") || !HASH.test(blobs["metadata.json"]))
		unavailable()
	const bytes = encodeURIComponent(raw).replace(/%[0-9A-F]{2}|./g, "x").length
	if (bytes > MAX_METADATA_BYTES || (metadataSha256 && $security.sha256(raw) !== metadataSha256)) unavailable()
	const metadata = JSON.parse(raw)
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) unavailable()
	return { commit, metadata, blobs }
}

function load(app) {
	const local = $os.getenv("DASHBOARD_ICONS_SOURCE_SNAPSHOT_PATH")
	if (local) {
		if (!app.isDev()) throw new BadRequestError("Local source snapshots are only allowed in development")
		const snapshot = JSON.parse(toString($os.readFile(local)))
		if (!/^[a-f0-9]{64}$/.test(snapshot.metadataSha256)) unavailable()
		return decode(snapshot.commit, snapshot.metadata, snapshot.blobs, snapshot.metadataSha256)
	}
	const head = request(`${REPOSITORY}/git/ref/heads/main`).json.object?.sha
	if (!HASH.test(head)) unavailable()
	const cached = app.store().get("published_icon_source_snapshot")
	if (cached) {
		const snapshot = JSON.parse(toString(cached))
		if (snapshot.commit === head) return snapshot
	}
	const tree = request(`${REPOSITORY}/git/commits/${head}`).json.tree?.sha
	if (!HASH.test(tree)) unavailable()
	const result = request(`${REPOSITORY}/git/trees/${tree}?recursive=1`).json
	if (result.truncated || !Array.isArray(result.tree) || result.tree.length > MAX_TREE_ENTRIES) unavailable()
	const metadataEntry = result.tree.find((entry) => entry.path === "metadata.json" && entry.type === "blob")
	if (!metadataEntry || metadataEntry.size > MAX_METADATA_BYTES) unavailable()
	const blobs = {}
	for (const entry of result.tree) {
		if (entry.type !== "blob" || !HASH.test(entry.sha)) continue
		if (
			entry.path === "metadata.json" ||
			["svg", "png", "webp"].some((format) => entry.path.startsWith(`${format}/`) && entry.path.endsWith(`.${format}`))
		)
			blobs[entry.path] = entry.sha
	}
	const raw = toString(request(`${REPOSITORY}/git/blobs/${metadataEntry.sha}`, true).body)
	const snapshot = decode(head, raw, blobs)
	app.store().set("published_icon_source_snapshot", JSON.stringify(snapshot))
	return snapshot
}

function iconSource(snapshot, files) {
	const blobs = {}
	for (const stem of new Set(Object.values(files))) {
		for (const format of ["svg", "png", "webp"]) {
			const path = `${format}/${stem}.${format}`
			if (Object.hasOwn(snapshot.blobs, path)) blobs[path] = snapshot.blobs[path]
		}
	}
	if (!["svg", "png", "webp"].some((format) => Object.hasOwn(blobs, `${format}/${files.base}.${format}`)))
		throw new BadRequestError("The published Icon has no verifiable Base file")
	return { commit: snapshot.commit, blobs }
}

module.exports = { load, iconSource }
