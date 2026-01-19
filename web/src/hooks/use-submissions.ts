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
		mutationFn: async ({ submissionId, adminComment }: { submissionId: string; adminComment?: string }) => {
			return await pb.collection("submissions").update(
				submissionId,
				{
					status: "approved",
					approved_by: pb.authStore.record?.id || "",
					admin_comment: adminComment || "",
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

// Type for icon name options with source and status info
export type IconNameOption = {
	label: string
	value: string
	source: "collection" | "community"
	status?: "pending" | "approved" | "rejected" | "added_to_collection"
	isOwner?: boolean
	submissionId?: string
	createdBy?: string
}

// Fetch existing icon names for the combobox + the metadata.json file
export function useExistingIconNames() {
	const currentUserId = pb.authStore.record?.id

	return useQuery({
		queryKey: ["existing-icon-names", currentUserId],
		queryFn: async () => {
			const records = await pb.collection("community_gallery").getFullList<{
				id: string
				name: string
				status: "pending" | "approved" | "rejected" | "added_to_collection"
				created_by: string
			}>({
				fields: "id,name,status,created_by",
				sort: "name",
				requestKey: null,
			})

			const metadata = await getAllIcons()
			const metadataNames = Object.keys(metadata)

			const result: IconNameOption[] = []
			const seenNames = new Set<string>()

			for (const record of records) {
				if (!seenNames.has(record.name)) {
					seenNames.add(record.name)
					result.push({
						label: record.name,
						value: record.name,
						source: "community",
						status: record.status,
						isOwner: currentUserId ? record.created_by === currentUserId : false,
						submissionId: record.id,
						createdBy: record.created_by,
					})
				}
			}

			for (const name of metadataNames) {
				if (!seenNames.has(name)) {
					seenNames.add(name)
					result.push({
						label: name,
						value: name,
						source: "collection",
					})
				}
			}

			return result.sort((a, b) => a.label.localeCompare(b.label))
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false,
	})
}

// Fetch a single submission by name
export function useSubmissionByName(name: string) {
	return useQuery({
		queryKey: ["submission-by-name", name],
		queryFn: async () => {
			try {
				const record = await pb.collection("submissions").getFirstListItem<Submission>(`name="${name}"`, {
					requestKey: null,
				})
				return record
			} catch {
				return null
			}
		},
		enabled: !!name && name.length > 0,
		retry: false,
		staleTime: 30 * 1000, // 30 seconds
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
