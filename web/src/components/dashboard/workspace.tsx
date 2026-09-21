"use client"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Clock3, GitPullRequest, LayoutDashboard, ListFilter, RefreshCw, Rss } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { LoginModalContent } from "@/components/login-modal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
	dashboardKey,
	dashboardRequest,
	useDashboardActivity,
	useDashboardSubmissions,
	useDashboardSummary,
	useDashboardUpdates,
	usePublishBatches,
} from "@/hooks/use-dashboard"
import { useAuth } from "@/hooks/use-submissions"
import { actionLabels, type DashboardFilters, type DashboardView, type PublishBatch, views } from "@/lib/dashboard/types"
import { pb } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { ActivityFeed } from "./activity-feed"
import { Inspector, type ReviewIntent } from "./inspector"
import { Empty, ErrorState, Loading, Pagination, Panel, Time } from "./primitives"
import { PublishRun } from "./publishing"
import { ReviewBench } from "./review-bench"
import { FilterInput, ListFilters, QueuePreview, SubmissionList } from "./submission-list"

function numberParam(value: string | null, fallback: number, max: number) {
	const parsed = Number(value)
	if (!Number.isInteger(parsed) || parsed < 1) return fallback
	return Math.min(parsed, max)
}
const viewIcons = { overview: LayoutDashboard, review: Clock3, publish: GitPullRequest, submissions: ListFilter, activity: Rss }
export function DashboardWorkspace() {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const params = useSearchParams()
	const client = useQueryClient()
	const auth = useAuth()
	const authenticated = auth.data?.isAuthenticated === true
	const isAdmin = auth.data?.isAdmin === true
	const filters = useMemo<DashboardFilters>(() => {
		let view: DashboardView = "overview"
		if (views.some((entry) => entry.id === params.get("view"))) view = params.get("view") as DashboardView
		if (authenticated && !isAdmin) view = "submissions"
		let perPage = Number(params.get("size"))
		if (![25, 50, 100].includes(perPage)) perPage = 50
		return {
			view,
			search: params.get("search") || "",
			status: params.get("status") || "",
			submitter: params.get("submitter") || "",
			reviewer: params.get("reviewer") || "",
			from: params.get("from") || "",
			to: params.get("to") || "",
			sort: params.get("sort") || "recent",
			page: numberParam(params.get("page"), 1, 100000),
			perPage,
			actor: params.get("actor") || "",
			action: params.get("action") || "",
			submission: params.get("submission") || "",
		}
	}, [params, authenticated, isAdmin])
	const activeId = params.get("item") || ""
	const [selected, setSelected] = useState<string[]>([])
	const [intent, setIntent] = useState<ReviewIntent | null>(null)
	const [comment, setComment] = useState("")
	const [busy, setBusy] = useState(false)
	const [failures, setFailures] = useState<{ id: string; error: string }[]>([])
	const [wide, setWide] = useState(false)
	const [nextPageSelection, setNextPageSelection] = useState<{ position: "first" | "last"; page: number } | null>(null)
	const returnFocus = useRef<HTMLElement | null>(null)
	const lastInspectedId = useRef(activeId)
	if (activeId) lastInspectedId.current = activeId
	const listActive = authenticated && ["review", "publish", "submissions"].includes(filters.view)
	const list = useDashboardSubmissions(filters, listActive, isAdmin ? undefined : auth.data?.userId)
	const summary = useDashboardSummary(authenticated && isAdmin)
	const overviewFilters = { ...filters, page: 1, actor: "", action: "", submission: "", from: "", to: "" }
	const activity = useDashboardActivity(filters, authenticated && isAdmin && filters.view === "activity")
	const recent = useDashboardActivity(overviewFilters, authenticated && isAdmin && filters.view === "overview", undefined, 8)
	const batches = usePublishBatches(authenticated && isAdmin && filters.view === "publish", numberParam(params.get("runsPage"), 1, 100000))
	const { hasUpdates, refresh } = useDashboardUpdates(authenticated && isAdmin)
	const rows = list.data?.items || []
	const selectionKey = JSON.stringify(filters)
	const previousSelectionKey = useRef(selectionKey)
	useEffect(() => {
		if (previousSelectionKey.current === selectionKey) return
		previousSelectionKey.current = selectionKey
		setSelected([])
		setFailures([])
	}, [selectionKey])
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1280px)")
		const change = () => setWide(mq.matches)
		change()
		mq.addEventListener("change", change)
		return () => mq.removeEventListener("change", change)
	}, [])
	useEffect(
		() =>
			pb.authStore.onChange(() => {
				void client.invalidateQueries({ queryKey: ["auth"] })
				client.removeQueries({ queryKey: dashboardKey })
			}),
		[client],
	)
	const update = useCallback((patch: Record<string, string>, replace = false) => {
		const next = new URLSearchParams(window.location.search)
		for (const [key, value] of Object.entries(patch)) {
			if (value) next.set(key, value)
			else next.delete(key)
		}
		const url = `/dashboard?${next.toString()}`
		if (replace) window.history.replaceState(null, "", url)
		else window.history.pushState(null, "", url)
	}, [])
	function changeFilters(patch: Record<string, string>) {
		update({ ...patch, page: "1" }, true)
	}
	function navigate(view: DashboardView) {
		update({
			view,
			page: "1",
			item: "",
			status: "",
			search: "",
			submitter: "",
			reviewer: "",
			from: "",
			to: "",
			actor: "",
			action: "",
			submission: "",
		})
	}
	function open(id: string) {
		if (!activeId) returnFocus.current = document.activeElement as HTMLElement
		update({ item: id })
	}
	function focusQueue() {
		const row = document.querySelector<HTMLButtonElement>(`[data-submission="${CSS.escape(lastInspectedId.current)}"]`)
		if (row) row.focus()
		else if (returnFocus.current?.isConnected) returnFocus.current.focus()
	}
	function close() {
		update({ item: "" })
		requestAnimationFrame(focusQueue)
	}
	function action(value: ReviewIntent) {
		setComment("")
		setFailures([])
		setIntent(value)
	}
	const reconcile = useCallback(async () => {
		try {
			await dashboardRequest("publish/reconcile", {})
			await client.invalidateQueries({ queryKey: [...dashboardKey, "batches"] })
			await client.invalidateQueries({ queryKey: [...dashboardKey, "summary"] })
		} catch {
			/* Retain displayed state; explicit refresh can retry. */
		}
	}, [client])
	useEffect(() => {
		if (!authenticated || !isAdmin) return
		void reconcile()
	}, [authenticated, isAdmin, reconcile])
	useEffect(() => {
		if (filters.view !== "publish" || !summary.data?.batches.some((batch) => batch.active)) return
		const timer = setInterval(() => {
			if (document.visibilityState === "visible") void reconcile()
		}, 15000)
		return () => clearInterval(timer)
	}, [filters.view, summary.data, reconcile])
	useEffect(() => {
		if (!nextPageSelection || list.isFetching || !list.data || list.data.page !== nextPageSelection.page) return
		const pageRows = list.data.items
		let target = pageRows[0]
		if (nextPageSelection.position === "last") target = pageRows[pageRows.length - 1]
		if (target) update({ item: target.id }, true)
		setNextPageSelection(null)
	}, [nextPageSelection, list.isFetching, list.data, update])
	async function submit() {
		if (!intent) return
		setBusy(true)
		try {
			const items = intent.records.map((record) => ({ id: record.id, updated: record.updated }))
			if (intent.kind === "publish") {
				const batch = await dashboardRequest<PublishBatch>("publish/dispatch", { items })
				if (batch.state === "failed") toast.error(batch.message || "Publication request failed")
				else toast.success("Publish request recorded", { description: "Follow its progress in Publish." })
				setIntent(null)
				setSelected([])
				navigate("publish")
			} else {
				const result = await dashboardRequest<{ results: { id: string; success: boolean; error?: string }[]; emailFailed?: boolean }>(
					"review",
					{ items, status: intent.kind, comment },
				)
				const failed = result.results.filter((row) => !row.success).map((row) => ({ id: row.id, error: row.error || "Review failed" }))
				setFailures(failed)
				setSelected(failed.map((row) => row.id))
				const succeeded = result.results.length - failed.length
				if (result.emailFailed) toast.warning("Reviews saved, but feedback email delivery failed.")
				if (succeeded) toast.success(`${succeeded} submission(s) reviewed`)
				if (failed.length) toast.error(`${failed.length} submission(s) need attention`)
				if (!failed.length && intent.nextId) {
					let nextId = intent.nextId
					if (nextId === "__next_page__") {
						const position = rows.findIndex((row) => row.id === intent.records[0].id)
						const refreshed = await list.refetch()
						if (refreshed.data?.items.some((row) => row.id === intent.records[0].id)) {
							setNextPageSelection({ position: "first", page: filters.page + 1 })
							update({ page: String(filters.page + 1), item: "" }, true)
							nextId = ""
						} else nextId = refreshed.data?.items[position]?.id || ""
					}
					update({ item: nextId }, true)
				}
				setIntent(null)
				await revalidateAllSubmissions()
			}
			await refresh()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Action failed. Please refresh and try again.")
		} finally {
			setBusy(false)
		}
	}
	if (!mounted || auth.isLoading) return <Loading />
	if (!authenticated)
		return (
			<div className="mx-auto my-10 w-full max-w-md rounded-xl border bg-background p-6">
				<LoginModalContent autoFocus={false} onSuccess={() => void client.invalidateQueries({ queryKey: ["auth"] })} />
			</div>
		)
	const title = isAdmin ? "Dashboard" : "My submissions"

	const counts = summary.data?.counts
	const index = rows.findIndex((record) => record.id === activeId)
	const previous = rows[index - 1]?.id
	const next = rows[index + 1]?.id
	const inspectorProps = {
		id: activeId,
		filters,
		isAdmin,
		onClose: close,
		onOpen: open,
		onAction: action,
		previous,
		next,
		busy,
		publishBlocked: summary.data?.batches.some((batch) => batch.active) || false,
		onPrevious:
			index === 0 && filters.page > 1
				? () => {
						setNextPageSelection({ position: "last", page: filters.page - 1 })
						update({ page: String(filters.page - 1) })
					}
				: undefined,
		onNext:
			index === rows.length - 1 && filters.page < (list.data?.totalPages || 0)
				? () => {
						setNextPageSelection({ position: "first", page: filters.page + 1 })
						update({ page: String(filters.page + 1) })
					}
				: undefined,
	}
	const activeBatch = summary.data?.batches.find((batch) => batch.active)
	const pendingSelected = rows.filter((record) => selected.includes(record.id) && record.status === "pending")
	const approvedSelected = rows.filter((record) => selected.includes(record.id) && record.status === "approved")
	let confirmTitle = "Approve submissions"
	let confirmDescription = "Your feedback will be sent to the submitter. Approval does not publish the icon."
	if (intent?.kind === "rejected") {
		confirmTitle = "Reject submissions"
		confirmDescription = "The submitter will see this feedback and can submit an improved version."
	}
	if (intent?.kind === "publish") {
		confirmTitle = "Publish to the collection"
		confirmDescription =
			"This starts one GitHub run for the selected icons. Publication is complete only after the repository push succeeds."
	}
	return (
		<div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-2 sm:px-6 lg:px-8">
			<div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b pb-2">
				<h1 className={cn("text-lg font-semibold", isAdmin && "sr-only")}>{title}</h1>
				{isAdmin && (
					<>
						<nav aria-label="Dashboard views" className="hidden shrink-0 items-center gap-1 md:flex">
							{views.map((entry) => {
								const Icon = viewIcons[entry.id]
								let count: number | undefined
								if (entry.id === "review") count = counts?.pending
								if (entry.id === "publish") count = counts?.approved
								return (
									<button
										key={entry.id}
										type="button"
										aria-current={filters.view === entry.id ? "page" : undefined}
										onClick={() => navigate(entry.id)}
										className={cn(
											"relative flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground",
											filters.view === entry.id && "border-primary text-foreground",
										)}
									>
										<Icon className="size-3.5" />
										{entry.label}
										{count !== undefined && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>}
									</button>
								)
							})}
						</nav>
						<select
							aria-label="Dashboard view"
							className="h-9 min-w-0 flex-1 shrink-0 rounded-lg border bg-background px-3 text-sm md:hidden"
							value={filters.view}
							onChange={(e) => navigate(e.target.value as DashboardView)}
						>
							{views.map((entry) => (
								<option key={entry.id} value={entry.id}>
									{entry.label}
								</option>
							))}
						</select>
					</>
				)}
				<Button
					size="icon"
					variant="ghost"
					className="size-9 shrink-0"
					aria-label="Refresh dashboard"
					disabled={summary.isFetching || list.isFetching}
					onClick={() => void reconcile().then(refresh)}
				>
					<RefreshCw className="size-4" />
				</Button>
			</div>
			{hasUpdates && (
				<div className="mb-3 flex shrink-0 items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
					<span>New activity available. Your current list has stayed in place.</span>
					<Button size="sm" variant="ghost" className="h-7" onClick={() => void refresh()}>
						Refresh
					</Button>
				</div>
			)}
			{!!failures.length && (
				<div role="alert" className="mb-3 max-h-28 overflow-y-auto rounded-lg border border-destructive/30 p-3 text-xs">
					{failures.map((failure) => (
						<p key={failure.id}>
							{rows.find((row) => row.id === failure.id)?.name || failure.id}: {failure.error}
						</p>
					))}
				</div>
			)}
			<div className={cn("grid min-h-0 flex-1 gap-4", filters.view !== "review" && activeId && wide && "grid-cols-[minmax(0,1fr)_400px]")}>
				<div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain">
					{filters.view === "overview" && isAdmin && (
						<>
							{summary.error && <ErrorState error={summary.error} retry={() => void summary.refetch()} />}
							<div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
								{[
									{ label: "Needs review", value: counts?.pending, view: "review" },
									{ label: "Ready to publish", value: counts?.approved, view: "publish" },
									{ label: "Published", value: counts?.added_to_collection, view: "submissions" },
								].map((metric) => (
									<button
										key={metric.label}
										type="button"
										onClick={() => {
											navigate(metric.view as DashboardView)
											if (metric.label === "Published") update({ status: "added_to_collection" }, true)
										}}
										className="rounded-xl border bg-background px-3 py-3 text-left hover:bg-muted/30 sm:px-4"
									>
										<span className="block text-[11px] text-muted-foreground">{metric.label}</span>
										<span className="mt-1 block text-xl font-semibold tabular-nums">{metric.value ?? "—"}</span>
									</button>
								))}
							</div>
							<div className={cn("grid items-start gap-4", !activeId && "lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]")}>
								<Panel
									title="Recent team activity"
									action={
										<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("activity")}>
											View all
											<ArrowRight className="size-3" />
										</Button>
									}
								>
									{recent.isLoading && <Loading />}
									{recent.error && <ErrorState error={recent.error} retry={() => void recent.refetch()} />}{" "}
									{recent.data && <ActivityFeed events={recent.data.items} onOpen={open} />}
								</Panel>
								<div className="space-y-4">
									<Panel
										title="Waiting for review"
										action={
											<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("review")}>
												Review
												<ArrowRight className="size-3" />
											</Button>
										}
									>
										{summary.data?.oldest && (
											<div className="border-b px-4 py-2 text-[11px] text-muted-foreground">
												Oldest submission: <Time value={summary.data.oldest.created} />
											</div>
										)}
										<QueuePreview records={summary.data?.pending || []} onOpen={open} />
									</Panel>
									<Panel
										title="Ready to publish"
										action={
											<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("publish")}>
												Open
												<ArrowRight className="size-3" />
											</Button>
										}
									>
										<QueuePreview records={summary.data?.approved || []} onOpen={open} />
									</Panel>
									{summary.data?.batches[0] && <PublishRun batch={activeBatch || summary.data.batches[0]} compact />}
								</div>
							</div>
						</>
					)}
					{filters.view === "review" && isAdmin && (
						<>
							{list.isLoading && <Loading />}
							{list.error && <ErrorState error={list.error} retry={() => void list.refetch()} />}
							{list.data && (
								<ReviewBench
									key={auth.data?.userId}
									userId={auth.data?.userId || ""}
									rows={rows}
									activeId={activeId}
									filters={filters}
									totalItems={list.data.totalItems}
									totalPages={list.data.totalPages}
									loaded={!list.isPlaceholderData && !list.isFetching && list.data.page === filters.page}
									onChange={update}
									refresh={refresh}
								/>
							)}
						</>
					)}
					{listActive && filters.view !== "review" && (
						<div className="flex h-full min-h-0 flex-col gap-3">
							{filters.view === "publish" && activeBatch && <PublishRun batch={activeBatch} compact />}
							<section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border bg-background">
								<ListFilters filters={filters} onChange={changeFilters} isAdmin={isAdmin} />
								{selected.length > 0 && (
									<div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2">
										<span className="mr-auto text-xs">{selected.length} selected on this page</span>
										<Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelected([])}>
											Clear
										</Button>
										{pendingSelected.length > 0 && (
											<>
												<Button
													size="sm"
													variant="outline"
													className="h-7 text-xs"
													disabled={busy || list.isPlaceholderData}
													onClick={() => action({ kind: "rejected", records: pendingSelected })}
												>
													Reject {pendingSelected.length}
												</Button>
												<Button
													size="sm"
													className="h-7 text-xs"
													disabled={busy || list.isPlaceholderData}
													onClick={() => action({ kind: "approved", records: pendingSelected })}
												>
													Approve {pendingSelected.length}
												</Button>
											</>
										)}
										{approvedSelected.length > 0 && (
											<Button
												size="sm"
												className="h-7 text-xs"
												disabled={busy || !!activeBatch || list.isPlaceholderData}
												onClick={() => action({ kind: "publish", records: approvedSelected })}
											>
												Publish {approvedSelected.length}
											</Button>
										)}
									</div>
								)}
								<div className="min-h-0 flex-1 overflow-y-auto">
									{list.isLoading && <Loading />}
									{list.error && <ErrorState error={list.error} retry={() => void list.refetch()} />}{" "}
									{list.data && (
										<SubmissionList
											records={rows}
											selected={selected}
											onSelection={setSelected}
											onOpen={open}
											activeId={activeId}
											isAdmin={isAdmin}
											disabled={busy || list.isPlaceholderData}
											view={filters.view}
											sort={filters.sort}
											onSort={(sort) => changeFilters({ sort })}
										/>
									)}
								</div>
								{list.data && (
									<Pagination
										page={filters.page}
										totalPages={list.data.totalPages}
										totalItems={list.data.totalItems}
										perPage={filters.perPage}
										onPage={(page) => update({ page: String(page) })}
										onSize={(size) => changeFilters({ size: String(size) })}
										disabled={list.isPlaceholderData}
									/>
								)}
							</section>
							{filters.view === "publish" && (
								<details className="shrink-0 rounded-xl border bg-background">
									<summary className="cursor-pointer px-4 py-3 text-sm font-medium">Publication history</summary>
									<div className="max-h-80 space-y-2 overflow-y-auto px-3 pb-3">
										{batches.error && <ErrorState error={batches.error} retry={() => void batches.refetch()} />}{" "}
										{batches.data?.items.map((batch) => (
											<PublishRun key={batch.id} batch={batch} />
										))}
										{batches.data?.items.length === 0 && (
											<Empty title="No publish runs yet">Select approved icons to publish your first batch.</Empty>
										)}
									</div>
									{batches.data && (
										<Pagination
											page={batches.data.page}
											totalPages={batches.data.totalPages}
											totalItems={batches.data.totalItems}
											perPage={10}
											onPage={(page) => update({ runsPage: String(page) })}
										/>
									)}
								</details>
							)}
						</div>
					)}
					{filters.view === "activity" && isAdmin && (
						<section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
							<div className="grid shrink-0 grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3">
								<FilterInput label="Actor" value={filters.actor} onChange={(actor) => changeFilters({ actor })} />
								<FilterInput label="Icon" value={filters.submission} onChange={(submission) => changeFilters({ submission })} />
								<label className="space-y-1.5 text-xs text-muted-foreground">
									<span className="block">Action</span>
									<select
										aria-label="Activity action"
										className="h-9 w-full rounded border bg-background px-2 text-foreground"
										value={filters.action}
										onChange={(e) => changeFilters({ action: e.target.value })}
									>
										<option value="">All actions</option>
										{Object.entries(actionLabels).map(([value, label]) => (
											<option key={value} value={value}>
												{label}
											</option>
										))}
									</select>
								</label>
								<FilterInput label="From (UTC)" value={filters.from} type="date" onChange={(from) => changeFilters({ from })} />
								<FilterInput label="Through (UTC)" value={filters.to} type="date" onChange={(to) => changeFilters({ to })} />
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{activity.isLoading && <Loading />}
								{activity.error && <ErrorState error={activity.error} retry={() => void activity.refetch()} />}{" "}
								{activity.data && <ActivityFeed events={activity.data.items} onOpen={open} />}
							</div>
							{activity.data && (
								<Pagination
									page={filters.page}
									perPage={filters.perPage}
									totalItems={activity.data.totalItems}
									totalPages={activity.data.totalPages}
									onPage={(page) => update({ page: String(page) })}
									onSize={(size) => changeFilters({ size: String(size) })}
								/>
							)}
						</section>
					)}
				</div>
				{filters.view !== "review" && activeId && wide && (
					<aside aria-label="Submission inspector" className="min-h-0 overflow-hidden rounded-xl border">
						<Inspector {...inspectorProps} />
					</aside>
				)}
			</div>
			<Sheet
				open={filters.view !== "review" && !!activeId && !wide}
				onOpenChange={(value) => {
					if (!value) close()
				}}
			>
				<SheetContent
					className="w-full gap-0 bg-background p-0 sm:max-w-lg"
					onCloseAutoFocus={(event) => {
						event.preventDefault()
						focusQueue()
					}}
				>
					<SheetTitle className="sr-only">Submission inspector</SheetTitle>
					<SheetDescription className="sr-only">Review assets, feedback, and history without leaving your queue.</SheetDescription>
					{activeId && <Inspector {...inspectorProps} />}
				</SheetContent>
			</Sheet>
			<Dialog
				open={!!intent}
				onOpenChange={(value) => {
					if (!value && !busy) setIntent(null)
				}}
			>
				<DialogContent className="max-h-[90dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{confirmTitle}</DialogTitle>
						<DialogDescription>{confirmDescription}</DialogDescription>
					</DialogHeader>
					<ul className="max-h-36 overflow-y-auto rounded-lg border bg-muted/20 px-4 py-3 text-sm">
						{intent?.records.map((record) => (
							<li key={record.id} className="truncate py-0.5">
								{record.name}
							</li>
						))}
					</ul>
					{intent?.kind !== "publish" && (
						<label htmlFor="dashboard-review-feedback" className="space-y-2 text-sm">
							<span>Feedback to submitter (optional)</span>
							<Textarea
								id="dashboard-review-feedback"
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="Explain your decision or suggest an improvement…"
								rows={4}
								maxLength={10000}
							/>
						</label>
					)}
					<DialogFooter>
						<Button variant="outline" disabled={busy} onClick={() => setIntent(null)}>
							Cancel
						</Button>
						<Button disabled={busy} onClick={() => void submit()}>
							{busy ? "Working…" : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
