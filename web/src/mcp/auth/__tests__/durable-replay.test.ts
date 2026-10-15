import { ClientResponseError } from "pocketbase"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("@/lib/pb", () => ({ createServerPB: () => ({ send }) }))

import { consumeGrant, isReplayStoreReady } from "@/mcp/auth/durable-replay"

describe("durable replay client", () => {
	beforeEach(() => {
		vi.stubEnv("MCP_OAUTH_REPLAY_SECRET", "test-replay-key-with-at-least-32-bytes")
		send.mockReset()
	})
	afterEach(() => vi.unstubAllEnvs())

	it("uses a separate server credential and sends only the replay claim", async () => {
		send.mockResolvedValue({ consumed: true })
		expect(await consumeGrant("code", "grant-id", 123)).toBe("consumed")
		expect(send).toHaveBeenCalledWith(
			"/api/dashboard/mcp-oauth-replay",
			expect.objectContaining({
				method: "POST",
				body: { purpose: "code", id: "grant-id", expiry: 123 },
				headers: { "X-MCP-Replay-Key": "test-replay-key-with-at-least-32-bytes" },
				requestKey: null,
			}),
		)
	})

	it("maps only a conflict to a replay", async () => {
		send.mockRejectedValueOnce(new ClientResponseError({ status: 409 }))
		expect(await consumeGrant("refresh", "id", 123)).toBe("replayed")
	})

	it.each([401, 403, 404, 500, 503, 0])("fails closed on upstream failure %i", async (status) => {
		send.mockRejectedValue(new ClientResponseError({ status }))
		expect(await consumeGrant("code", "id", 123)).toBe("unavailable")
		expect(await isReplayStoreReady()).toBe(false)
	})

	it.each([undefined, null, {}, { consumed: false }, "ok"])("fails closed on unexpected response %j", async (result) => {
		send.mockResolvedValue(result)
		expect(await consumeGrant("code", "id", 123)).toBe("unavailable")
		expect(await isReplayStoreReady()).toBe(false)
	})

	it.each(["", "short"])("requires a configured server secret", async (secret) => {
		vi.stubEnv("MCP_OAUTH_REPLAY_SECRET", secret)
		expect(await consumeGrant("code", "id", 123)).toBe("unavailable")
		expect(await isReplayStoreReady()).toBe(false)
		expect(send).not.toHaveBeenCalled()
	})

	it("authenticates readiness checks", async () => {
		send.mockResolvedValue({ ready: true })
		expect(await isReplayStoreReady()).toBe(true)
		expect(send).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: { purpose: "probe" } }))
	})

	it("fails closed for network errors", async () => {
		send.mockRejectedValue(new Error("network unavailable"))
		expect(await consumeGrant("code", "id", 123)).toBe("unavailable")
	})
})
