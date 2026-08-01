import { logs } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"

export function registerPostHogLogExporter(posthogKey: string, posthogHost: string): void {
	const logExporter = new OTLPLogExporter({
		url: `${posthogHost.replace(/\/$/, "")}/i/v1/logs`,
		headers: {
			Authorization: `Bearer ${posthogKey}`,
			"Content-Type": "application/json",
		},
	})

	const loggerProvider = new LoggerProvider({
		resource: resourceFromAttributes({ "service.name": "dashboard-icons-web" }),
		processors: [new BatchLogRecordProcessor({ exporter: logExporter })],
	})

	logs.setGlobalLoggerProvider(loggerProvider)
}
