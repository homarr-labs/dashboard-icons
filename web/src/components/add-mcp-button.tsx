"use client"

import posthog from "posthog-js"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { McpSetupSource } from "@/lib/mcp-setup-config"
import { cn } from "@/lib/utils"
import { McpSetupDialogContent } from "./mcp-setup-dialog-content"
import { Badge } from "./ui/badge"

// LobeHub external icon: https://dashboardicons.com/icons/external/mcp
const LOBEHUB_MCP_PNG = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest"
const MCP_ICON_LIGHT_URL = `${LOBEHUB_MCP_PNG}/light/mcp.png`
const MCP_ICON_DARK_URL = `${LOBEHUB_MCP_PNG}/dark/mcp.png`

function McpIcon({ size = 16, className }: { size?: number; className?: string }) {
	const imageClassName = cn("shrink-0 object-contain", className)

	return (
		<>
			<UnoptimizedImage src={MCP_ICON_LIGHT_URL} alt="" width={size} height={size} className={cn(imageClassName, "dark:hidden")} />
			<UnoptimizedImage src={MCP_ICON_DARK_URL} alt="" width={size} height={size} className={cn(imageClassName, "hidden dark:block")} />
		</>
	)
}

interface McpSetupTriggerProps {
	source: McpSetupSource
	showBadge?: boolean
	className?: string
}

interface AddMcpButtonProps extends McpSetupTriggerProps {
	size?: "sm" | "default" | "lg"
}

function useDialogOpenHandler(source: McpSetupSource) {
	return (open: boolean) => {
		if (open) {
			posthog?.capture("mcp_setup_opened", { source })
		}
	}
}

function McpSetupDialog({ source, trigger }: McpSetupTriggerProps & { trigger: ReactNode }) {
	const handleOpenChange = useDialogOpenHandler(source)

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-4xl">
				<DialogHeader className="border-b bg-muted/30 px-5 py-4 pr-14 text-left sm:px-6">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
							<McpIcon size={22} />
						</div>
						<div className="min-w-0 space-y-1">
							<DialogTitle className="text-lg leading-tight sm:text-xl">Connect Dashboard Icons</DialogTitle>
							<DialogDescription className="max-w-2xl leading-relaxed">
								Search icons and resolve CDN URLs without leaving your AI client.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>
				<McpSetupDialogContent source={source} />
			</DialogContent>
		</Dialog>
	)
}

export function AddMcpButton({ size = "default", className, source, showBadge = true }: AddMcpButtonProps) {
	return (
		<div className={cn("relative inline-flex", className)}>
			<McpSetupDialog
				source={source}
				trigger={
					<Button variant="outline" size={size} className="w-full shadow-sm cursor-pointer" data-testid="mcp-setup-trigger">
						<McpIcon size={16} />
						<span className="hidden sm:inline">Add to MCP client</span>
						<span className="sm:hidden">MCP setup</span>
					</Button>
				}
			/>
			{showBadge ? (
				<Badge
					variant="default"
					className="absolute -top-2 -right-2 h-5 px-1.5 text-[10px] font-bold bg-primary text-primary-foreground shadow-md pointer-events-none"
				>
					NEW
				</Badge>
			) : null}
		</div>
	)
}
