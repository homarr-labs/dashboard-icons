import { ClientResponseError } from "pocketbase"
import { createServerPB } from "@/lib/pb"

export type McpUser = { id: string; username: string; admin: boolean }
export type PocketBaseRefresh = { ok: true; token: string; user: McpUser } | { ok: false; reason: "invalid" | "unavailable" }

const REJECTED_STATUSES = new Set([400, 401, 403, 404])

export async function refreshPocketBaseSession(pbToken: string): Promise<PocketBaseRefresh> {
	const pb = createServerPB()
	pb.authStore.save(pbToken, null)
	try {
		const auth = await pb.collection("users").authRefresh({ requestKey: null })
		return {
			ok: true,
			token: auth.token,
			user: { id: auth.record.id, username: auth.record.username, admin: auth.record.admin === true },
		}
	} catch (error) {
		if (error instanceof ClientResponseError && REJECTED_STATUSES.has(error.status)) return { ok: false, reason: "invalid" }
		return { ok: false, reason: "unavailable" }
	}
}
