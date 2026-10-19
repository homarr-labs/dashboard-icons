"use client"

import {
	Calendar,
	Check,
	Download,
	ExternalLink,
	Eye,
	FileType,
	FolderOpen,
	Github,
	MessageSquare,
	Palette,
	Tag,
	User as UserIcon,
	X,
} from "lucide-react"
import Link from "next/link"
import { MagicCard } from "@/components/magicui/magic-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { UserDisplay } from "@/components/user-display"
import { VariantPreview } from "@/components/variant-preview"
import { pb, type Submission, type User } from "@/lib/pb"
import { labelledAssets, variantKind } from "@/lib/submission-variants"
import { formatIconName } from "@/lib/utils"
import type { Icon } from "@/types/icons"

// Utility function to get display name with priority: username > email > created_by field
const getDisplayName = (submission: Submission, expandedData?: { created_by: User; approved_by: User }): string => {
	// Check if we have expanded user data
	if (expandedData?.created_by) {
		const user = expandedData.created_by

		// Priority: username > email
		if (user.username) {
			return user.username
		}
		if (user.email) {
			return user.email
		}
	}

	// Fallback to created_by field (could be user ID or username)
	return submission.created_by
}

interface SubmissionDetailsProps {
	submission: Submission
	isAdmin: boolean
	onUserClick?: (userId: string, displayName: string) => void
	onApprove?: () => void
	onReject?: () => void
	onTriggerWorkflow?: () => void
	isApproving?: boolean
	isRejecting?: boolean
	isTriggeringWorkflow?: boolean
	workflowUrl?: string
}

export function SubmissionDetails({
	submission,
	isAdmin,
	onUserClick,
	onApprove,
	onReject,
	onTriggerWorkflow,
	isApproving,
	isRejecting,
	isTriggeringWorkflow,
	workflowUrl,
}: SubmissionDetailsProps) {
	const expandedData = submission.expand
	const displayName = getDisplayName(submission, expandedData)

	// Sanitize extras to ensure we have safe defaults
	const sanitizedExtras = {
		base: submission.extras?.base || "svg",
		aliases: submission.extras?.aliases || [],
		categories: submission.extras?.categories || [],
		colors: submission.extras?.colors || null,
		wordmark: submission.extras?.wordmark || null,
	}

	const formattedCreated = new Date(submission.created).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

	const formattedUpdated = new Date(submission.updated).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

	// Create a mock Icon object for the IconCard component
	const _mockIconData: Icon = {
		base: sanitizedExtras.base,
		aliases: sanitizedExtras.aliases,
		categories: sanitizedExtras.categories,
		update: {
			timestamp: submission.updated,
			author: {
				id: 1,
				name: displayName,
			},
		},
		colors: sanitizedExtras.colors
			? {
					dark: sanitizedExtras.colors.dark,
					light: sanitizedExtras.colors.light,
				}
			: undefined,
		wordmark: sanitizedExtras.wordmark
			? {
					default: sanitizedExtras.wordmark.default,
					dark: sanitizedExtras.wordmark.dark,
					light: sanitizedExtras.wordmark.light,
				}
			: undefined,
	}

	const handleDownload = async (url: string, filename: string) => {
		try {
			const response = await fetch(url)
			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = blobUrl
			link.download = filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
		} catch (error) {
			console.error("Download error:", error)
		}
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{/* Left Column - Assets Preview */}
			<div className="lg:col-span-1">
				<Card className="h-full bg-background/50 border">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<FileType className="w-5 h-5" />
							Assets Preview
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="space-y-4">
							{labelledAssets(submission.extras, submission.assets).map(({ file, variant }, index) => {
								const kind = variant ? variantKind(variant) : null
								const label = kind?.label ?? "Unlabelled asset"
								const url = `${pb.baseURL}/api/files/submissions/${submission.id}/${file}`
								return (
									<MagicCard key={file} className="p-0 rounded-md">
										<div className="flex items-start justify-between gap-2 p-3 pb-2">
											<div className="min-w-0">
												<p className="break-all font-medium text-sm">{label}</p>
												<p className="text-muted-foreground text-xs">{kind?.description ?? "Not tagged as a Variant"}</p>
											</div>
											<div className="flex shrink-0 gap-1">
												<Button
													size="icon"
													variant="secondary"
													className="size-11"
													aria-label={`Open ${label} original`}
													onClick={(e) => {
														e.stopPropagation()
														window.open(url, "_blank")
													}}
												>
													<ExternalLink className="size-3.5" />
												</Button>
												<Button
													size="icon"
													variant="secondary"
													className="size-11"
													aria-label={`Download ${label}`}
													onClick={(e) => {
														e.stopPropagation()
														handleDownload(url, `${submission.name}-${index + 1}.${file.split(".").pop()}`)
													}}
												>
													<Download className="size-3.5" />
												</Button>
											</div>
										</div>
										<VariantPreview
											src={url}
											alt={`${submission.name}, ${label}`}
											background={kind?.background ?? "any"}
											className="mx-3 mb-3 h-32 sm:h-40"
										/>
									</MagicCard>
								)
							})}
							{submission.assets.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No assets available</div>}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Middle Column - Submission Details */}
			<div className="lg:col-span-2">
				<Card className="h-full bg-background/50 border">
					<CardHeader className="pb-3">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<Tag className="w-5 h-5" />
								Submission Details
							</CardTitle>
							<div className="flex flex-wrap gap-2">
								<Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
									<Link href={`/community/submissions/${submission.id}`} target="_blank" rel="noopener noreferrer">
										<Eye className="w-4 h-4 mr-2" />
										Preview
									</Link>
								</Button>
								{(onApprove || onReject) && (
									<>
										{onApprove && (
											<Button
												size="sm"
												color="green"
												variant="outline"
												className="flex-1 sm:flex-none"
												onClick={(e) => {
													e.stopPropagation()
													onApprove()
												}}
												disabled={isApproving || isRejecting}
											>
												<Check className="w-4 h-4 mr-2" />
												{isApproving ? "Approving..." : "Approve"}
											</Button>
										)}
										{onReject && (
											<Button
												size="sm"
												color="red"
												variant="destructive"
												className="flex-1 sm:flex-none"
												onClick={(e) => {
													e.stopPropagation()
													onReject()
												}}
												disabled={isApproving || isRejecting}
											>
												<X className="w-4 h-4 mr-2" />
												{isRejecting ? "Rejecting..." : "Reject"}
											</Button>
										)}
									</>
								)}
								{onTriggerWorkflow && submission.status === "approved" && isAdmin && (
									<Button
										size="sm"
										className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
										onClick={(e) => {
											e.stopPropagation()
											onTriggerWorkflow()
										}}
										disabled={isTriggeringWorkflow}
									>
										<Github className="w-4 h-4 mr-2" />
										{isTriggeringWorkflow ? "Starting..." : "Run GitHub CI"}
									</Button>
								)}
								{workflowUrl && (
									<Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
										<a href={workflowUrl} target="_blank" rel="noopener noreferrer">
											<ExternalLink className="w-4 h-4 mr-2" />
											View Workflow
										</a>
									</Button>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
									<FileType className="w-4 h-4" />
									Icon Name
								</h3>
								<p className="text-lg font-medium capitalize">{formatIconName(submission.name)}</p>
								<p className="text-sm text-muted-foreground mt-1">Filename: {submission.name}</p>
							</div>
							{submission.target_submission && (
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2">Proposed update to submission</h3>
									<Link href={`/community/submissions/${submission.target_submission}`} className="text-sm font-mono underline">
										{submission.target_submission}
									</Link>
								</div>
							)}

							{submission.description?.trim() && (
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<MessageSquare className="w-4 h-4" />
										Description
									</h3>
									<p className="text-sm whitespace-pre-wrap">{submission.description}</p>
								</div>
							)}

							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
									<FileType className="w-4 h-4" />
									Base Format
								</h3>
								<Badge variant="outline" className="uppercase font-mono">
									{sanitizedExtras.base}
								</Badge>
							</div>

							{sanitizedExtras.colors && Object.keys(sanitizedExtras.colors).length > 0 && (
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<Palette className="w-4 h-4" />
										Color Variants
									</h3>
									<div className="space-y-2">
										{sanitizedExtras.colors.dark && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground min-w-12">Dark:</span>
												<code className="text-xs bg-muted px-2 py-1 rounded font-mono">{sanitizedExtras.colors.dark}</code>
											</div>
										)}
										{sanitizedExtras.colors.light && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground min-w-12">Light:</span>
												<code className="text-xs bg-muted px-2 py-1 rounded font-mono">{sanitizedExtras.colors.light}</code>
											</div>
										)}
									</div>
								</div>
							)}

							{sanitizedExtras.wordmark && Object.keys(sanitizedExtras.wordmark).length > 0 && (
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<FileType className="w-4 h-4" />
										Wordmark Variants
									</h3>
									<div className="space-y-2">
										{sanitizedExtras.wordmark.default && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground min-w-12">Colour:</span>
												<code className="text-xs bg-muted px-2 py-1 rounded font-mono">{sanitizedExtras.wordmark.default}</code>
											</div>
										)}
										{sanitizedExtras.wordmark.dark && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground min-w-12">Dark:</span>
												<code className="text-xs bg-muted px-2 py-1 rounded font-mono">{sanitizedExtras.wordmark.dark}</code>
											</div>
										)}
										{sanitizedExtras.wordmark.light && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground min-w-12">Light:</span>
												<code className="text-xs bg-muted px-2 py-1 rounded font-mono">{sanitizedExtras.wordmark.light}</code>
											</div>
										)}
									</div>
								</div>
							)}

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<UserIcon className="w-4 h-4" />
										Submitted By
									</h3>
									<UserDisplay
										userId={submission.created_by}
										avatar={expandedData.created_by.avatar}
										displayName={displayName}
										onClick={onUserClick}
										size="md"
									/>
								</div>

								{submission.approved_by && (
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
											<UserIcon className="w-4 h-4" />
											{submission.status === "approved" ? "Approved By" : "Reviewed By"}
										</h3>

										<UserDisplay
											userId={expandedData.approved_by.id}
											displayName={expandedData.approved_by.username}
											avatar={expandedData.approved_by.avatar}
											size="md"
										/>
									</div>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<Calendar className="w-4 h-4" />
										Created
									</h3>
									<p className="text-sm">{formattedCreated}</p>
								</div>

								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
										<Calendar className="w-4 h-4" />
										Last Updated
									</h3>
									<p className="text-sm">{formattedUpdated}</p>
								</div>
							</div>

							{submission.admin_comment?.trim() && (
								<Alert variant={submission.status === "rejected" ? "destructive" : "default"}>
									<MessageSquare className="h-4 w-4" />
									<AlertTitle>Admin Comment</AlertTitle>
									<AlertDescription className="mt-2 whitespace-pre-wrap">{submission.admin_comment}</AlertDescription>
								</Alert>
							)}

							<Separator />

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
										<FolderOpen className="w-4 h-4" />
										Categories
									</h3>
									{sanitizedExtras.categories.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{sanitizedExtras.categories.map((category) => (
												<Badge key={category} variant="outline" className="border-primary/20 hover:border-primary">
													{category
														.split("-")
														.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
														.join(" ")}
												</Badge>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">No categories assigned</p>
									)}
								</div>

								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
										<Tag className="w-4 h-4" />
										Aliases
									</h3>
									{sanitizedExtras.aliases.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{sanitizedExtras.aliases.map((alias) => (
												<Badge key={alias} variant="outline" className="text-xs font-mono">
													{alias}
												</Badge>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">No aliases assigned</p>
									)}
								</div>
							</div>

							{isAdmin && (
								<div>
									<h3 className="text-sm font-semibold text-muted-foreground mb-2">Submission ID</h3>
									<code className="bg-muted px-2 py-1 rounded block break-all font-mono">{submission.id}</code>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
