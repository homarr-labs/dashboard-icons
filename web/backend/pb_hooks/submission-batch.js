function resolveFiles(e) {
	for (const request of e.batch) {
		const match = /^\/api\/collections\/([^/?]+)\/records(?:\?|$)/.exec(request.url)
		if (request.method !== "POST" || !match) continue
		if (e.app.findCollectionByNameOrId(decodeURIComponent(match[1])).name !== "submissions") continue
		const body = request.body
		if (!body || !body.extras) continue
		const extras = JSON.parse(typeof body.extras === "string" ? body.extras : JSON.stringify(body.extras))
		if (!extras || typeof extras !== "object" || Array.isArray(extras)) continue
		const stored = new Map()
		for (const key of ["assets", "assets+", "+assets"])
			for (const file of body[key] || []) if (file.originalName && file.name) stored.set(file.originalName, file.name)
		for (const group of ["colors", "wordmark", "variants"]) {
			if (!extras[group] || typeof extras[group] !== "object" || Array.isArray(extras[group])) continue
			for (const [key, filename] of Object.entries(extras[group])) if (stored.has(filename)) extras[group][key] = stored.get(filename)
		}
		body.extras = extras
		request.body = body
	}
	e.next()
}

module.exports = { resolveFiles }
