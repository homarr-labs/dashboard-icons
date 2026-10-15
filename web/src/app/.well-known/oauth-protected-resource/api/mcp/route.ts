import { handleOAuthPreflight, handleProtectedResourceMetadata } from "@/mcp/auth/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handleProtectedResourceMetadata
export const OPTIONS = handleOAuthPreflight
