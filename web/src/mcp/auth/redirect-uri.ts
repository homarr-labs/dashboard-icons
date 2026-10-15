const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])
const BLOCKED_SCHEMES = new Set([
	"javascript:",
	"data:",
	"file:",
	"vbscript:",
	"blob:",
	"about:",
	"filesystem:",
	"view-source:",
	"ftp:",
	"ws:",
	"wss:",
	"mailto:",
	"tel:",
])
export const MAX_REDIRECT_URI_LENGTH = 512

function parse(uri: string): URL | null {
	if (!URL.canParse(uri)) return null
	return new URL(uri)
}

function isLoopback(url: URL): boolean {
	return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)
}

export function isAllowedRedirectUri(uri: string): boolean {
	if (uri.length > MAX_REDIRECT_URI_LENGTH || uri.includes("#")) return false
	const url = parse(uri)
	if (!url || url.username || url.password) return false
	if (url.protocol === "https:") return true
	if (url.protocol === "http:") return isLoopback(url)
	return !BLOCKED_SCHEMES.has(url.protocol)
}

export function redirectUriMatches(registered: readonly string[], requested: string): boolean {
	if (!isAllowedRedirectUri(requested)) return false
	if (registered.includes(requested)) return true
	const target = new URL(requested)
	if (!isLoopback(target)) return false
	return registered.some((candidate) => {
		const url = parse(candidate)
		if (!url || !isLoopback(url)) return false
		return url.hostname === target.hostname && url.pathname === target.pathname && url.search === target.search
	})
}

export function redirectUriLabel(uri: string): string {
	const url = new URL(uri)
	return url.host || url.protocol
}
