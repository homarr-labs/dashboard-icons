import { ClientResponseError } from "pocketbase"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { authRefresh, save } = vi.hoisted(() => ({ authRefresh: vi.fn(), save: vi.fn() }))

vi.mock("@/lib/pb", () => ({
	createServerPB: () => ({ authStore: { save }, collection: () => ({ authRefresh }) }),
}))

import { refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

describe("refreshPocketBaseSession", () => {
	beforeEach(() => {
		authRefresh.mockReset()
		save.mockReset()
	})

	it("returns the refreshed token and user", async () => {
		authRefresh.mockResolvedValue({ token: "new-pb", record: { id: "u1", username: "alice", admin: true } })
		await expect(refreshPocketBaseSession("old-pb")).resolves.toEqual({
			ok: true,
			token: "new-pb",
			user: { id: "u1", username: "alice", admin: true },
		})
		expect(save).toHaveBeenCalledWith("old-pb", null)
	})

	it("treats a missing admin flag as false", async () => {
		authRefresh.mockResolvedValue({ token: "new-pb", record: { id: "u1", username: "alice" } })
		const result = await refreshPocketBaseSession("old-pb")
		expect(result.ok && result.user.admin).toBe(false)
	})

	it("reports rejected tokens as invalid", async () => {
		authRefresh.mockRejectedValue(new ClientResponseError({ status: 401 }))
		await expect(refreshPocketBaseSession("bad")).resolves.toEqual({ ok: false, reason: "invalid" })
	})

	it("reports outages as unavailable", async () => {
		authRefresh.mockRejectedValueOnce(new ClientResponseError({ status: 0 }))
		await expect(refreshPocketBaseSession("x")).resolves.toEqual({ ok: false, reason: "unavailable" })
		authRefresh.mockRejectedValueOnce(new Error("boom"))
		await expect(refreshPocketBaseSession("x")).resolves.toEqual({ ok: false, reason: "unavailable" })
	})
})
