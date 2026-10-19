import { NextResponse } from "next/server"
import { createServerPB } from "@/lib/pb"

export async function GET() {
	try {
		const result = await createServerPB().send<{ names: string[] }>("/api/submissions/variant-names", { method: "GET" })
		return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		console.error("Custom variant suggestions unavailable", error)
		return NextResponse.json({ error: "Suggestions could not be loaded. You can still enter a Custom variant name." }, { status: 502 })
	}
}
