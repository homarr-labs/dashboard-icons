import "server-only"
import sharp from "sharp"

export async function rasterizeRemoteSvg(url: string, size: number, fillColor?: string): Promise<ArrayBuffer> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch SVG (${response.status})`)

	let svg = await response.text()
	if (fillColor) {
		svg = svg.replace("<svg", `<svg fill="${fillColor}"`)
	}

	const png = await sharp(Buffer.from(svg))
		.resize(size, size, { fit: "contain" })
		.png()
		.toBuffer()

	return Uint8Array.from(png).buffer
}
