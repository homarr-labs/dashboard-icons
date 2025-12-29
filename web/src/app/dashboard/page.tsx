"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import * as React from "react"
import { SubmissionsDataTable } from "@/components/submissions-data-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useApproveSubmission, useAuth, useBulkTriggerWorkflow, useRejectSubmission, useSubmissions, useTriggerWorkflow } from "@/hooks/use-submissions"

export default function DashboardPage() {
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

	// Rejection dialog state
	const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
	const [rejectingSubmissionId, setRejectingSubmissionId] = React.useState<string | null>(null)
	const [adminComment, setAdminComment] = React.useState("")

	const isLoading = authLoading || submissionsLoading
	const isAuthenticated = auth?.isAuthenticated ?? false
	const isAdmin = auth?.isAdmin ?? false
	const currentUserId = auth?.userId ?? ""

	const handleApprove = (submissionId: string) => {
		approveMutation.mutate(submissionId)
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

	// Not authenticated
	if (!authLoading && !isAuthenticated) {
		return (
			<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border shadow-lg">
					<CardHeader>
						<CardTitle>Access Denied</CardTitle>
						<CardDescription>You need to be logged in to access the dashboard.</CardDescription>
					</CardHeader>
				</Card>
			</main>
		)
	}

	// Loading state
	if (isLoading) {
		return (
			<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border shadow-lg">
					<CardHeader>
						<div className="space-y-2">
							<Skeleton className="h-8 w-64" />
							<Skeleton className="h-4 w-96" />
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
			<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
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
							<AlertDescription>
								Failed to load submissions. Please try again.
								<Button variant="outline" size="sm" className="ml-4" onClick={() => refetch()}>
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
			<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<Card className="bg-background/50 border-none shadow-lg">
					<CardHeader>
						<CardTitle>Submissions Dashboard</CardTitle>
						<CardDescription>
							{isAdmin
								? "Review and manage all icon submissions. Click on a row to see details."
								: "View your icon submissions and track their status."}
						</CardDescription>
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
		</>
	)
}
