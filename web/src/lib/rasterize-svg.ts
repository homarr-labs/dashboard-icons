import "server-only"
import sharp from "sharp"

export async function rasterizeRemoteSvg(url: string, size: number): Promise<ArrayBuffer> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch SVG (${response.status})`)

	const png = await sharp(Buffer.from(await response.arrayBuffer()))
		.resize(size, size, { fit: "contain" })
		.png()
		.toBuffer()

	return Uint8Array.from(png).buffer
}
