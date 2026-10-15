import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	canonicalResource,
	getMcpAuthConfig,
	isMcpAuthEnabled,
	mcpResourceUrl,
	parseScope,
	protectedResourceMetadataUrl,
	resolveIssuer,
} from "@/mcp/auth/config"
import { authorizationServerMetadata, protectedResourceMetadata } from "@/mcp/auth/metadata"
import { SECRET_TEXT } from "./fixtures"

describe("auth config", () => {
	beforeEach(() => {
		vi.unstubAllEnvs()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it("is disabled without a secret", () => {
		vi.stubEnv("MCP_OAUTH_SECRET", "")
		expect(getMcpAuthConfig()).toBeNull()
		expect(isMcpAuthEnabled()).toBe(false)
	})

	it("is disabled with a short secret and warns once", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		vi.stubEnv("MCP_OAUTH_SECRET", "too-short")
		expect(getMcpAuthConfig()).toBeNull()
		expect(getMcpAuthConfig()).toBeNull()
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it("is enabled with a long secret", () => {
		vi.stubEnv("MCP_OAUTH_SECRET", SECRET_TEXT)
		expect(getMcpAuthConfig()?.secret.toString()).toBe(SECRET_TEXT)
		expect(isMcpAuthEnabled()).toBe(true)
	})
})

describe("resolveIssuer", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("prefers MCP_OAUTH_ISSUER", () => {
		vi.stubEnv("MCP_OAUTH_ISSUER", "https://dashboardicons.com/ignored/path")
		expect(resolveIssuer(new Headers({ host: "evil.test" }), "http://localhost:3000")).toBe("https://dashboardicons.com")
	})

	it("ignores an unparsable MCP_OAUTH_ISSUER", () => {
		vi.stubEnv("MCP_OAUTH_ISSUER", "not a url")
		expect(resolveIssuer(new Headers(), "http://localhost:3000")).toBe("http://localhost:3000")
	})

	it("uses forwarded headers from the reverse proxy", () => {
		const headers = new Headers({
			"x-forwarded-host": "DashboardIcons.com, internal",
			"x-forwarded-proto": "https",
			host: "localhost:3000",
		})
		expect(resolveIssuer(headers, "http://localhost:3000")).toBe("https://dashboardicons.com")
	})

	it("falls back to the Host header and request protocol", () => {
		expect(resolveIssuer(new Headers({ host: "localhost:3005" }), "http://0.0.0.0:3005")).toBe("http://localhost:3005")
		expect(resolveIssuer(new Headers({ host: "[::1]:3005" }), "http://0.0.0.0:3005")).toBe("http://[::1]:3005")
	})

	it("falls back to the request origin for unusable headers", () => {
		expect(resolveIssuer(new Headers(), "http://localhost:3000")).toBe("http://localhost:3000")
		expect(resolveIssuer(new Headers({ host: "evil.test/path" }), "http://localhost:3000")).toBe("http://localhost:3000")
		expect(resolveIssuer(new Headers({ host: "ok.test", "x-forwarded-proto": "javascript" }), "http://localhost:3000")).toBe(
			"http://localhost:3000",
		)
	})
})

describe("resource and scope helpers", () => {
	it("builds the canonical resource and metadata URLs", () => {
		expect(mcpResourceUrl("https://dashboardicons.com")).toBe("https://dashboardicons.com/api/mcp")
		expect(protectedResourceMetadataUrl("https://dashboardicons.com")).toBe(
			"https://dashboardicons.com/.well-known/oauth-protected-resource/api/mcp",
		)
	})

	it("canonicalizes resource indicators", () => {
		expect(canonicalResource("HTTPS://DashboardIcons.com/api/mcp/")).toBe("https://dashboardicons.com/api/mcp")
		expect(canonicalResource("https://dashboardicons.com/api/mcp?x=1")).toBe("https://dashboardicons.com/api/mcp?x=1")
		expect(canonicalResource("https://dashboardicons.com/api/mcp#frag")).toBeNull()
		expect(canonicalResource("not a url")).toBeNull()
	})

	it("parses scopes", () => {
		expect(parseScope(undefined)).toBe("account")
		expect(parseScope("  ")).toBe("account")
		expect(parseScope("account account")).toBe("account")
		expect(parseScope("account admin")).toBeNull()
	})

	it("describes the protected resource and authorization server", () => {
		expect(protectedResourceMetadata("https://dashboardicons.com")).toMatchObject({
			resource: "https://dashboardicons.com/api/mcp",
			authorization_servers: ["https://dashboardicons.com"],
			scopes_supported: ["account"],
			bearer_methods_supported: ["header"],
		})
		expect(authorizationServerMetadata("https://dashboardicons.com")).toMatchObject({
			issuer: "https://dashboardicons.com",
			authorization_endpoint: "https://dashboardicons.com/oauth/authorize",
			token_endpoint: "https://dashboardicons.com/api/oauth/token",
			registration_endpoint: "https://dashboardicons.com/api/oauth/register",
			code_challenge_methods_supported: ["S256"],
			token_endpoint_auth_methods_supported: ["none"],
			authorization_response_iss_parameter_supported: true,
		})
	})
})
