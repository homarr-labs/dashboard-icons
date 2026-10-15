import { describe, expect, it } from "vitest"
import { clientFingerprint, readClient, registerClient } from "@/mcp/auth/clients"
import { seal } from "@/mcp/auth/seal"
import { OTHER_SECRET, REDIRECT_URI, SECRET, tamper } from "./fixtures"

describe("registerClient", () => {
	it("registers a public client with a sealed client_id", () => {
		const result = registerClient(SECRET, { client_name: "Claude Code", redirect_uris: [REDIRECT_URI], token_endpoint_auth_method: "none" })
		if (!result.ok) throw new Error("expected success")
		expect(result.client).toMatchObject({
			client_name: "Claude Code",
			redirect_uris: [REDIRECT_URI],
			token_endpoint_auth_method: "none",
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			scope: "account",
		})
		expect(readClient(SECRET, result.client.client_id)).toEqual({
			id: result.client.client_id,
			name: "Claude Code",
			redirectUris: [REDIRECT_URI],
		})
	})

	it("sanitizes or defaults the client name", () => {
		const control = registerClient(SECRET, { client_name: "  Evil\u0000\u001b Client  ", redirect_uris: [REDIRECT_URI] })
		const missing = registerClient(SECRET, { redirect_uris: [REDIRECT_URI] })
		const blank = registerClient(SECRET, { client_name: "\u0007 \u202e", redirect_uris: [REDIRECT_URI] })
		const bidi = registerClient(SECRET, { client_name: "\u202eedoC\u200b VS\ufeff", redirect_uris: [REDIRECT_URI] })
		const long = registerClient(SECRET, { client_name: `${"a".repeat(79)}😀😀`, redirect_uris: [REDIRECT_URI] })
		expect(control.ok && control.client.client_name).toBe("Evil Client")
		expect(bidi.ok && bidi.client.client_name).toBe("edoC VS")
		expect(long.ok && long.client.client_name).toBe(`${"a".repeat(79)}😀`)
		expect(missing.ok && missing.client.client_name).toBe("MCP client")
		expect(blank.ok && blank.client.client_name).toBe("MCP client")
	})

	it("rejects malformed metadata", () => {
		for (const input of [
			null,
			{},
			{ redirect_uris: [] },
			{ redirect_uris: ["a", "b", "c", "d", "e", "f"] },
			{ redirect_uris: [REDIRECT_URI], client_name: 1 },
		]) {
			expect(registerClient(SECRET, input)).toMatchObject({ ok: false, error: "invalid_client_metadata" })
		}
	})

	it("rejects unsafe redirect URIs", () => {
		expect(registerClient(SECRET, { redirect_uris: [REDIRECT_URI, "javascript:alert(1)"] })).toMatchObject({
			ok: false,
			error: "invalid_redirect_uri",
		})
		expect(registerClient(SECRET, { redirect_uris: ["http://example.com/cb"] })).toMatchObject({ ok: false, error: "invalid_redirect_uri" })
	})
})

describe("readClient", () => {
	const registered = registerClient(SECRET, { client_name: "VS Code", redirect_uris: [REDIRECT_URI] })
	const clientId = registered.ok ? registered.client.client_id : ""

	it("rejects tampered, foreign and wrong-purpose client ids", () => {
		expect(readClient(SECRET, tamper(clientId))).toBeNull()
		expect(readClient(OTHER_SECRET, clientId)).toBeNull()
		expect(readClient(SECRET, seal(SECRET, "access", { name: "x", redirect_uris: [REDIRECT_URI] }, 60))).toBeNull()
	})

	it("rejects sealed client ids with an unexpected shape", () => {
		expect(readClient(SECRET, seal(SECRET, "client", { name: "x", redirect_uris: [] }, 60))).toBeNull()
	})

	it("fingerprints client ids", () => {
		expect(clientFingerprint(clientId)).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(clientFingerprint(clientId)).not.toBe(clientFingerprint(`${clientId}x`))
	})
})
