"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { pb } from "@/lib/pb"

interface UserDisplayProps {
	userId?: string
	displayName: string
	onClick?: (userId: string, displayName: string) => void
	size?: "sm" | "md" | "lg"
	showAvatar?: boolean
	avatar?: string
}

const sizeClasses = {
	sm: "h-6 w-6",
	md: "h-8 w-8",
	lg: "h-10 w-10",
}

const textSizeClasses = {
	sm: "text-xs",
	md: "text-sm",
	lg: "text-sm",
}

export function UserDisplay({ userId, avatar, displayName, onClick, size = "sm", showAvatar = true }: UserDisplayProps) {
	// Avatar URL will attempt to load from PocketBase
	// If it doesn't exist, the AvatarFallback will display instead
	const avatarUrl = userId ? `${pb.baseURL}/api/files/_pb_users_auth_/${userId}/${avatar}?thumb=100x100` : undefined

	return (
		<div className="flex items-center gap-2 ">
			{showAvatar && (
				<Avatar className={sizeClasses[size]}>
					{avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
					<AvatarFallback className={textSizeClasses[size]}>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
			)}
			{onClick && userId ? (
				<Button
					variant="link"
					className={`h-auto p-0 ${textSizeClasses[size]} hover:underline`}
					onClick={(e) => {
						e.stopPropagation()
						onClick(userId, displayName)
					}}
				>
					{displayName}
				</Button>
			) : (
				<span className={`${textSizeClasses[size]}`}>{displayName}</span>
			)}
		</div>
	)
}
