import type { CallToolResult } from "@modelcontextprotocol/server"
import { ClientResponseError } from "pocketbase"
import { WEB_URL } from "@/constants"
import { createServerPB } from "@/lib/pb"
import { type McpUser, refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

export const SIGN_IN_EXPIRED =
	"Your dashboardicons.com sign-in expired or was revoked. Reconnect this MCP server (sign in again from the MCP client), then retry."
const UNAVAILABLE = "dashboardicons.com could not be reached. Try again in a minute."

export const DASHBOARD_URL = `${WEB_URL}/dashboard`

type UserPocketBase = { ok: true; pb: ReturnType<typeof createServerPB>; user: McpUser } | { ok: false; result: CallToolResult }

export function toolError(text: string): CallToolResult {
	return { content: [{ type: "text", text }], isError: true }
}

export function submissionUrl(id: string): string {
	return `${WEB_URL}/community/submissions/${id}`
}

export async function pocketBaseAsUser(pbToken: string): Promise<UserPocketBase> {
	const session = await refreshPocketBaseSession(pbToken)
	if (!session.ok && session.reason === "invalid") return { ok: false, result: toolError(SIGN_IN_EXPIRED) }
	if (!session.ok) return { ok: false, result: toolError(UNAVAILABLE) }
	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	return { ok: true, pb, user: session.user }
}

export function pocketBaseFailure(error: unknown): CallToolResult {
	if (!(error instanceof ClientResponseError) || error.status === 0 || error.status >= 500) return toolError(UNAVAILABLE)
	if (error.status === 401 || error.status === 403) return toolError(SIGN_IN_EXPIRED)
	return toolError(`dashboardicons.com rejected the request: ${error.message}`)
}
