import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const CANONICAL_HOST = "dashboardicons.com"
const TRACKING_PARAMS = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "source"]

export function middleware(request: NextRequest) {
	const { host } = request.nextUrl

	if (host === "localhost" || host.endsWith(".local") || host.startsWith("localhost:") || host === "127.0.0.1") {
		return NextResponse.next()
	}

	const url = request.nextUrl.clone()
	let needsRedirect = false

	if (host.startsWith("www.")) {
		url.host = CANONICAL_HOST
		needsRedirect = true
	}

	const forwardedProto = request.headers.get("x-forwarded-proto")
	if (forwardedProto === "http" || (!forwardedProto && url.protocol === "http:")) {
		url.protocol = "https:"
		needsRedirect = true
	}

	const hasTrackingParams = TRACKING_PARAMS.some((param) => url.searchParams.has(param))
	if (hasTrackingParams) {
		for (const param of TRACKING_PARAMS) {
			url.searchParams.delete(param)
		}
		needsRedirect = true
	}

	if (needsRedirect) {
		return NextResponse.redirect(url, 301)
	}

	return NextResponse.next()
}

export const config = {
	matcher: "/((?!_next/|_vercel|api/).*)",
}
