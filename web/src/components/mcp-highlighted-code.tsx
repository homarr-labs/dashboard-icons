import type { ReactNode } from "react"

export type McpCodeLanguage = "json" | "bash"

const MCP_CODE_LANGUAGES = ["json", "bash"] as const satisfies readonly McpCodeLanguage[]

type HighlightClassName = "text-sky-400" | "text-emerald-400" | "text-amber-400" | "text-violet-400" | "text-zinc-500" | "text-zinc-200"

type HighlightSpan = {
	text: string
	className: HighlightClassName
}

type TokenRenderer = (match: RegExpExecArray, token: string) => HighlightSpan | HighlightSpan[] | null

type LineHighlightStrategy = {
	pattern: RegExp
	renderToken: TokenRenderer
}

const BASH_COMMAND_WORDS = new Set(["claude", "mcp", "add", "npx"])

const JSON_TOKEN_STRATEGY: LineHighlightStrategy = {
	pattern: /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],]|(:)/g,
	renderToken(match, token) {
		if (match[1] && match[2]) {
			return [
				{ text: match[1], className: "text-sky-400" },
				{ text: match[2], className: "text-zinc-500" },
			]
		}

		if (match[1]) {
			return { text: match[1], className: "text-emerald-400" }
		}

		if (/\b(true|false|null)\b/.test(token)) {
			return { text: token, className: "text-amber-400" }
		}

		if (/^-?\d/.test(token)) {
			return { text: token, className: "text-violet-400" }
		}

		return { text: token, className: "text-zinc-500" }
	},
}

const BASH_TOKEN_STRATEGY: LineHighlightStrategy = {
	pattern: /(https?:\/\/[^\s]+)|(--?[\w-]+)|(\b[\w.-]+\b)|(\s+)/g,
	renderToken(match, token) {
		if (match[1]) {
			return { text: token, className: "text-emerald-400" }
		}

		if (match[2]) {
			return { text: token, className: "text-amber-400" }
		}

		if (match[3] && BASH_COMMAND_WORDS.has(match[3])) {
			return { text: token, className: "text-sky-400" }
		}

		if (match[3]) {
			return { text: token, className: "text-zinc-200" }
		}

		return null
	},
}

const LINE_HIGHLIGHT_STRATEGIES: Record<McpCodeLanguage, LineHighlightStrategy> = {
	json: JSON_TOKEN_STRATEGY,
	bash: BASH_TOKEN_STRATEGY,
}

function isMcpCodeLanguage(value: string): value is McpCodeLanguage {
	return (MCP_CODE_LANGUAGES as readonly string[]).includes(value)
}

function toHighlightSpans(rendered: HighlightSpan | HighlightSpan[]): HighlightSpan[] {
	return Array.isArray(rendered) ? rendered : [rendered]
}

function renderHighlightSpan(span: HighlightSpan, key: string): ReactNode {
	return (
		<span key={key} className={span.className}>
			{span.text}
		</span>
	)
}

function highlightLine(line: string, lineKey: number, strategy: LineHighlightStrategy): ReactNode[] {
	const nodes: ReactNode[] = []
	const { pattern, renderToken } = strategy
	let lastIndex = 0
	let tokenIndex = 0
	let match = pattern.exec(line)

	while (match !== null) {
		if (match.index > lastIndex) {
			nodes.push(line.slice(lastIndex, match.index))
		}

		const token = match[0]
		const rendered = renderToken(match, token)

		if (rendered) {
			for (const [spanIndex, span] of toHighlightSpans(rendered).entries()) {
				nodes.push(renderHighlightSpan(span, `${lineKey}-${tokenIndex}-${spanIndex}`))
			}
		} else {
			nodes.push(token)
		}

		lastIndex = pattern.lastIndex
		tokenIndex += 1
		match = pattern.exec(line)
	}

	if (lastIndex < line.length) {
		nodes.push(line.slice(lastIndex))
	}

	return nodes
}

type McpHighlightedCodeProps = {
	code: string
	language: McpCodeLanguage
}

export function McpHighlightedCode({ code, language }: McpHighlightedCodeProps) {
	if (!isMcpCodeLanguage(language)) {
		return null
	}

	const strategy = LINE_HIGHLIGHT_STRATEGIES[language]
	if (!strategy) {
		return null
	}

	if (!code) {
		return null
	}

	const lines = code.split("\n")
	if (lines.length === 0) {
		return null
	}

	return (
		<code className="font-mono text-[11px] leading-relaxed sm:text-xs">
			{lines.map((line, lineIndex) => (
				<span key={`line-${lineIndex}-${line.length}`} className="block">
					{highlightLine(line, lineIndex, strategy)}
				</span>
			))}
		</code>
	)
}
