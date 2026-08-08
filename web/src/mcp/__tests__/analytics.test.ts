import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { flush, instrument, PostHog } = vi.hoisted(() => {
	const flush = vi.fn(async () => {})
	return {
		flush,
		instrument: vi.fn(),
		PostHog: vi.fn(function PostHogMock() {
			return { flush }
		}),
	}
})

vi.mock("@posthog/mcp", () => ({
	instrument,
	PostHog,
}))

async function importAnalytics() {
	vi.resetModules()
	return import("@/mcp/analytics")
}

describe("MCP analytics", () => {
	beforeEach(() => {
		vi.unstubAllEnvs()
		PostHog.mockClear()
		instrument.mockClear()
		flush.mockReset().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("does nothing without a PostHog key", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "")
		const analytics = await importAnalytics()

		analytics.instrumentDashboardIconsMcpAnalytics({} as never)
		await analytics.flushDashboardIconsMcpAnalytics()

		expect(PostHog).not.toHaveBeenCalled()
		expect(instrument).not.toHaveBeenCalled()
		expect(flush).not.toHaveBeenCalled()
	})

	it("respects the PostHog disable flag", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		vi.stubEnv("NEXT_PUBLIC_DISABLE_POSTHOG", "true")
		const analytics = await importAnalytics()

		analytics.instrumentDashboardIconsMcpAnalytics({} as never)

		expect(PostHog).not.toHaveBeenCalled()
		expect(instrument).not.toHaveBeenCalled()
	})

	it("instruments and flushes MCP events", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		const analytics = await importAnalytics()
		// @modelcontextprotocol/server v2's McpServer exposes the low-level server as `.server`;
		// the SDK must instrument that low-level server, not the high-level McpServer.
		const server = { server: { setRequestHandler: vi.fn() } } as never

		analytics.instrumentDashboardIconsMcpAnalytics(server)
		await analytics.flushDashboardIconsMcpAnalytics()

		expect(PostHog).toHaveBeenCalledWith("phc_test", { host: "https://eu.i.posthog.com" })
		expect(instrument).toHaveBeenCalledWith({ setRequestHandler: expect.any(Function) }, expect.anything(), {
			context: false,
			enableExceptionAutocapture: false,
		})
		expect(flush).toHaveBeenCalled()
	})

	it("uses the EU host and ignores flush failures", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		flush.mockRejectedValueOnce(new Error("capture failed"))
		const analytics = await importAnalytics()

		await expect(analytics.flushDashboardIconsMcpAnalytics()).resolves.toBeUndefined()
		expect(PostHog).toHaveBeenCalledWith("phc_test", { host: "https://eu.i.posthog.com" })
	})
})
