"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getIconUsageSnippets } from "@/lib/icon-usage"
import { isClipboardAvailable } from "@/lib/svg-color-utils"

export function IconUsageSnippets({ name, url }: { name: string; url: string }) {
	async function copySnippet(label: string, code: string) {
		if (!isClipboardAvailable()) {
			toast.error("Clipboard unavailable. Select and copy the snippet manually.")
			return
		}
		try {
			await navigator.clipboard.writeText(code)
			toast.success(`${label} snippet copied`)
		} catch {
			toast.error("Could not copy. Select and copy the snippet manually.")
		}
	}

	return (
		<div className="min-w-0 divide-y divide-border">
			{getIconUsageSnippets(name, url).map(({ label, description, code }) => (
				<div key={label} className="min-w-0 space-y-2 py-4 first:pt-0 last:pb-0">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-base font-medium">{label}</h3>
						<Button variant="ghost" className="min-h-11 min-w-11 shrink-0" onClick={() => copySnippet(label, code)}>
							<Copy className="size-4" aria-hidden="true" />
							Copy {label}
						</Button>
					</div>
					<p className="text-sm text-foreground">{description}</p>
					<pre className="min-w-0 whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-sm leading-relaxed select-text">
						<code>{code}</code>
					</pre>
				</div>
			))}
		</div>
	)
}
