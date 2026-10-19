import { NextResponse } from "next/server"
import { getAllIcons } from "@/lib/api"

export async function GET() {
	const icons = await getAllIcons()
	const names = Object.keys(icons)
	return NextResponse.json({ names }, { headers: { "Cache-Control": "public, max-age=300" } })
}
