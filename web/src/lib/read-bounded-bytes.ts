export async function readBoundedBytes(
	input: { headers: Headers; body: ReadableStream<Uint8Array> | null },
	maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
	if (Number(input.headers.get("content-length")) > maxBytes) return null
	if (!input.body) return new Uint8Array(0)
	const reader = input.body.getReader()
	try {
		const chunks: Uint8Array[] = []
		let size = 0
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			size += value.byteLength
			if (size > maxBytes) {
				await reader.cancel()
				return null
			}
			chunks.push(value)
		}
		const bytes = new Uint8Array(size)
		let offset = 0
		for (const chunk of chunks) {
			bytes.set(chunk, offset)
			offset += chunk.byteLength
		}
		return bytes
	} finally {
		reader.releaseLock()
	}
}
