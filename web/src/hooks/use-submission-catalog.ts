"use client"

import { useQuery } from "@tanstack/react-query"
import { type CommunityGallery, pb, type Submission } from "@/lib/pb"

export interface SubmissionCatalog {
	names: string[]
	customVariantNames: string[]
	customVariantError: string | null
}

export interface ExistingSubmission {
	id: string
	name: string
	status: Submission["status"]
	mine: boolean
	feedback: string
	contributor?: string
}

export function useSubmissionCatalog() {
	return useQuery({
		queryKey: ["submission-catalog"],
		queryFn: async (): Promise<SubmissionCatalog> => {
			const [catalog, suggestions] = await Promise.allSettled([
				fetch("/api/submissions/catalog").then(async (response) => {
					if (!response.ok) throw new Error("Icon suggestions are unavailable. Sending still checks every Icon on the server.")
					return response.json() as Promise<{ names: string[] }>
				}),
				fetch("/api/submissions/variant-names", { cache: "no-store" }).then(async (response) => {
					if (!response.ok) throw new Error("Custom variant suggestions are unavailable. You can still enter a name.")
					return response.json() as Promise<{ names: string[] }>
				}),
			])
			if (catalog.status === "rejected") throw catalog.reason
			if (suggestions.status === "rejected")
				return {
					names: catalog.value.names,
					customVariantNames: [],
					customVariantError: "Custom variant suggestions are unavailable. You can still enter a name.",
				}
			return { names: catalog.value.names, customVariantNames: suggestions.value.names, customVariantError: null }
		},
		staleTime: 5 * 60 * 1000,
	})
}

export function useSubmissionHints() {
	const userId = pb.authStore.record?.id
	return useQuery({
		queryKey: ["submission-hints", userId],
		queryFn: async (): Promise<ExistingSubmission[]> => {
			const username: unknown = pb.authStore.record?.username
			let contributor: string | undefined
			if (typeof username === "string") contributor = username
			const [community, own] = await Promise.all([
				pb.collection("community_gallery").getFullList<Pick<CommunityGallery, "id" | "name" | "status" | "created_by">>({
					fields: "id,name,status,created_by",
					filter: 'status = "pending"',
					requestKey: null,
				}),
				pb.collection("submissions").getFullList<Pick<Submission, "id" | "name" | "status" | "admin_comment">>({
					fields: "id,name,status,admin_comment",
					filter: pb.filter('created_by = {:userId} && (status = "pending" || status = "rejected")', { userId }),
					requestKey: null,
				}),
			])
			const records = new Map<string, ExistingSubmission>()
			for (const record of community)
				records.set(record.id, {
					id: record.id,
					name: record.name,
					status: record.status,
					mine: false,
					feedback: "",
					contributor: record.created_by,
				})
			for (const record of own)
				records.set(record.id, {
					id: record.id,
					name: record.name,
					status: record.status,
					mine: true,
					feedback: record.admin_comment,
					contributor,
				})
			return [...records.values()]
		},
		enabled: Boolean(userId),
		staleTime: 60 * 1000,
	})
}
