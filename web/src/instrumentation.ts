import { logs } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
	type LoggerProvider,
	type LogRecordExporter,
	LoggerProvider as OtelLoggerProvider,
	SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs"
import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null
export let loggerProvider: LoggerProvider | null = null

function getPostHogClient(): PostHog | null {
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
	if (!key || process.env.NEXT_PUBLIC_DISABLE_POSTHOG === "true") return null
	if (!posthogClient) {
		posthogClient = new PostHog(key, {
			host: "https://eu.i.posthog.com",
			flushAt: 1,
			flushInterval: 0,
		})
	}
	return posthogClient
}

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.MCP_WARM_CACHE === "true") {
		import("@/lib/icons/service").then((module) => module.warmMetadataCache()).catch(() => {})
	}

	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_DISABLE_POSTHOG !== "true") {
		const logExporter: LogRecordExporter = new OTLPLogExporter({
			url: "https://eu.i.posthog.com/i/v1/logs",
			headers: {
				Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_KEY}`,
				"Content-Type": "application/json",
			},
		})

		loggerProvider = new OtelLoggerProvider({
			resource: resourceFromAttributes({ "service.name": "dashboard-icons-web" }),
			processors: [new SimpleLogRecordProcessor({ exporter: logExporter })],
		})

		logs.setGlobalLoggerProvider(loggerProvider)
	}
}

function extractDistinctId(headers: Record<string, string>): string | undefined {
	const cookie = headers.cookie
	if (!cookie) return undefined
	const cookieString = Array.isArray(cookie) ? cookie.join("; ") : cookie
	const match = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
	if (!match?.[1]) return undefined
	try {
		const data = JSON.parse(decodeURIComponent(match[1]))
		return data.distinct_id
	} catch {
		return undefined
	}
}

export async function onRequestError(
	error: Error & { digest?: string },
	request: { path: string; method: string; headers: Record<string, string> },
	context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) {
	if (error.message?.includes("NoFallbackError")) return

	const posthog = getPostHogClient()
	if (!posthog) return

	const distinctId = extractDistinctId(request.headers)

	posthog.captureException(error, distinctId, {
		properties: {
			path: request.path,
			method: request.method,
			routerKind: context.routerKind,
			routePath: context.routePath,
			routeType: context.routeType,
			renderSource: context.renderSource,
			digest: error.digest,
		},
	})
	posthog.flush().catch(() => {})
}
