import { defineConfig } from "vitest/config"
import baseConfig from "./vitest.config"

export default defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		include: ["src/mcp/__tests__/oauth-route.test.ts"],
	},
})
