import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

const coverageInclude = [
	"src/lib/api.ts",
	"src/lib/icon-url.ts",
	"src/lib/icons/**/*.ts",
	"src/mcp/**/*.ts",
	"src/app/api/mcp/**/*.ts",
]

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: coverageInclude,
			exclude: ["**/__tests__/**", "**/*.test.ts"],
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
				perFile: true,
			},
		},
	},
})
