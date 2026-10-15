import { handleOAuthPreflight, handleTokenRequest } from "@/mcp/auth/http"

export const runtime = "nodejs"
export const POST = handleTokenRequest
export const OPTIONS = handleOAuthPreflight
