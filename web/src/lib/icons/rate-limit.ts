type Scope = "request" | "tool"

const LIMITS: Record<Scope, number> = {
	request: 60,
	tool: 30,
}

const WINDOW_MS = 60_000

type Entry = { count: number; resetAt: number }
const buckets = new Map<string, Entry>()
let nextCleanupAt = 0

function cleanupExpiredBuckets(now: number): void {
	if (now < nextCleanupAt) return
	for (const [key, entry] of buckets) {
		if (now >= entry.resetAt) buckets.delete(key)
	}
	nextCleanupAt = now + WINDOW_MS
}

function bucketKey(ip: string, scope: Scope): string {
	return `${ip}:${scope}`
}

export function getClientIp(headers: Headers): string {
	const forwarded = headers.get("x-forwarded-for")
	if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
	return headers.get("x-real-ip")?.trim() || "unknown"
}

export function checkRateLimit(ip: string, scope: Scope): { allowed: boolean; retryAfter?: number } {
	if (process.env.MCP_RATE_LIMIT_ENABLED === "false") {
		return { allowed: true }
	}

	const key = bucketKey(ip, scope)
	const now = Date.now()
	cleanupExpiredBuckets(now)
	let entry = buckets.get(key)

	if (!entry || now >= entry.resetAt) {
		entry = { count: 0, resetAt: now + WINDOW_MS }
		buckets.set(key, entry)
	}

	entry.count++
	if (entry.count > LIMITS[scope]) {
		return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
	}
	return { allowed: true }
}

export function resetRateLimitsForTests(): void {
	buckets.clear()
	nextCleanupAt = 0
}

export function getRateLimitBucketCountForTests(): number {
	return buckets.size
}
