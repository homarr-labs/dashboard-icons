"use client"

import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Clock, GitPullRequestArrow, RefreshCw, XCircle } from "lucide-react"
import * as React from "react"
import { LoginModalContent } from "@/components/login-modal"
import { SubmissionsDataTable } from "@/components/submissions-data-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import {
	useApproveSubmission,
	useAuth,
	useBulkTriggerWorkflow,
	useRejectSubmission,
	useSubmissions,
	useTriggerWorkflow,
} from "@/hooks/use-submissions"

export default function DashboardPage() {
	const isMobile = useIsMobile()
	const queryClient = useQueryClient()

	// Fetch auth status
	const { data: auth, isLoading: authLoading } = useAuth()

	// Fetch submissions
	const { data: submissions = [], isLoading: submissionsLoading, error: submissionsError, refetch } = useSubmissions()

	// Mutations
	const approveMutation = useApproveSubmission()
	const rejectMutation = useRejectSubmission()
	const workflowMutation = useTriggerWorkflow()
	const bulkWorkflowMutation = useBulkTriggerWorkflow()

	// Track workflow URL for showing link after trigger
	const [workflowUrl, setWorkflowUrl] = React.useState<string | undefined>()

	// Approval dialog state
	const [approveDialogOpen, setApproveDialogOpen] = React.useState(false)
	const [approvingSubmissionId, setApprovingSubmissionId] = React.useState<string | null>(null)
	const [approveAdminComment, setApproveAdminComment] = React.useState("")

	// Rejection dialog state
	const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
	const [rejectingSubmissionId, setRejectingSubmissionId] = React.useState<string | null>(null)
	const [adminComment, setAdminComment] = React.useState("")

	const isLoading = authLoading || submissionsLoading
	const isAuthenticated = auth?.isAuthenticated ?? false
	const isAdmin = auth?.isAdmin ?? false
	const currentUserId = auth?.userId ?? ""

	const stats = React.useMemo(() => {
		const pending = submissions.filter((s) => s.status === "pending").length
		const approved = submissions.filter((s) => s.status === "approved").length
		const rejected = submissions.filter((s) => s.status === "rejected").length
		const added = submissions.filter((s) => s.status === "added_to_collection").length
		return { pending, approved, rejected, added, total: submissions.length }
	}, [submissions])

	const handleApprove = (submissionId: string) => {
		setApprovingSubmissionId(submissionId)
		setApproveAdminComment("")
		setApproveDialogOpen(true)
	}

	const handleReject = (submissionId: string) => {
		setRejectingSubmissionId(submissionId)
		setAdminComment("")
		setRejectDialogOpen(true)
	}

	const handleTriggerWorkflow = (submissionId: string) => {
		workflowMutation.mutate(
			{ submissionId },
			{
				onSuccess: (data) => {
					setWorkflowUrl(data.workflowUrl)
				},
			},
		)
	}

	const handleBulkTriggerWorkflow = (submissionIds: string[]) => {
		bulkWorkflowMutation.mutate(
			{ submissionIds },
			{
				onSuccess: (data) => {
					setWorkflowUrl(data.workflowUrl)
				},
			},
		)
	}

	const handleRejectSubmit = () => {
		if (rejectingSubmissionId) {
			rejectMutation.mutate(
				{
					submissionId: rejectingSubmissionId,
					adminComment: adminComment.trim() || undefined,
				},
				{
					onSuccess: () => {
						setRejectDialogOpen(false)
						setRejectingSubmissionId(null)
						setAdminComment("")
					},
				},
			)
		}
	}

	const handleRejectDialogClose = () => {
		setRejectDialogOpen(false)
		setRejectingSubmissionId(null)
		setAdminComment("")
	}

	const handleApproveSubmit = () => {
		if (approvingSubmissionId) {
			approveMutation.mutate(
				{
					submissionId: approvingSubmissionId,
					adminComment: approveAdminComment.trim() || undefined,
				},
				{
					onSuccess: () => {
						setApproveDialogOpen(false)
						setApprovingSubmissionId(null)
						setApproveAdminComment("")
					},
				},
			)
		}
	}

	const handleApproveDialogClose = () => {
		setApproveDialogOpen(false)
		setApprovingSubmissionId(null)
		setApproveAdminComment("")
	}

	// Not authenticated
	if (!authLoading && !isAuthenticated) {
		return (
			<main className="container mx-auto pt-6 sm:pt-12 pb-14 px-4 sm:px-6 lg:px-8 flex justify-center">
				<Card className="bg-background/50 border shadow-lg w-full max-w-md">
					<CardContent className="pt-6 sm:pt-8 pb-6 px-4 sm:px-6">
						<LoginModalContent
							onSuccess={() => {
								queryClient.invalidateQueries({ queryKey: ["auth"] })
								queryClient.invalidateQueries({ queryKey: ["submissions"] })
							}}
						/>
					</CardContent>
				</Card>
			</main>
		)
	}

	// Loading state
	if (isLoading) {
		return (
			<main className="container mx-auto pt-6 sm:pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border shadow-lg">
					<CardHeader>
						<div className="space-y-2">
							<Skeleton className="h-8 w-48 sm:w-64" />
							<Skeleton className="h-4 w-full max-w-96" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<Skeleton className="h-10 w-full" />
							<div className="space-y-2">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						</div>
					</CardContent>
				</Card>
			</main>
		)
	}

	// Error state
	if (submissionsError) {
		return (
			<main className="container mx-auto pt-6 sm:pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border shadow-lg">
					<CardHeader>
						<CardTitle>Submissions Dashboard</CardTitle>
						<CardDescription>
							{isAdmin ? "Review and manage all icon submissions." : "View your icon submissions and track their status."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error loading submissions</AlertTitle>
							<AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
								<span>Failed to load submissions. Please try again.</span>
								<Button variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
									<RefreshCw className="h-4 w-4 mr-2" />
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</main>
		)
	}

	// Success state
	return (
		<>
			<main className="container mx-auto pt-6 sm:pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border-none shadow-lg">
					<CardHeader className="space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div>
								<CardTitle className="text-xl sm:text-2xl">Submissions Dashboard</CardTitle>
								<CardDescription className="mt-1">
									{isAdmin
										? `Review and manage all icon submissions. ${isMobile ? "Tap" : "Click on a row"} to see details.`
										: "View your icon submissions and track their status."}
								</CardDescription>
							</div>
							<Button variant="outline" size="sm" className="w-fit shrink-0" onClick={() => refetch()}>
								<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
								Refresh
							</Button>
						</div>
						{stats.total > 0 && (
							<div className="flex flex-wrap gap-2">
								{stats.pending > 0 && (
									<Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium border-yellow-500/30 text-yellow-700 dark:text-yellow-300 bg-yellow-500/5">
										<Clock className="h-3 w-3" />
										{stats.pending} Pending
									</Badge>
								)}
								{stats.approved > 0 && (
									<Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium border-green-500/30 text-green-700 dark:text-green-300 bg-green-500/5">
										<CheckCircle2 className="h-3 w-3" />
										{stats.approved} Approved
									</Badge>
								)}
								{stats.added > 0 && (
									<Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/5">
										<GitPullRequestArrow className="h-3 w-3" />
										{stats.added} In Collection
									</Badge>
								)}
								{stats.rejected > 0 && (
									<Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/5">
										<XCircle className="h-3 w-3" />
										{stats.rejected} Rejected
									</Badge>
								)}
							</div>
						)}
					</CardHeader>
					<CardContent>
						<SubmissionsDataTable
							data={submissions}
							isAdmin={isAdmin}
							currentUserId={currentUserId}
							onApprove={handleApprove}
							onReject={handleReject}
							onTriggerWorkflow={handleTriggerWorkflow}
							onBulkTriggerWorkflow={handleBulkTriggerWorkflow}
							isApproving={approveMutation.isPending}
							isRejecting={rejectMutation.isPending}
							isTriggeringWorkflow={workflowMutation.isPending}
							isBulkTriggeringWorkflow={bulkWorkflowMutation.isPending}
							workflowUrl={workflowUrl}
						/>
					</CardContent>
				</Card>
			</main>

			{isMobile ? (
				<Drawer open={approveDialogOpen} onOpenChange={handleApproveDialogClose}>
					<DrawerContent>
						<DrawerHeader className="text-left">
							<DrawerTitle>Approve Submission</DrawerTitle>
							<DrawerDescription>Optional: add a note for the submitter. This will appear in the approval email.</DrawerDescription>
						</DrawerHeader>
						<div className="space-y-4 px-4 pb-2">
							<div className="space-y-2">
								<Label htmlFor="approve-admin-comment">Admin Comment</Label>
								<Textarea
									id="approve-admin-comment"
									placeholder="Add an optional note for the approval email..."
									value={approveAdminComment}
									onChange={(e) => setApproveAdminComment(e.target.value)}
									rows={4}
								/>
							</div>
						</div>
						<DrawerFooter>
							<Button onClick={handleApproveSubmit} disabled={approveMutation.isPending}>
								{approveMutation.isPending ? "Approving..." : "Approve Submission"}
							</Button>
							<DrawerClose asChild>
								<Button variant="outline" disabled={approveMutation.isPending}>Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={approveDialogOpen} onOpenChange={handleApproveDialogClose}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Approve Submission</DialogTitle>
							<DialogDescription>Optional: add a note for the submitter. This will appear in the approval email.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="approve-admin-comment">Admin Comment</Label>
								<Textarea
									id="approve-admin-comment"
									placeholder="Add an optional note for the approval email..."
									value={approveAdminComment}
									onChange={(e) => setApproveAdminComment(e.target.value)}
									rows={4}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleApproveDialogClose} disabled={approveMutation.isPending}>
								Cancel
							</Button>
							<Button onClick={handleApproveSubmit} disabled={approveMutation.isPending}>
								{approveMutation.isPending ? "Approving..." : "Approve Submission"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{isMobile ? (
				<Drawer open={rejectDialogOpen} onOpenChange={handleRejectDialogClose}>
					<DrawerContent>
						<DrawerHeader className="text-left">
							<DrawerTitle>Reject Submission</DrawerTitle>
							<DrawerDescription>
								Please provide a reason for rejecting this submission. This comment will be visible to the submitter.
							</DrawerDescription>
						</DrawerHeader>
						<div className="space-y-4 px-4 pb-2">
							<div className="space-y-2">
								<Label htmlFor="admin-comment">Admin Comment</Label>
								<Textarea
									id="admin-comment"
									placeholder="Enter rejection reason..."
									value={adminComment}
									onChange={(e) => setAdminComment(e.target.value)}
									rows={4}
								/>
							</div>
						</div>
						<DrawerFooter>
							<Button variant="destructive" onClick={handleRejectSubmit} disabled={rejectMutation.isPending}>
								{rejectMutation.isPending ? "Rejecting..." : "Reject Submission"}
							</Button>
							<DrawerClose asChild>
								<Button variant="outline" disabled={rejectMutation.isPending}>Cancel</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={rejectDialogOpen} onOpenChange={handleRejectDialogClose}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Reject Submission</DialogTitle>
							<DialogDescription>
								Please provide a reason for rejecting this submission. This comment will be visible to the submitter.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="admin-comment">Admin Comment</Label>
								<Textarea
									id="admin-comment"
									placeholder="Enter rejection reason..."
									value={adminComment}
									onChange={(e) => setAdminComment(e.target.value)}
									rows={4}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleRejectDialogClose} disabled={rejectMutation.isPending}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleRejectSubmit} disabled={rejectMutation.isPending}>
								{rejectMutation.isPending ? "Rejecting..." : "Reject Submission"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
