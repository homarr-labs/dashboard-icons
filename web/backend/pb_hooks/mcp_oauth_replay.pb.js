routerAdd("POST", "/api/dashboard/mcp-oauth-replay", (e) => {
	e.response.header().set("Cache-Control", "no-store")
	const secret = $os.getenv("MCP_OAUTH_REPLAY_SECRET")
	if (secret.length < 32) throw new ApiError(503, "OAuth replay storage is not configured.")
	const supplied = e.request.header.get("X-MCP-Replay-Key")
	if (!$security.equal($security.sha256(supplied), $security.sha256(secret))) throw new UnauthorizedError()
	const body = e.requestInfo().body
	if (body.purpose === "probe") {
		try {
			e.app.db().newQuery("UPDATE mcp_oauth_replay SET expires_at = expires_at WHERE 0").execute()
		} catch {
			throw new ApiError(503, "OAuth replay storage is unavailable.")
		}
		return e.json(200, { ready: true })
	}
	const now = Math.floor(Date.now() / 1000)
	if ((body.purpose !== "code" && body.purpose !== "refresh") ||
		typeof body.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.id) ||
		!Number.isSafeInteger(body.expiry) || body.expiry <= now || body.expiry > now + 2592060) {
		throw new BadRequestError("Invalid replay claim.")
	}
	try {
		const result = e.app.db().newQuery("INSERT INTO mcp_oauth_replay (purpose, id, expires_at) VALUES ({:purpose}, {:id}, {:expiry}) ON CONFLICT (purpose, id) DO NOTHING")
			.bind({ purpose: body.purpose, id: body.id, expiry: body.expiry }).execute()
		if (result.rowsAffected() !== 1) return e.json(409, { consumed: false })
	} catch {
		throw new ApiError(503, "OAuth replay storage is unavailable.")
	}
	return e.json(200, { consumed: true })
}, $apis.bodyLimit(1024))

cronAdd("mcp_oauth_replay_cleanup", "*/5 * * * *", () => {
	$app.db().newQuery("DELETE FROM mcp_oauth_replay WHERE expires_at < {:cutoff}")
		.bind({ cutoff: Math.floor(Date.now() / 1000) - 300 }).execute()
})
