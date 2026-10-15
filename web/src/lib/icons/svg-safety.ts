export const MAX_SUBMITTED_SVG_BYTES = 48 * 1024

export type SvgCheck = { ok: true; svg: string } | { ok: false; reason: string }

const COMMENT = String.raw`<!--(?:(?!-->)[\s\S])*-->`
const SVG_DOCUMENT = new RegExp(String.raw`^(?:<\?xml[^>]*\?>\s*)?(?:${COMMENT}\s*)*<svg[\s>][\s\S]*<\/svg>(?:\s*${COMMENT})*$`, "i")
const SVG_NAMESPACE = /^[^>]*\sxmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i
const REFERENCE = /(?:(?:^|[\s"'/])(?:[\w.-]+:)?href\s*=\s*["']?|url\(\s*["']?)\s*([^"'()\s>]*)/gi
const SCRIPT_URL = /(?:java|vb)script:/i

const FORBIDDEN: readonly [RegExp, string][] = [
	[/<!(?:DOCTYPE|ENTITY)/i, "DOCTYPE and entity declarations are not allowed"],
	[/<script[\s>/]/i, "<script> elements are not allowed"],
	[/<foreignObject[\s>/]/i, "<foreignObject> elements are not allowed"],
	[/<(?:iframe|embed|object)[\s>/]/i, "embedded documents are not allowed"],
	[/[\s"'/]on[a-z]+\s*=/i, "event handler attributes (on*=) are not allowed"],
	[/attributeName\s*=\s*["']?(?:xlink:)?href/i, "animating href is not allowed"],
	[/@import/i, "CSS @import is not allowed"],
	[/<[\w.-]+:/i, "namespaced elements are not allowed"],
	[/<(?:animate\w*|set|discard)[\s>/]/i, "SVG animations that can change attributes are not allowed"],
	[/\\/u, "CSS escapes are not allowed"],
	[/&(?!(?:amp|lt|gt|quot|apos);)/u, "encoded or undeclared entities are not allowed"],
	[
		/[\s"'/]xmlns(?::[\w.-]+)?\s*=\s*["'](?!http:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)["'])/i,
		"only SVG and XLink namespaces are allowed",
	],
]

function isLocalReference(value: string): boolean {
	return value.startsWith("#")
}

export function checkSubmittedSvg(input: string): SvgCheck {
	const svg = input.trim()
	if (Buffer.byteLength(svg) > MAX_SUBMITTED_SVG_BYTES) {
		return { ok: false, reason: `the SVG is larger than ${MAX_SUBMITTED_SVG_BYTES / 1024} KB` }
	}
	if (!SVG_DOCUMENT.test(svg)) return { ok: false, reason: "send one complete SVG document, from <svg ...> to </svg>" }
	if (!SVG_NAMESPACE.test(svg.slice(svg.search(/<svg[\s>]/i)))) {
		return { ok: false, reason: 'the root <svg> needs xmlns="http://www.w3.org/2000/svg"' }
	}
	for (const [pattern, reason] of FORBIDDEN) {
		if (pattern.test(svg)) return { ok: false, reason }
	}
	if (SCRIPT_URL.test(svg.replace(/[\s\p{Cc}]+/gu, ""))) return { ok: false, reason: "script URLs are not allowed" }
	for (const [, reference] of svg.matchAll(REFERENCE)) {
		if (!isLocalReference(reference)) {
			return {
				ok: false,
				reason: `external references and embedded images are not allowed (${reference.slice(0, 80) || "empty"}); use local #ids only`,
			}
		}
	}
	return { ok: true, svg }
}
