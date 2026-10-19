import { NextResponse } from "next/server"
import { ClientResponseError } from "pocketbase"
import { iconUpdatePreviews } from "@/lib/icon-update-previews"
import { loadUpdateTarget } from "@/lib/icon-update-service"
import { createServerPB } from "@/lib/pb"
import { refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

export async function GET(req: Request) {
	const token = req.headers.get("authorization")
	if (!token) return NextResponse.json({ error: "Sign in to edit an Icon" }, { status: 401 })
	const session = await refreshPocketBaseSession(token)
	if (!session.ok && session.reason === "invalid") return NextResponse.json({ error: "Sign in again to load the Icon" }, { status: 401 })
	if (!session.ok) return NextResponse.json({ error: "The Icon service is unavailable. Try again in a minute." }, { status: 502 })
	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	const query = new URL(req.url).searchParams
	try {
		const target = await loadUpdateTarget(pb, query.get("name") ?? "", query.get("submission") ?? "")
		return NextResponse.json(iconUpdatePreviews(target), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		if (error instanceof ClientResponseError) return NextResponse.json({ error: error.message }, { status: error.status || 502 })
		console.error("Icon update target could not be loaded", error)
		return NextResponse.json({ error: "The Icon could not be loaded. Try again." }, { status: 502 })
	}
}
