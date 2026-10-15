export type McpCaller = {
	userId: string
	username: string
	admin: boolean
}

export function getMcpCaller(authInfo: unknown): McpCaller | null {
	if (!authInfo || typeof authInfo !== "object" || !("extra" in authInfo)) return null
	const extra = authInfo.extra
	if (!extra || typeof extra !== "object") return null
	const { userId, username, admin } = extra as Record<string, unknown>
	if (typeof userId !== "string" || userId.length === 0 || typeof username !== "string") return null
	return { userId, username, admin: admin === true }
}
