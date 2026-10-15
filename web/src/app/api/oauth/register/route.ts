import { handleClientRegistration, handleOAuthPreflight } from "@/mcp/auth/http"

export const runtime = "nodejs"
export const POST = handleClientRegistration
export const OPTIONS = handleOAuthPreflight
