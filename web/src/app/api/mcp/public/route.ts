import type { NextRequest } from "next/server"
import { handleDashboardIconsMcpRoute } from "@/mcp/http-route"

export const runtime = "nodejs"
export const maxDuration = 30

export function GET(req: NextRequest) {
	return handleDashboardIconsMcpRoute(req, true)
}

export const POST = GET
