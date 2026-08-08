const CHUNK_ERROR_PATTERNS = [
	/ChunkLoadError/i,
	/Loading chunk [\w-]+ failed/i,
	/Loading CSS chunk [\w-]+ failed/i,
	/Failed to fetch dynamically imported module/i,
	/error loading dynamically imported module/i,
]

/**
 * Reports if an error comes from a missing or stale build chunk.
 * A deployment replaces the hashed files under `/_next/static/`, so an open
 * tab that still runs the old app shell can request a chunk that is gone.
 */
export function isChunkLoadError(error: unknown): boolean {
	if (!error) return false
	const candidate = error as { name?: unknown; message?: unknown }
	if (candidate.name === "ChunkLoadError") return true
	const message = typeof candidate.message === "string" ? candidate.message : ""
	return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

const RELOAD_MARKER = "chunk-reload-at"
const RELOAD_COOLDOWN_MS = 10_000

/**
 * Reloads the page one time to fetch the current build assets.
 * A cooldown stops a reload loop when the chunk stays unavailable.
 * Returns true when a reload starts.
 */
export function recoverFromChunkError(now: number = Date.now()): boolean {
	if (typeof window === "undefined") return false

	let lastReloadAt = 0
	try {
		lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_MARKER)) || 0
	} catch {
		// Storage can be blocked; keep the default and still try one reload.
	}

	if (now - lastReloadAt < RELOAD_COOLDOWN_MS) return false

	try {
		window.sessionStorage.setItem(RELOAD_MARKER, String(now))
	} catch {
		// Ignore storage failures and still reload.
	}

	window.location.reload()
	return true
}
