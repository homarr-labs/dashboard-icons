"use client"
import {
	CheckCircle2,
	ChevronDown,
	Clock,
	GitPullRequestArrow,
	ImageOff,
	Inbox,
	Library,
	Loader2,
	type LucideIcon,
	RotateCcw,
	Sparkles,
	XCircle,
} from "lucide-react"
import type { ReactNode } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { statusLabels } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type VariantBackground, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export const backdrops: Record<VariantBackground, string> = {
	any: "bg-[repeating-conic-gradient(#e4e4e7_0%_25%,#ffffff_0%_50%)] bg-[length:14px_14px] dark:bg-[repeating-conic-gradient(#27272a_0%_25%,#18181b_0%_50%)]",
	light: "bg-white",
	dark: "bg-zinc-950",
}
export const selectedRing = "ring-2 ring-primary"
export const updateBadge = "border-community/20 bg-community/10 text-community"
export const approveButton =
	"border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success dark:border-success/40 dark:bg-success/10 dark:hover:bg-success/20"
export const rejectButton =
	"border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive dark:border-destructive/40 dark:bg-destructive/10 dark:hover:bg-destructive/20"
export const statusStyles: Record<
	Submission["status"],
	{ Icon: LucideIcon; badge: string; dot: string; text: string; accent: string; tint: string }
> = {
	pending: {
		Icon: Clock,
		badge: "border-warning/20 bg-warning/10 text-warning",
		dot: "bg-warning",
		text: "text-warning",
		accent: "border-l-warning",
		tint: "bg-warning/5",
	},
	approved: {
		Icon: CheckCircle2,
		badge: "border-info/20 bg-info/10 text-info",
		dot: "bg-info",
		text: "text-info",
		accent: "border-l-info",
		tint: "bg-info/5",
	},
	rejected: {
		Icon: XCircle,
		badge: "border-destructive/20 bg-destructive/10 text-destructive",
		dot: "bg-destructive",
		text: "text-destructive",
		accent: "border-l-destructive",
		tint: "bg-destructive/5",
	},
	added_to_collection: {
		Icon: Library,
		badge: "border-success/20 bg-success/10 text-success",
		dot: "bg-success",
		text: "text-success",
		accent: "border-l-success",
		tint: "bg-success/5",
	},
}

export function fileCount(count: number) {
	if (count === 1) return "1 file"
	return `${count} files`
}
export function Time({ value, className }: { value: string; className?: string }) {
	const date = new Date(value)
	const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
	let label = `${Math.floor(minutes / 1440)}d ago`
	if (minutes < 1440) label = `${Math.floor(minutes / 60)}h ago`
	if (minutes < 60) label = `${minutes}m ago`
	if (minutes < 1) label = "Just now"
	return (
		<time
			dateTime={date.toISOString()}
			title={date.toLocaleString()}
			className={cn("shrink-0 whitespace-nowrap text-xs text-muted-foreground", className)}
		>
			{label}
		</time>
	)
}
export function Status({ status, className }: { status: string; className?: string }) {
	const style = statusStyles[status as Submission["status"]]
	return (
		<Badge variant="outline" className={cn(style?.badge, className)}>
			{style && <style.Icon aria-hidden />}
			{statusLabels[status] || status}
		</Badge>
	)
}
export function Kind({ record, className }: { record: Submission; className?: string }) {
	if (record.icon_update || record.target_submission)
		return (
			<Badge variant="outline" className={cn(updateBadge, className)}>
				<GitPullRequestArrow aria-hidden />
				Update proposal
			</Badge>
		)
	return (
		<Badge variant="outline" className={cn("text-muted-foreground", className)}>
			<Sparkles aria-hidden className="text-primary" />
			New icon
		</Badge>
	)
}
export function Round({ round, className }: { round?: number; className?: string }) {
	if ((round || 1) < 2) return null
	return (
		<Badge variant="outline" className={cn("border-info/20 bg-info/10 text-info", className)}>
			<RotateCcw aria-hidden />
			Round {round}
		</Badge>
	)
}
export function Avatar({ name, className }: { name: string; className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold uppercase text-muted-foreground",
				className,
			)}
		>
			{name.slice(0, 1)}
		</span>
	)
}
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<kbd
			className={cn(
				"inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-current/20 bg-current/10 px-1 font-mono text-[10px] font-medium leading-none opacity-80 max-lg:hidden pointer-coarse:hidden",
				className,
			)}
		>
			{children}
		</kbd>
	)
}
export function Thumbnail({ submission, className, large = false }: { submission: Submission; className?: string; large?: boolean }) {
	const [asset] = labelledAssets(submission.extras, submission.assets, submission.name, submission.icon_update)
	let background: VariantBackground = "any"
	if (asset?.variant) background = variantKind(asset.variant).background
	let src = ""
	if (asset && large) src = pb.files.getURL(submission, asset.file)
	if (asset && !large) src = pb.files.getURL(submission, asset.file, { thumb: "100x100" })
	return (
		<span
			className={cn(
				"relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md p-1.5 ring-1 ring-border",
				backdrops[background],
				className,
			)}
		>
			{src && <UnoptimizedImage src={src} alt="" className="max-h-full max-w-full object-contain" />}
			{!src && <ImageOff className="size-4 text-muted-foreground" />}
		</span>
	)
}
export function Empty({
	title,
	children,
	icon: Icon = Inbox,
	tone = "bg-muted text-muted-foreground",
	action,
	className,
}: {
	title: string
	children?: ReactNode
	icon?: LucideIcon
	tone?: string
	action?: ReactNode
	className?: string
}) {
	return (
		<div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
			<span className={cn("flex size-10 items-center justify-center rounded-md border", tone)}>
				<Icon className="size-5" />
			</span>
			<p className="font-semibold">{title}</p>
			{children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
			{action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
		</div>
	)
}
export function Loading() {
	return (
		<output className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
			<Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
			Loading workspace…
		</output>
	)
}
export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
	let message = "Something went wrong. Please try again."
	if (error instanceof Error) message = error.message
	return (
		<Alert variant="destructive" className="m-4 w-auto">
			<XCircle />
			<AlertDescription>
				<p>{message}</p>
				<Button variant="outline" size="sm" className="mt-2" onClick={retry}>
					Try again
				</Button>
			</AlertDescription>
		</Alert>
	)
}
export function LoadMore({ shown, total, loading, onMore }: { shown: number; total: number; loading: boolean; onMore: () => void }) {
	if (shown >= total) return null
	return (
		<div className="flex justify-center p-3">
			<Button variant="outline" size="sm" disabled={loading} onClick={onMore}>
				{loading && <Loader2 className="animate-spin motion-reduce:animate-none" />}
				{!loading && <ChevronDown />}
				Load more
			</Button>
		</div>
	)
}
export function Panel({
	title,
	icon,
	action,
	children,
	className,
}: {
	title: string
	icon?: ReactNode
	action?: ReactNode
	children: ReactNode
	className?: string
}) {
	return (
		<Card className={cn("min-w-0 gap-0 overflow-hidden bg-background/50 py-0", className)}>
			<div className="flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2">
				<h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold [&>svg]:size-4">
					{icon}
					{title}
				</h2>
				{action}
			</div>
			{children}
		</Card>
	)
}
