export type ReplayGuard = {
	consume(id: string, expiresAtMs: number): boolean
	size(): number
}

export function createReplayGuard(maxEntries: number): ReplayGuard {
	const seen = new Map<string, number>()

	function prune(now: number): void {
		for (const [id, expiresAt] of seen) {
			if (expiresAt <= now) seen.delete(id)
		}
	}

	return {
		consume(id, expiresAtMs) {
			prune(Date.now())
			if (seen.has(id)) return false
			if (seen.size >= maxEntries) return false
			seen.set(id, expiresAtMs)
			return true
		},
		size() {
			return seen.size
		},
	}
}
