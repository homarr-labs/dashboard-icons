import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isChunkLoadError, recoverFromChunkError } from "@/lib/chunk-error-recovery"

describe("isChunkLoadError", () => {
	it("matches errors named ChunkLoadError", () => {
		const error = new Error("boom")
		error.name = "ChunkLoadError"
		expect(isChunkLoadError(error)).toBe(true)
	})

	it("matches known chunk failure messages", () => {
		expect(isChunkLoadError(new Error("Loading chunk 42 failed"))).toBe(true)
		expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /_next/static/chunks/x.js"))).toBe(true)
	})

	it("ignores unrelated errors and empty values", () => {
		expect(isChunkLoadError(new Error("network down"))).toBe(false)
		expect(isChunkLoadError(null)).toBe(false)
		expect(isChunkLoadError(undefined)).toBe(false)
	})
})

describe("recoverFromChunkError", () => {
	const originalLocation = window.location
	let reload: ReturnType<typeof vi.fn>

	beforeEach(() => {
		window.sessionStorage.clear()
		reload = vi.fn()
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { ...originalLocation, reload },
		})
	})

	afterEach(() => {
		Object.defineProperty(window, "location", { configurable: true, value: originalLocation })
	})

	it("reloads once and records the time", () => {
		expect(recoverFromChunkError(1_000_000)).toBe(true)
		expect(reload).toHaveBeenCalledTimes(1)
		expect(window.sessionStorage.getItem("chunk-reload-at")).toBe("1000000")
	})

	it("skips a second reload inside the cooldown", () => {
		recoverFromChunkError(1_000_000)
		expect(recoverFromChunkError(1_005_000)).toBe(false)
		expect(reload).toHaveBeenCalledTimes(1)
	})

	it("reloads again after the cooldown passes", () => {
		recoverFromChunkError(1_000_000)
		expect(recoverFromChunkError(1_020_000)).toBe(true)
		expect(reload).toHaveBeenCalledTimes(2)
	})
})
