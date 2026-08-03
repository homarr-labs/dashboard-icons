"use client"

import { Check, Copy, ExternalLink, ImageIcon, Link2, type LucideIcon, Plug, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import { useState } from "react"
import { type McpCodeLanguage, McpHighlightedCode } from "@/components/mcp-highlighted-code"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { REPO_PATH, WEB_URL } from "@/constants"
import { MCP_CLIENT_GUIDES, MCP_TOOLS, type McpClientGuide, type McpSetupSource } from "@/lib/mcp-setup-config"
import { cn } from "@/lib/utils"

const MCP_DOCS_URL = `${REPO_PATH}/blob/main/web/docs/MCP.md`
const MCP_INTRO_URL = "https://modelcontextprotocol.io/introduction"

function McpClientIcon({ guide, size = 16 }: { guide: McpClientGuide; size?: number }) {
	if (guide.useLucideIcon === "plug") {
		return <Plug className="shrink-0 text-muted-foreground" style={{ width: size, height: size }} aria-hidden />
	}

	if (!guide.iconUrl) return null

	return (
		<UnoptimizedImage
			src={guide.iconUrl}
			alt=""
			width={size}
			height={size}
			className={cn("shrink-0 object-contain", guide.monochromeIcon && "dark:invert")}
		/>
	)
}

function CodeBlock({
	value,
	fileLabel,
	language = "json",
	onCopy,
}: {
	value: string
	fileLabel: string
	language?: McpCodeLanguage
	onCopy: () => void
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			onCopy()
			setTimeout(() => setCopied(false), 1500)
		} catch {
			setCopied(false)
		}
	}

	return (
		<div className="space-y-1.5">
			<p className="text-xs font-medium text-muted-foreground font-mono">{fileLabel}</p>
			<div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-inner">
				<div className="absolute top-2 right-2 z-10">
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2 border-zinc-600 bg-zinc-100 text-zinc-900 shadow-sm hover:bg-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
						type="button"
						onClick={handleCopy}
					>
						{copied ? (
							<>
								<Check className="h-4 w-4" /> Copied
							</>
						) : (
							<>
								<Copy className="h-4 w-4" /> Copy
							</>
						)}
					</Button>
				</div>
				<pre className="max-h-52 overflow-auto p-3 pr-28 text-zinc-100">
					<McpHighlightedCode code={value} language={language} />
				</pre>
			</div>
		</div>
	)
}

function ClientGuidePanel({ guide, source }: { guide: McpClientGuide; source: McpSetupSource }) {
	const variants = guide.variants ?? [
		{
			title: guide.label,
			configFileLabel: guide.configFileLabel ?? "",
			snippetKind: guide.snippetKind ?? "json",
			steps: guide.steps ?? [],
			analyticsClient: guide.id,
			getSnippet: guide.getSnippet ?? (() => ""),
		},
	]

	return (
		<div className="space-y-4 pb-1">
			{guide.prerequisites?.length ? (
				<div className="space-y-1 border-l-2 border-primary/40 pl-3">
					{guide.prerequisites.map((note) => (
						<p key={note} className="text-xs text-muted-foreground leading-relaxed">
							{note}
						</p>
					))}
				</div>
			) : null}

			{variants.map((variant, variantIndex) => (
				<div key={variant.title} className={cn("space-y-3", variantIndex > 0 && "border-t pt-4")}>
					{variants.length > 1 ? <p className="text-xs font-semibold text-foreground">{variant.title}</p> : null}

					<ol className="space-y-1 text-xs text-muted-foreground leading-relaxed">
						{variant.steps.map((step, idx) => (
							<li key={step} className="flex gap-2">
								<span className="font-semibold text-primary">{idx + 1}.</span>
								<span>{step}</span>
							</li>
						))}
					</ol>

					<CodeBlock
						value={variant.getSnippet(WEB_URL)}
						fileLabel={variant.configFileLabel}
						language={variant.snippetKind}
						onCopy={() => {
							posthog?.capture("mcp_config_copied", { source, client: variant.analyticsClient })
						}}
					/>
				</div>
			))}
		</div>
	)
}

const MCP_TOOL_ICONS: Record<(typeof MCP_TOOLS)[number]["name"], LucideIcon> = {
	search_icons: Search,
	get_icon: ImageIcon,
	get_icon_url: Link2,
	suggest_icon: Sparkles,
}

function McpToolsSection() {
	return (
		<div>
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-0.5">
					<h3 className="text-sm font-semibold tracking-tight">Available tools</h3>
					<p className="text-xs leading-relaxed text-muted-foreground">Ready as soon as the server is connected.</p>
				</div>
				<Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-[10px] font-medium tabular-nums">
					{MCP_TOOLS.length}
				</Badge>
			</div>

			<ul className="mt-3 space-y-1">
				{MCP_TOOLS.map((tool) => {
					const Icon = MCP_TOOL_ICONS[tool.name]

					return (
						<li key={tool.name} className="group flex gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-background/70">
							<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border/70 transition-colors group-hover:ring-primary/25">
								<Icon className="size-3.5 text-primary" aria-hidden />
							</div>
							<div className="min-w-0 flex-1">
								<code className="block font-mono text-xs font-semibold text-foreground">{tool.name}</code>
								<p className="text-[11px] leading-relaxed text-muted-foreground">{tool.description}</p>
							</div>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

export function McpSetupDialogContent({ source }: { source: McpSetupSource }) {
	return (
		<div className="grid md:grid-cols-[minmax(0,1fr)_17rem]">
			<section className="min-w-0 space-y-4 p-5 sm:p-6" aria-labelledby="mcp-setup-heading">
				<div className="space-y-1">
					<h3 id="mcp-setup-heading" className="text-sm font-semibold">
						Choose your client
					</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Open a guide, copy the config, then restart your client if prompted.
					</p>
				</div>

				<Accordion type="single" collapsible defaultValue="cursor" className="w-full space-y-2">
					{MCP_CLIENT_GUIDES.map((guide) => (
						<AccordionItem key={guide.id} value={guide.id} className="rounded-md border px-3 last:border-b">
							<AccordionTrigger className="py-3 hover:no-underline">
								<span className="flex items-center gap-2 text-sm font-medium">
									<McpClientIcon guide={guide} size={18} />
									{guide.label}
								</span>
							</AccordionTrigger>
							<AccordionContent>
								<ClientGuidePanel guide={guide} source={source} />
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</section>

			<aside className="space-y-5 border-t bg-muted/25 p-5 md:border-t-0 md:border-l sm:p-6" aria-label="MCP capabilities">
				<McpToolsSection />

				<div className="space-y-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
					<p>Covers native Dashboard Icons. External sources are coming soon.</p>
					<div className="flex flex-wrap gap-x-4 gap-y-2">
						<Link
							href={MCP_DOCS_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
						>
							Full docs
							<ExternalLink className="h-3 w-3" />
						</Link>
						<Link
							href={MCP_INTRO_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
						>
							What is MCP?
							<ExternalLink className="h-3 w-3" />
						</Link>
					</div>
				</div>
			</aside>
		</div>
	)
}
