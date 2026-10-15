export type ReplayGuard = {
	consume(id: string, expiresAtMs: number): boolean
	size(): number
}

export function createReplayGuard(maxEntries: number, { evictOldest = false } = {}): ReplayGuard {
	const seen = new Map<string, number>()

	function prune(now: number): void {
		for (const [id, expiresAt] of seen) {
			if (expiresAt > now) return
			seen.delete(id)
		}
	}

	return {
		consume(id, expiresAtMs) {
			prune(Date.now())
			if (seen.has(id)) return false
			if (seen.size >= maxEntries) {
				if (!evictOldest) return false
				const [oldest] = seen.keys()
				seen.delete(oldest)
			}
			seen.set(id, expiresAtMs)
			return true
		},
		size() {
			return seen.size
		},
	}
}
