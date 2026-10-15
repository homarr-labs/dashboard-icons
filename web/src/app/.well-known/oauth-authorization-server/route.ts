import { handleAuthorizationServerMetadata, handleOAuthPreflight } from "@/mcp/auth/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handleAuthorizationServerMetadata
export const OPTIONS = handleOAuthPreflight
