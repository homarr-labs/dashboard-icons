import type { OAuthMetadata, OAuthProtectedResourceMetadata } from "@modelcontextprotocol/server"
import { MCP_SCOPES, mcpResourceUrl } from "./config"

export function protectedResourceMetadata(issuer: string): OAuthProtectedResourceMetadata {
	return {
		resource: mcpResourceUrl(issuer),
		authorization_servers: [issuer],
		scopes_supported: [...MCP_SCOPES],
		bearer_methods_supported: ["header"],
		resource_name: "Dashboard Icons MCP",
		resource_documentation: "https://github.com/homarr-labs/dashboard-icons/blob/main/web/docs/MCP.md",
	}
}

export function authorizationServerMetadata(issuer: string): OAuthMetadata {
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/api/oauth/token`,
		registration_endpoint: `${issuer}/api/oauth/register`,
		response_types_supported: ["code"],
		response_modes_supported: ["query"],
		grant_types_supported: ["authorization_code", "refresh_token"],
		code_challenge_methods_supported: ["S256"],
		token_endpoint_auth_methods_supported: ["none"],
		scopes_supported: [...MCP_SCOPES],
		authorization_response_iss_parameter_supported: true,
		service_documentation: "https://github.com/homarr-labs/dashboard-icons/blob/main/web/docs/MCP-AUTH.md",
	}
}
