"use client"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import type { DashboardFilters, DashboardSummary, PublishBatch, SubmissionEvent } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"

export const dashboardKey = ["dashboard"] as const
export function dashboardRequest<T>(path: string, body?: unknown) {
	let method = "GET"
	if (body !== undefined) method = "POST"
	return pb.send<T>(`/api/dashboard/${path}`, { method, body, requestKey: null })
}
function dateFilters(filters: DashboardFilters, field: string, conditions: string[]) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(filters.from)) conditions.push(pb.filter(`${field} >= {:from}`, { from: `${filters.from} 00:00:00.000Z` }))
	if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to)) conditions.push(pb.filter(`${field} <= {:to}`, { to: `${filters.to} 23:59:59.999Z` }))
}
export function useDashboardSubmissions(filters: DashboardFilters, enabled: boolean, userId?: string) {
	const conditions: string[] = []
	let status = filters.status
	if (filters.view === "review") status = "pending"
	if (filters.view === "publish") status = "approved"
	if (["pending", "approved", "rejected", "added_to_collection"].includes(status))
		conditions.push(pb.filter("status = {:status}", { status }))
	if (filters.search) conditions.push(pb.filter("(name ~ {:q} || created_by.username ~ {:q})", { q: filters.search }))
	if (filters.submitter) conditions.push(pb.filter("created_by.username ~ {:name}", { name: filters.submitter }))
	if (filters.reviewer) conditions.push(pb.filter("approved_by.username ~ {:name}", { name: filters.reviewer }))
	if (userId) conditions.push(pb.filter("created_by = {:id}", { id: userId }))
	dateFilters(filters, "updated", conditions)
	let sort = "-updated,-id"
	if (filters.sort === "oldest") sort = "updated,id"
	if (filters.sort === "name") sort = "name,id"
	return useQuery({
		queryKey: [...dashboardKey, "submissions", filters, userId],
		enabled,
		queryFn: () =>
			pb.collection("submissions").getList<Submission>(filters.page, filters.perPage, {
				filter: conditions.join(" && "),
				sort,
				expand: "created_by,approved_by",
				requestKey: null,
			}),
		placeholderData: keepPreviousData,
	})
}
export function useSubmissionDetail(id: string, enabled: boolean) {
	return useQuery({
		queryKey: [...dashboardKey, "detail", id],
		enabled: enabled && !!id,
		queryFn: () => pb.collection("submissions").getOne<Submission>(id, { expand: "created_by,approved_by", requestKey: null }),
	})
}
export function useDashboardSummary(enabled: boolean) {
	return useQuery({ queryKey: [...dashboardKey, "summary"], enabled, queryFn: () => dashboardRequest<DashboardSummary>("summary") })
}
export function useDashboardActivity(filters: DashboardFilters, enabled: boolean, submissionId?: string, limit?: number) {
	const conditions: string[] = []
	if (submissionId) conditions.push(pb.filter("submission_id = {:id}", { id: submissionId }))
	if (filters.actor) conditions.push(pb.filter("actor_name ~ {:q}", { q: filters.actor }))
	if (filters.action) conditions.push(pb.filter("action = {:action}", { action: filters.action }))
	if (filters.submission) conditions.push(pb.filter("submission_name ~ {:q}", { q: filters.submission }))
	dateFilters(filters, "created", conditions)
	let page = filters.page
	if (limit) page = 1
	return useQuery({
		queryKey: [...dashboardKey, "activity", filters, submissionId, limit],
		enabled,
		queryFn: () =>
			pb.collection("submission_events").getList<SubmissionEvent>(page, limit || filters.perPage, {
				filter: conditions.join(" && "),
				sort: "-created,-id",
				requestKey: null,
			}),
		placeholderData: keepPreviousData,
	})
}
export function usePublishBatches(enabled: boolean, page: number) {
	return useQuery({
		queryKey: [...dashboardKey, "batches", page],
		enabled,
		queryFn: () => pb.collection("publish_batches").getList<PublishBatch>(page, 10, { sort: "-created,-id", requestKey: null }),
		refetchInterval: (query) => {
			if (query.state.data?.items.some((batch) => batch.active)) return 15000
			return false
		},
	})
}
export function useDashboardUpdates(enabled: boolean) {
	const client = useQueryClient()
	const [hasUpdates, setHasUpdates] = useState(false)
	const refresh = useCallback(async () => {
		await client.invalidateQueries({ queryKey: dashboardKey })
		setHasUpdates(false)
	}, [client])
	useEffect(() => {
		if (!enabled) return
		let disposed = false
		const cleanup: (() => void)[] = []
		const changed = () => {
			setHasUpdates(true)
			void client.invalidateQueries({ queryKey: [...dashboardKey, "summary"] })
		}
		for (const collection of ["submissions", "submission_events", "publish_batches"]) {
			void pb
				.collection(collection)
				.subscribe("*", changed)
				.then((unsubscribe) => {
					if (disposed) unsubscribe()
					else cleanup.push(unsubscribe)
				})
				.catch(() => {
					/* Manual refresh remains available when realtime is offline. */
				})
		}
		return () => {
			disposed = true
			for (const unsubscribe of cleanup) unsubscribe()
		}
	}, [client, enabled])
	return { hasUpdates, refresh }
}
