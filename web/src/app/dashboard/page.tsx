"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { ExperimentalWarning } from "@/components/experimental-warning"
import { SubmissionsDataTable } from "@/components/submissions-data-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApproveSubmission, useAuth, useRejectSubmission, useSubmissions } from "@/hooks/use-submissions"

export default function DashboardPage() {
	// Fetch auth status
	const { data: auth, isLoading: authLoading } = useAuth()

	// Fetch submissions
	const { data: submissions = [], isLoading: submissionsLoading, error: submissionsError, refetch } = useSubmissions()

	// Mutations
	const approveMutation = useApproveSubmission()
	const rejectMutation = useRejectSubmission()

	const isLoading = authLoading || submissionsLoading
	const isAuthenticated = auth?.isAuthenticated ?? false
	const isAdmin = auth?.isAdmin ?? false
	const currentUserId = auth?.userId ?? ""

	const handleApprove = (submissionId: string) => {
		approveMutation.mutate(submissionId)
	}

	const handleReject = (submissionId: string) => {
		rejectMutation.mutate(submissionId)
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
		<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
			<ExperimentalWarning message="The submissions dashboard is currently in an experimentation phase. Submissions will not be reviewed or processed at this time. We're gathering feedback to improve the experience." />
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
						isApproving={approveMutation.isPending}
						isRejecting={rejectMutation.isPending}
					/>
				</CardContent>
			</Card>
		</main>
	)
}
