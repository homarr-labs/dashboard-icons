import { ClientResponseError } from "pocketbase"
import { createServerPB } from "@/lib/pb"

export type ReplayConsumption = "consumed" | "replayed" | "unavailable"

async function replayRequest(body: { purpose: "probe" } | { purpose: "code" | "refresh"; id: string; expiry: number }): Promise<unknown> {
	const secret = process.env.MCP_OAUTH_REPLAY_SECRET
	if (!secret || Buffer.byteLength(secret) < 32) throw new Error("OAuth replay storage is not configured")
	return createServerPB().send<unknown>("/api/dashboard/mcp-oauth-replay", {
		method: "POST",
		headers: { "X-MCP-Replay-Key": secret },
		body,
		signal: AbortSignal.timeout(5000),
		requestKey: null,
	})
}

export async function isReplayStoreReady(): Promise<boolean> {
	try {
		const result = await replayRequest({ purpose: "probe" })
		return typeof result === "object" && result !== null && "ready" in result && result.ready === true
	} catch {
		return false
	}
}

export async function consumeGrant(purpose: "code" | "refresh", id: string, expiry: number): Promise<ReplayConsumption> {
	try {
		const result = await replayRequest({ purpose, id, expiry })
		if (typeof result === "object" && result !== null && "consumed" in result && result.consumed === true) return "consumed"
		return "unavailable"
	} catch (error) {
		if (error instanceof ClientResponseError && error.status === 409) return "replayed"
		return "unavailable"
	}
}
