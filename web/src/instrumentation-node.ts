import { logs } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"

export function registerPostHogLogExporter(posthogKey: string): void {
	const logExporter = new OTLPLogExporter({
		url: "https://eu.i.posthog.com/i/v1/logs",
		headers: {
			Authorization: `Bearer ${posthogKey}`,
			"Content-Type": "application/json",
		},
	})

	const loggerProvider = new LoggerProvider({
		resource: resourceFromAttributes({ "service.name": "dashboard-icons-web" }),
		processors: [new SimpleLogRecordProcessor({ exporter: logExporter })],
	})

	logs.setGlobalLoggerProvider(loggerProvider)
}
