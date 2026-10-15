import { afterEach, describe, expect, it, vi } from "vitest"

const MOCK_TAKEDOWNS = {
	plex: {
		icon: "plex",
		reason: "DMCA takedown request",
		requester_name: "Plex Inc.",
		description: "Requested by the rights holder.",
		takedown_id: "tk-1",
		date: "2026-01-01T00:00:00Z",
	},
}

vi.mock("next/cache", () => ({
	unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

async function loadTakedowns() {
	return import("@/lib/takedowns")
}

describe("takedowns", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("returns the public takedown when the icon is in the ledger", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => MOCK_TAKEDOWNS })
		vi.stubGlobal("fetch", fetchMock)
		const { getPublicTakedown } = await loadTakedowns()
		const takedown = await getPublicTakedown("plex")
		expect(takedown?.icon).toBe("plex")
		expect(takedown?.reason).toBe("DMCA takedown request")
		expect(takedown?.requester_name).toBe("Plex Inc.")
		expect(takedown?.takedown_id).toBe("tk-1")
	})

	it("returns null when the icon was not taken down", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => MOCK_TAKEDOWNS })
		vi.stubGlobal("fetch", fetchMock)
		const { getPublicTakedown } = await loadTakedowns()
		expect(await getPublicTakedown("docker")).toBeNull()
	})

	it("fills defaults for missing optional fields", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ plex: { takedown_id: "tk-2", date: "2026-01-02T00:00:00Z" } }),
		})
		vi.stubGlobal("fetch", fetchMock)
		const { getPublicTakedown } = await loadTakedowns()
		const takedown = await getPublicTakedown("plex")
		expect(takedown?.reason).toBe("Takedown request")
		expect(takedown?.requester_name).toBe("")
		expect(takedown?.description).toBe("")
	})

	it("returns null when the ledger cannot be fetched", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }))
		const { getPublicTakedown } = await loadTakedowns()
		expect(await getPublicTakedown("plex")).toBeNull()
	})

	it("returns null when fetch throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
		const { getPublicTakedown } = await loadTakedowns()
		expect(await getPublicTakedown("plex")).toBeNull()
	})

	it("requests the ledger without cache and with a timeout", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => MOCK_TAKEDOWNS })
		vi.stubGlobal("fetch", fetchMock)
		const { getPublicTakedown } = await loadTakedowns()
		await getPublicTakedown("plex")
		const options = fetchMock.mock.calls[0]?.[1] as RequestInit
		expect(options.cache).toBe("no-store")
		expect(options.signal).toBeInstanceOf(AbortSignal)
	})
})
