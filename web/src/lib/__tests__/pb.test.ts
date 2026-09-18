import { afterEach, expect, it, vi } from "vitest"

afterEach(() => {
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
	vi.resetModules()
})

it("keeps SSR asset URLs public while server queries use the internal endpoint", async () => {
	vi.resetModules()
	vi.stubGlobal("window", undefined)
	vi.stubEnv("NEXT_PUBLIC_POCKETBASE_URL", "/pb")
	vi.stubEnv("PB_URL", "http://127.0.0.1:8090")
	const { pb, createServerPB, getPocketBaseUrl } = await import("@/lib/pb")

	expect(pb.baseURL).toBe("/pb")
	expect(getPocketBaseUrl()).toBe("/pb")
	expect(createServerPB().baseURL).toBe("http://127.0.0.1:8090")
})

it("preserves a separate public PocketBase hostname for SSR assets", async () => {
	vi.resetModules()
	vi.stubGlobal("window", undefined)
	vi.stubEnv("NEXT_PUBLIC_POCKETBASE_URL", "https://pb.example.test")
	vi.stubEnv("PB_URL", "http://127.0.0.1:8090")
	const { pb, createServerPB } = await import("@/lib/pb")

	expect(pb.baseURL).toBe("https://pb.example.test")
	expect(createServerPB().baseURL).toBe("http://127.0.0.1:8090")
})
