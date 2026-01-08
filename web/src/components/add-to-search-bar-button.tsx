"use client"

import { useState } from "react"
import { Check, Copy, Globe2, Search, Sparkles } from "lucide-react"
import { RainbowButton } from "@/registry/magicui/rainbow-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const SEARCH_SCHEMA = "https://dashboardicons.com/icons?q=%s"

const instructions: Array<{ browser: string; steps: string[] }> = [
	{
		browser: "Chrome",
		steps: [
			"Open Settings → Search engine → Manage search engines and site search",
			"Click Add next to Site search",
			"Name: Dashboard Icons · Shortcut: di (or anything you like)",
			`URL with %s: ${SEARCH_SCHEMA}`,
			"Save, then type your shortcut + Space/Tab in the address bar to search",
		],
	},
	{
		browser: "Firefox",
		steps: [
			"Open Settings → Search",
			"Scroll to Search Shortcuts and click Add",
			"Name: Dashboard Icons · Keyword: di",
			`Search URL: ${SEARCH_SCHEMA}`,
			"Use the keyword + Space, then type your query",
		],
	},
	{
		browser: "Edge",
		steps: [
			"Open Settings → Privacy, search, and services",
			"Under Address bar and search, click Manage search engines",
			"Select Add search engine",
			"Name: Dashboard Icons · Shortcut: di · URL: above schema",
			"Choose the new entry and Set as default or use via shortcut",
		],
	},
	{
		browser: "Safari",
		steps: [
			"Open Settings → Search and enable “Quick Website Search”",
			"Visit dashboardicons.com and run any search once",
			"Soon Safari will suggest “dashboardicons” as a quick search option",
			"Type dashboardicons + Space in the Smart Search field to search directly",
			"If not suggested, add a Shortcut via Settings → Search → Manage Websites",
		],
	},
]

export function AddToSearchBarButton({
	size = "default",
	className,
}: {
	size?: "sm" | "default" | "lg"
	className?: string
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(SEARCH_SCHEMA)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			setCopied(false)
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<RainbowButton
					variant="outline"
					size={size}
					className={cn(
						"shadow-sm px-5 hover:shadow-[0_10px_40px_-20px_rgba(99,102,241,0.6)] active:scale-[0.99]",
						className,
					)}
				>
					<Search className="h-4 w-4" />
					<span className="hidden sm:inline">Add to browser search</span>
					<span className="sm:hidden">Add to search</span>
					<Sparkles className="h-4 w-4 text-primary" />
				</RainbowButton>
			</DialogTrigger>

			<DialogContent className="sm:max-w-xl">
				<DialogHeader className="space-y-1">
					<DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
						<Globe2 className="h-5 w-5 text-primary" />
						Add dashboardicons to your browser search bar
					</DialogTitle>
					<DialogDescription>
						Drop this search URL into your browser&apos;s custom search engines so you can type once and jump straight to the right icon.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 rounded-lg border bg-muted/30 p-3">
					<p className="text-sm font-medium text-muted-foreground">Search URL (schema)</p>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Input readOnly value={SEARCH_SCHEMA} className="font-mono text-xs" />
						<Button
							variant="secondary"
							size="sm"
							className="flex items-center gap-2"
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
				</div>

				<Separator />

				<div className="grid gap-4 sm:grid-cols-2">
					{instructions.map((entry) => (
						<div key={entry.browser} className="rounded-lg border bg-card/50 p-3 shadow-[0_5px_30px_-25px_rgba(0,0,0,0.4)]">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold">{entry.browser}</p>
								<span className="text-[10px] uppercase tracking-wide text-primary/80">1 minute setup</span>
							</div>
							<ol className="mt-2 space-y-1 text-xs text-muted-foreground leading-relaxed">
								{entry.steps.map((step, idx) => (
									<li key={step} className="flex gap-2">
										<span className="font-semibold text-primary">{idx + 1}.</span>
										<span>{step}</span>
									</li>
								))}
							</ol>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}
