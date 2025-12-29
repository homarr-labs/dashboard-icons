import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { triggerAddIconWorkflow, triggerBulkAddIconWorkflow } from "@/app/actions/github"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { getAllIcons } from "@/lib/api"
import { pb, type Submission } from "@/lib/pb"

// Query key factory
export const submissionKeys = {
	all: ["submissions"] as const,
	lists: () => [...submissionKeys.all, "list"] as const,
	list: (filters?: Record<string, any>) => [...submissionKeys.lists(), filters] as const,
}

// Fetch all submissions
export function useSubmissions() {
	return useQuery({
		queryKey: submissionKeys.lists(),
		queryFn: async () => {
			const records = await pb.collection("submissions").getFullList<Submission>({
				sort: "-updated",
				expand: "created_by,approved_by",
				requestKey: null,
			})

			if (records.length > 0) {
			}

			return records
		},
	})
}

// Approve submission mutation
export function useApproveSubmission() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (submissionId: string) => {
			return await pb.collection("submissions").update(
				submissionId,
				{
					status: "approved",
					approved_by: pb.authStore.record?.id || "",
				},
				{
					requestKey: null,
				},
			)
		},
		onSuccess: async (_data) => {
			// Invalidate and refetch submissions
			queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })

			// Revalidate Next.js cache for community pages
			await revalidateAllSubmissions()

			toast.success("Submission approved", {
				description: "The submission has been approved successfully",
			})
		},
		onError: (error: any) => {
			console.error("Error approving submission:", error)
			if (!error.message?.includes("autocancelled") && !error.name?.includes("AbortError")) {
				toast.error("Failed to approve submission", {
					description: error.message || "An error occurred",
				})
			}
		},
	})
}

// Reject submission mutation
export function useRejectSubmission() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ submissionId, adminComment }: { submissionId: string; adminComment?: string }) => {
			return await pb.collection("submissions").update(
				submissionId,
				{
					status: "rejected",
					approved_by: pb.authStore.record?.id || "",
					admin_comment: adminComment || "",
				},
				{
					requestKey: null,
				},
			)
		},
		onSuccess: async () => {
			// Invalidate and refetch submissions
			queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })

			// Revalidate Next.js cache for community pages
			await revalidateAllSubmissions()

			toast.success("Submission rejected", {
				description: "The submission has been rejected",
			})
		},
		onError: (error: any) => {
			console.error("Error rejecting submission:", error)
			if (!error.message?.includes("autocancelled") && !error.name?.includes("AbortError")) {
				toast.error("Failed to reject submission", {
					description: error.message || "An error occurred",
				})
			}
		},
	})
}

// Fetch existing icon names for the combobox + the metadata.json file
export function useExistingIconNames() {
	return useQuery({
		queryKey: ["existing-icon-names"],
		queryFn: async () => {
			const records = await pb.collection("community_gallery").getFullList({
				fields: "name",
				sort: "name",
				requestKey: null,
			})

			const metadata = await getAllIcons()
			const metadataNames = Object.keys(metadata)

			const uniqueRecordsNames = Array.from(new Set(records.map((r) => r.name)))
			const uniqueMetadataNames = Array.from(new Set(metadataNames.map((n) => n)))
			const uniqueNames = Array.from(new Set(uniqueRecordsNames.concat(uniqueMetadataNames)))
			return uniqueNames.map((name) => ({
				label: name,
				value: name,
			}))
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false,
	})
}

// Check authentication status
export function useAuth() {
	return useQuery({
		queryKey: ["auth"],
		queryFn: async () => {
			const isValid = pb.authStore.isValid
			const userId = pb.authStore.record?.id

			if (!isValid || !userId) {
				return {
					isAuthenticated: false,
					isAdmin: false,
					userId: "",
				}
			}

			try {
				// Fetch the full user record to get the admin status
				const user = await pb.collection("users").getOne(userId, {
					requestKey: null,
				})

				return {
					isAuthenticated: true,
					isAdmin: user?.admin === true,
					userId: userId,
				}
			} catch (error) {
				console.error("Error fetching user:", error)
				return {
					isAuthenticated: isValid,
					isAdmin: false,
					userId: userId || "",
				}
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false,
	})
}

// Trigger GitHub workflow to add icon to collection
export function useTriggerWorkflow() {
	return useMutation({
		mutationFn: async ({ submissionId, dryRun = false }: { submissionId: string; dryRun?: boolean }) => {
			// Get the auth token from the client-side PocketBase instance
			const authToken = pb.authStore.token
			if (!authToken) {
				throw new Error("Not authenticated")
			}

			const result = await triggerAddIconWorkflow(authToken, submissionId, dryRun)
			if (!result.success) {
				throw new Error(result.error || "Failed to trigger workflow")
			}
			return result
		},
		onSuccess: (data) => {
			toast.success("GitHub workflow triggered", {
				description: "The icon addition workflow has been started",
				action: data.workflowUrl
					? {
							label: "View on GitHub",
							onClick: () => window.open(data.workflowUrl, "_blank"),
						}
					: undefined,
			})
		},
		onError: (error: Error) => {
			console.error("Error triggering workflow:", error)
			toast.error("Failed to trigger workflow", {
				description: error.message || "An error occurred",
			})
		},
	})
}

// Trigger GitHub workflow for multiple submissions (bulk action)
export function useBulkTriggerWorkflow() {
	return useMutation({
		mutationFn: async ({ submissionIds, dryRun = false }: { submissionIds: string[]; dryRun?: boolean }) => {
			const authToken = pb.authStore.token
			if (!authToken) {
				throw new Error("Not authenticated")
			}

			const result = await triggerBulkAddIconWorkflow(authToken, submissionIds, dryRun)
			if (!result.success) {
				throw new Error(result.error || "Failed to trigger workflow")
			}
			return result
		},
		onSuccess: (data) => {
			toast.success(`Workflow triggered for ${data.submissionCount} icon(s)`, {
				description: "All icons will be processed sequentially in a single workflow run.",
				action: data.workflowUrl
					? {
							label: "View on GitHub",
							onClick: () => window.open(data.workflowUrl, "_blank"),
						}
					: undefined,
			})
		},
		onError: (error: Error) => {
			console.error("Error triggering bulk workflow:", error)
			toast.error("Failed to trigger workflow", {
				description: error.message || "An error occurred",
			})
		},
	})
}
