import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { cache } from "react"
import { getAllIcons } from "./api"

/**
 * In-memory cache for icon files during build/request
 * This persists across multiple calls within the same build process
 */
const iconFileCache = new Map<string, Buffer | null>()
let preloadPromise: Promise<void> | null = null
let isPreloaded = false

/**
 * Preloads all icon files into memory
 * This should be called once at the start of the build process
 */
export async function preloadAllIcons(): Promise<void> {
	if (isPreloaded || preloadPromise) {
		return preloadPromise || Promise.resolve()
	}

	preloadPromise = (async () => {
		const startTime = Date.now()
		const iconsData = await getAllIcons()
		const iconNames = Object.keys(iconsData)
		const pngDir = join(process.cwd(), `../png`)

		console.log(`[Icon Cache] Preloading ${iconNames.length} icons into memory...`)

		const loadPromises = iconNames.map(async (iconName) => {
			if (iconFileCache.has(iconName)) {
				return
			}
			try {
				const iconPath = join(pngDir, `${iconName}.png`)
				const buffer = await readFile(iconPath)
				iconFileCache.set(iconName, buffer)
			} catch (_error) {
				iconFileCache.set(iconName, null)
			}
		})

		await Promise.all(loadPromises)
		const duration = Date.now() - startTime
		const loadedCount = Array.from(iconFileCache.values()).filter((v) => v !== null).length
		console.log(
			`[Icon Cache] Preloaded ${loadedCount}/${iconNames.length} icons in ${duration}ms (${(loadedCount / duration).toFixed(2)} icons/ms)`,
		)
		isPreloaded = true
	})()

	return preloadPromise
}

/**
 * Reads an icon PNG file from the filesystem
 * Uses React cache() for request-level memoization
 * Uses in-memory Map for build-level caching
 * If preloaded, returns immediately from cache
 */
export const readIconFile = cache(async (iconName: string): Promise<Buffer | null> => {
	if (iconFileCache.has(iconName)) {
		return iconFileCache.get(iconName)!
	}

	try {
		const iconPath = join(process.cwd(), `../png/${iconName}.png`)
		const buffer = await readFile(iconPath)
		iconFileCache.set(iconName, buffer)
		return buffer
	} catch (_error) {
		iconFileCache.set(iconName, null)
		return null
	}
})
