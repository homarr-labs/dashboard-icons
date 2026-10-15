import { describe, expect, it, vi } from "vitest"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"

function input(body: ReadableStream<Uint8Array> | null, length?: string) {
	const headers = new Headers()
	if (length !== undefined) headers.set("content-length", length)
	return { body, headers }
}

describe("readBoundedBytes", () => {
	it("rejects declared oversized bodies without reading", async () => {
		const body = new ReadableStream<Uint8Array>()
		expect(await readBoundedBytes(input(body, "4"), 3)).toBeNull()
		expect(body.locked).toBe(false)
	})

	it("returns empty bytes for absent and empty bodies", async () => {
		expect(await readBoundedBytes(input(null), 3)).toEqual(new Uint8Array())
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.close()
			},
		})
		expect(await readBoundedBytes(input(body), 3)).toEqual(new Uint8Array())
		expect(body.locked).toBe(false)
	})

	it.each([undefined, "0", "invalid"])("combines chunks up to the exact byte cap with length %s", async (length) => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array([0xc3]))
				controller.enqueue(new Uint8Array([0xa9, 0x61]))
				controller.close()
			},
		})
		expect(await readBoundedBytes(input(body, length), 3)).toEqual(new Uint8Array([0xc3, 0xa9, 0x61]))
		expect(body.locked).toBe(false)
	})

	it("cancels when streamed bytes exceed the cap", async () => {
		const cancel = vi.fn()
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(4))
			},
			cancel,
		})
		expect(await readBoundedBytes(input(body, "1"), 3)).toBeNull()
		expect(cancel).toHaveBeenCalledOnce()
		expect(body.locked).toBe(false)
	})

	it("preserves cancellation failures and releases the reader", async () => {
		const error = new Error("cancel failed")
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(4))
			},
			cancel() {
				throw error
			},
		})
		await expect(readBoundedBytes(input(body), 3)).rejects.toBe(error)
		expect(body.locked).toBe(false)
	})

	it("preserves stream errors and releases the reader", async () => {
		const error = new Error("read failed")
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(error)
			},
		})
		await expect(readBoundedBytes(input(body), 3)).rejects.toBe(error)
		expect(body.locked).toBe(false)
	})
})
