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
	iconName?: string
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

function McpSetupDialog({ source, iconName, trigger }: McpSetupTriggerProps & { trigger: ReactNode }) {
	const handleOpenChange = useDialogOpenHandler(source)

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="space-y-1">
					<DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
						<McpIcon size={20} />
						Connect Dashboard Icons to your AI assistant
					</DialogTitle>
					<DialogDescription>Search and fetch icons from Cursor, Claude Desktop, and other MCP-compatible clients.</DialogDescription>
				</DialogHeader>
				<McpSetupDialogContent source={source} iconName={iconName} />
			</DialogContent>
		</Dialog>
	)
}

export function AddMcpButton({ size = "default", className, source, iconName, showBadge = true }: AddMcpButtonProps) {
	return (
		<div className={cn("relative inline-flex", className)}>
			<McpSetupDialog
				source={source}
				iconName={iconName}
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

export function AddMcpLink({ source, iconName, className }: McpSetupTriggerProps) {
	return (
		<McpSetupDialog
			source={source}
			iconName={iconName}
			trigger={
				<button type="button" className={cn("text-primary underline-offset-4 hover:underline cursor-pointer", className)}>
					Set up MCP
				</button>
			}
		/>
	)
}
