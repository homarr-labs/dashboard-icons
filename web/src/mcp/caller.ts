export type McpCaller = {
	userId: string
	username: string
	admin: boolean
}

export type McpSession = {
	caller: McpCaller
	pbToken: string
}

function authExtra(authInfo: unknown): Record<string, unknown> | null {
	if (!authInfo || typeof authInfo !== "object" || !("extra" in authInfo)) return null
	const extra = authInfo.extra
	if (!extra || typeof extra !== "object") return null
	return extra as Record<string, unknown>
}

export function getMcpCaller(authInfo: unknown): McpCaller | null {
	const extra = authExtra(authInfo)
	if (!extra) return null
	const { userId, username, admin } = extra
	if (typeof userId !== "string" || userId.length === 0 || typeof username !== "string") return null
	return { userId, username, admin: admin === true }
}

export function getMcpSession(authInfo: unknown): McpSession | null {
	const caller = getMcpCaller(authInfo)
	const pbToken = authExtra(authInfo)?.pbToken
	if (!caller || typeof pbToken !== "string" || pbToken.length === 0) return null
	return { caller, pbToken }
}
