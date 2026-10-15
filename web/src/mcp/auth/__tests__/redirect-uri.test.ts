import { describe, expect, it } from "vitest"
import { isAllowedRedirectUri, MAX_REDIRECT_URI_LENGTH, redirectUriLabel, redirectUriMatches } from "@/mcp/auth/redirect-uri"

describe("isAllowedRedirectUri", () => {
	it.each([
		"https://vscode.dev/redirect",
		"https://www.cursor.com/agents/mcp/oauth/callback",
		"http://localhost:8787/callback",
		"http://127.0.0.1:33418",
		"http://[::1]:5000/cb",
		"cursor://anysphere.cursor-retrieval/oauth/callback",
		"com.example.app:/oauth2redirect",
	])("accepts %s", (uri) => {
		expect(isAllowedRedirectUri(uri)).toBe(true)
	})

	it.each([
		"http://example.com/callback",
		"http://localhost.evil.com/callback",
		"javascript:alert(1)",
		"data:text/html,hi",
		"file:///etc/passwd",
		"vbscript:msgbox",
		"https://example.com/cb#fragment",
		"https://user:pass@example.com/cb",
		"not a url",
		`https://example.com/${"a".repeat(MAX_REDIRECT_URI_LENGTH)}`,
	])("rejects %s", (uri) => {
		expect(isAllowedRedirectUri(uri)).toBe(false)
	})
})

describe("redirectUriMatches", () => {
	it("requires an exact match for non-loopback URIs", () => {
		expect(redirectUriMatches(["https://vscode.dev/redirect"], "https://vscode.dev/redirect")).toBe(true)
		expect(redirectUriMatches(["https://vscode.dev/redirect"], "https://vscode.dev/redirect/")).toBe(false)
		expect(redirectUriMatches(["cursor://a/cb"], "cursor://a/other")).toBe(false)
	})

	it("ignores the port for loopback URIs (RFC 8252 §7.3)", () => {
		expect(redirectUriMatches(["http://127.0.0.1:1234/callback"], "http://127.0.0.1:55555/callback")).toBe(true)
		expect(redirectUriMatches(["http://localhost/callback"], "http://localhost:9000/callback")).toBe(true)
	})

	it("still matches loopback host, path and query", () => {
		expect(redirectUriMatches(["http://127.0.0.1:1234/callback"], "http://localhost:1234/callback")).toBe(false)
		expect(redirectUriMatches(["http://127.0.0.1:1234/callback"], "http://127.0.0.1:1234/other")).toBe(false)
		expect(redirectUriMatches(["http://127.0.0.1/cb?a=1"], "http://127.0.0.1:9/cb?a=2")).toBe(false)
		expect(redirectUriMatches(["https://127.0.0.1/cb", "garbage"], "http://127.0.0.1:9/cb")).toBe(false)
	})

	it("rejects requested URIs that are not allowed at all", () => {
		expect(redirectUriMatches(["javascript:alert(1)"], "javascript:alert(1)")).toBe(false)
	})
})

describe("redirectUriLabel", () => {
	it("shows the host, or the scheme when there is none", () => {
		expect(redirectUriLabel("http://127.0.0.1:33418/callback")).toBe("127.0.0.1:33418")
		expect(redirectUriLabel("com.example.app:/oauth2redirect")).toBe("com.example.app:")
	})
})
