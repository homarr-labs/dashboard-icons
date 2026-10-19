import { CheckCircle2, Clock, Library, Users, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { IconNameOption, IconSource } from "@/hooks/use-submissions"
import { cn } from "@/lib/utils"

export type { IconNameOption, IconSource, IconStatus } from "@/hooks/use-submissions"

export const getStatusColor = (status: string) => {
	switch (status) {
		case "approved":
			return "bg-info/10 text-info font-bold border-info/20"
		case "rejected":
			return "bg-destructive/10 text-destructive border-destructive/20"
		case "pending":
			return "bg-warning/10 text-warning border-warning/20"
		case "added_to_collection":
			return "bg-success/10 text-success border-success/20"
		default:
			return "bg-muted text-muted-foreground border-border"
	}
}

export const getStatusDisplayName = (status: string) => {
	switch (status) {
		case "pending":
			return "Pending"
		case "approved":
			return "Approved"
		case "rejected":
			return "Rejected"
		case "added_to_collection":
			return "Added to Collection"
		default:
			return status
	}
}

interface StatusBadgeProps {
	icon?: IconNameOption
	status?: string
	showCollectionStatus?: boolean
	showIcon?: boolean
	className?: string
}

export function StatusBadge({ icon, status: propStatus, showCollectionStatus = false, showIcon = true, className }: StatusBadgeProps) {
	const source = icon?.source || "community"
	const status = propStatus || icon?.status || "pending"

	if (source === "collection") {
		if (!showCollectionStatus) return null
		return (
			<Badge variant="outline" className={cn("text-xs bg-success/10 text-success border-success/20", className)}>
				{showIcon && <Library className="h-3 w-3 mr-1" />}
				Collection
			</Badge>
		)
	}

	const colorClass = getStatusColor(status)
	const displayName = getStatusDisplayName(status)

	let Icon = Users
	if (status === "pending") Icon = Clock
	else if (status === "approved") Icon = CheckCircle2
	else if (status === "rejected") Icon = XCircle
	else if (status === "added_to_collection") Icon = Library

	if (status === "added_to_collection" && !showCollectionStatus) return null

	return (
		<Badge variant="outline" className={cn("text-xs", colorClass, className)}>
			{showIcon && <Icon className="h-3 w-3 mr-1" />}
			{displayName}
		</Badge>
	)
}

interface SourceBadgeProps {
	source: IconSource
	showIcon?: boolean
	className?: string
}

export function SourceBadge({ source, showIcon = true, className }: SourceBadgeProps) {
	if (source === "collection") {
		return (
			<Badge variant="outline" className={cn("text-xs bg-success/10 text-success border-success/20", className)}>
				{showIcon && <Library className="h-3 w-3 mr-1" />}
				Collection
			</Badge>
		)
	}

	return (
		<Badge variant="outline" className={cn("text-xs bg-community/10 text-community border-community/20", className)}>
			{showIcon && <Users className="h-3 w-3 mr-1" />}
			Community
		</Badge>
	)
}
