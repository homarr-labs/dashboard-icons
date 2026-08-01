"use client"

import { Check, Copy, ExternalLink, ImageIcon, Link2, type LucideIcon, Plug, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import { useState } from "react"
import { type McpCodeLanguage, McpHighlightedCode } from "@/components/mcp-highlighted-code"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { REPO_PATH, WEB_URL } from "@/constants"
import { getIconUrlExampleJson, MCP_CLIENT_GUIDES, MCP_TOOLS, type McpClientGuide, type McpSetupSource } from "@/lib/mcp-setup-config"
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
		<div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-transparent">
			<div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5">
				<div className="space-y-0.5">
					<h3 className="text-sm font-semibold tracking-tight">Tools</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">Search and fetch icons programmatically from your MCP client.</p>
				</div>
				<Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-[10px] font-medium tabular-nums">
					{MCP_TOOLS.length}
				</Badge>
			</div>

			<ul className="divide-y divide-border/40">
				{MCP_TOOLS.map((tool) => {
					const Icon = MCP_TOOL_ICONS[tool.name]

					return (
						<li key={tool.name} className="group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/25 sm:items-center">
							<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/90 shadow-sm ring-1 ring-border/50 transition-colors group-hover:ring-primary/20">
								<Icon className="size-3.5 text-primary/75" aria-hidden />
							</div>
							<div className="min-w-0 flex-1 space-y-0.5">
								<code className="block font-mono text-xs font-semibold text-foreground">{tool.name}</code>
								<p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
							</div>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

export function McpSetupDialogContent({ source, iconName }: { source: McpSetupSource; iconName?: string }) {
	return (
		<div className="space-y-5">
			<p className="text-sm text-muted-foreground leading-relaxed">
				The Dashboard Icons MCP server provides AI assistants with programmatic access to search icons, fetch metadata, and resolve CDN URLs
				over HTTP. Learn more about{" "}
				<Link href={MCP_INTRO_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
					Model Context Protocol
				</Link>
				.
			</p>

			<div className="space-y-3">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Setup</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Cursor supports HTTP MCP directly. Other clients below use mcp-remote to bridge HTTP to stdio when needed.
					</p>
				</div>

				<Accordion type="single" collapsible defaultValue="cursor" className="w-full">
					{MCP_CLIENT_GUIDES.map((guide) => (
						<AccordionItem key={guide.id} value={guide.id}>
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
			</div>

			<Separator />

			<McpToolsSection />

			{iconName ? (
				<>
					<Separator />
					<CodeBlock
						value={getIconUrlExampleJson(iconName)}
						fileLabel="Try with this icon"
						language="json"
						onCopy={() => {
							posthog?.capture("mcp_config_copied", { source, client: "example" })
						}}
					/>
				</>
			) : null}

			<Separator />

			<p className="text-xs text-muted-foreground">
				Covers native icons from our collection. External sources coming soon.{" "}
				<Link
					href={MCP_DOCS_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-primary hover:underline"
				>
					Full docs
					<ExternalLink className="h-3 w-3" />
				</Link>
			</p>
		</div>
	)
}
