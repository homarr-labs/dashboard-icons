import { getIconsArray } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
	try {
		const icons = await getIconsArray()
		return NextResponse.json(icons)
	} catch (error) {
		console.error("Error fetching icons:", error)
		return NextResponse.json({ error: "Failed to fetch icons" }, { status: 500 })
	}
}