import type { MCPAnalyticsOptions } from "@posthog/mcp"
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

type McpCaptureEvent = { event: string; distinct_id: string; properties: Record<string, unknown>; timestamp: string; type: "capture" }
type ToolExtra = Parameters<NonNullable<MCPAnalyticsOptions["eventProperties"]>>[1]

const server = { registerTool: vi.fn() } as never

async function importAnalytics() {
	vi.resetModules()
	return import("@/mcp/analytics")
}

async function instrumentedOptions(): Promise<MCPAnalyticsOptions> {
	const analytics = await importAnalytics()
	analytics.instrumentDashboardIconsMcpAnalytics(server)
	return instrument.mock.calls[0]?.[2] as MCPAnalyticsOptions
}

function captureEvent(event: string, properties: Record<string, unknown> = {}, distinctId = "ses_1"): McpCaptureEvent {
	return { event, distinct_id: distinctId, properties, timestamp: "2026-10-15T00:00:00.000Z", type: "capture" }
}

function sampledDistinctId(sampledIn: boolean, isSampledIn: (identity: string, rate: number) => boolean): string {
	for (let index = 0; index < 1000; index++) {
		if (isSampledIn(`ses_${index}`, 0.1) === sampledIn) return `ses_${index}`
	}
	throw new Error("no matching distinct id")
}

describe("MCP analytics", () => {
	beforeEach(() => {
		vi.unstubAllEnvs()
		vi.stubEnv("MCP_ANALYTICS_DEBUG", "")
		vi.stubEnv("MCP_SERVER_BUILD", "")
		PostHog.mockClear()
		instrument.mockClear()
		flush.mockReset().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it("does nothing without a PostHog key", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "")
		const analytics = await importAnalytics()

		analytics.instrumentDashboardIconsMcpAnalytics(server)
		await analytics.flushDashboardIconsMcpAnalytics()

		expect(PostHog).not.toHaveBeenCalled()
		expect(instrument).not.toHaveBeenCalled()
		expect(flush).not.toHaveBeenCalled()
	})

	it("respects the PostHog disable flag", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		vi.stubEnv("NEXT_PUBLIC_DISABLE_POSTHOG", "true")
		const analytics = await importAnalytics()

		analytics.instrumentDashboardIconsMcpAnalytics(server)

		expect(PostHog).not.toHaveBeenCalled()
		expect(instrument).not.toHaveBeenCalled()
	})

	it("instruments the high-level server with geoip on and flushes", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		vi.stubEnv("MCP_SERVER_BUILD", "abc123")
		const analytics = await importAnalytics()

		analytics.instrumentDashboardIconsMcpAnalytics(server)
		await analytics.flushDashboardIconsMcpAnalytics()

		expect(PostHog).toHaveBeenCalledWith("phc_test", { host: "https://eu.i.posthog.com", disableGeoip: false, disabled: false })
		expect(instrument).toHaveBeenCalledWith(server, expect.anything(), {
			context: true,
			captureModel: true,
			enableConversationId: true,
			reportMissing: true,
			enableExceptionAutocapture: false,
			serverBuild: "abc123",
			identify: expect.any(Function),
			eventProperties: expect.any(Function),
			beforeSend: expect.any(Function),
		})
		expect(flush).toHaveBeenCalled()
	})

	it("omits the server build when it is not configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		const options = await instrumentedOptions()
		expect(options.serverBuild).toBeUndefined()
	})

	it("ignores flush failures", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		flush.mockRejectedValueOnce(new Error("capture failed"))
		const analytics = await importAnalytics()

		await expect(analytics.flushDashboardIconsMcpAnalytics()).resolves.toBeUndefined()
	})

	it("logs events locally in debug mode without a PostHog key", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "")
		vi.stubEnv("MCP_ANALYTICS_DEBUG", "true")
		const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
		const options = await instrumentedOptions()

		expect(PostHog).toHaveBeenCalledWith("phc_mcp_analytics_debug", {
			host: "https://eu.i.posthog.com",
			disableGeoip: false,
			disabled: true,
		})
		const toolCall = captureEvent("$mcp_tool_call", { $session_id: "ses_1" })
		expect(await options.beforeSend?.(toolCall)).toBe(toolCall)
		expect(await options.beforeSend?.(captureEvent("$mcp_tools_list"))).toBeNull()
		expect(write).toHaveBeenCalledTimes(1)
		expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toEqual(toolCall)
	})

	it("does not log events outside debug mode", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
		const options = await instrumentedOptions()

		await options.beforeSend?.(captureEvent("$mcp_tool_call"))
		expect(write).not.toHaveBeenCalled()
	})

	it("identifies callers from the auth info contract", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		const options = await instrumentedOptions()
		const identify = options.identify as Extract<MCPAnalyticsOptions["identify"], (...args: never[]) => unknown>
		const authInfo = { token: "t", clientId: "c", scopes: [], extra: { userId: "user_1", username: "fan", admin: true } }

		await expect(identify({}, { http: { authInfo } })).resolves.toEqual({
			distinctId: "user_1",
			properties: { username: "fan", admin: true },
		})
		await expect(identify({}, {})).resolves.toBeNull()
		await expect(identify({})).resolves.toBeNull()
	})

	it("stamps the client IP from the forwarded headers", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		const options = await instrumentedOptions()
		const eventProperties = options.eventProperties as NonNullable<MCPAnalyticsOptions["eventProperties"]>
		const extraFor = (headers: HeadersInit): ToolExtra => ({ http: { req: { headers: new Headers(headers) } } })

		expect(eventProperties({}, extraFor({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toEqual({ $ip: "198.51.100.4" })
		expect(eventProperties({}, extraFor({}))).toBeNull()
		expect(eventProperties({}, { http: { req: { headers: { "x-real-ip": "198.51.100.4" } } } })).toBeNull()
		expect(eventProperties({})).toBeNull()
	})

	it("keeps the event-volume filters", async () => {
		const { isSampledIn, mcpBeforeSend, MCP_FALLBACK_TEST_CLIENT_NAME } = await importAnalytics()
		const sampledIn = sampledDistinctId(true, isSampledIn)
		const sampledOut = sampledDistinctId(false, isSampledIn)

		expect(mcpBeforeSend(captureEvent("$mcp_tools_list"))).toBeNull()
		expect(mcpBeforeSend(captureEvent("$mcp_initialize", { $mcp_client_name: MCP_FALLBACK_TEST_CLIENT_NAME }, sampledIn))).toBeNull()
		expect(mcpBeforeSend(captureEvent("$mcp_initialize", {}, sampledOut))).toBeNull()
		expect(mcpBeforeSend(captureEvent("$mcp_initialize", {}, sampledIn))).not.toBeNull()
		expect(mcpBeforeSend(captureEvent("$mcp_tool_call"))).not.toBeNull()
	})

	it("never sends the SDK request context that carries the PocketBase token", async () => {
		const { mcpBeforeSend } = await importAnalytics()
		const request = { method: "tools/call", params: { name: "submit_icon" } }
		const identify = captureEvent("$identify", {
			$mcp_parameters: { request, extra: { http: { authInfo: { extra: { pbToken: "pb-secret" } } } } },
		})
		expect(mcpBeforeSend(identify)?.properties.$mcp_parameters).toEqual({ request })
		expect(mcpBeforeSend(captureEvent("$mcp_tool_call", { $mcp_parameters: { request } }))?.properties.$mcp_parameters).toEqual({ request })
		expect(mcpBeforeSend(captureEvent("$mcp_tool_call", { $mcp_parameters: "[truncated]" }))?.properties.$mcp_parameters).toBe(
			"[truncated]",
		)
	})

	it("samples deterministically and honours the rate bounds", async () => {
		const { isSampledIn } = await importAnalytics()

		expect(isSampledIn("anything", 1)).toBe(true)
		expect(isSampledIn("anything", 0)).toBe(false)
		expect(isSampledIn("ses_42", 0.5)).toBe(isSampledIn("ses_42", 0.5))
	})
})
