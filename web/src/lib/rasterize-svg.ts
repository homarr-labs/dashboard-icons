import "server-only"

export async function rasterizeRemoteSvg(url: string, size: number, fillColor?: string): Promise<ArrayBuffer> {
	const { default: sharp } = await import("sharp")
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch SVG (${response.status})`)

	let svgInput: Buffer
	if (fillColor) {
		if (!/^#[0-9A-Fa-f]{6}$/.test(fillColor)) throw new Error("Invalid SVG fill color")
		const svg = (await response.text()).replace(/<svg\b/, `<svg fill="${fillColor}"`)
		svgInput = Buffer.from(svg)
	} else {
		svgInput = Buffer.from(await response.arrayBuffer())
	}

	const png = await sharp(svgInput).resize(size, size, { fit: "contain" }).png().toBuffer()

	return Uint8Array.from(png).buffer
}
