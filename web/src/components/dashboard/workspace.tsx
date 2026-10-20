"use client"
import { useQueryClient } from "@tanstack/react-query"
import { Check, Clock, GitPullRequest, LayoutDashboard, ListFilter, RefreshCw, Rocket, Rss, X } from "lucide-react"
import { MotionConfig, motion } from "motion/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { LoginModalContent } from "@/components/login-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { ContributorHome } from "./contributor-home"
import { Inspector, type ReviewIntent } from "./inspector"
import { AdminOverview } from "./overview"
import { approveButton, Empty, ErrorState, Loading, LoadMore, Panel, rejectButton, statusStyles, Thumbnail } from "./primitives"
import { PublishRun } from "./publishing"
import { ReviewBench } from "./review-bench"
import { FilterInput, ListFilters, SubmissionList } from "./submission-list"

const viewIcons = { overview: LayoutDashboard, review: Clock, publish: GitPullRequest, submissions: ListFilter, activity: Rss }
const intentStyles = {
	approved: {
		title: "Approve submissions",
		description: "Your feedback will be sent to the submitter. Approval does not publish the icon.",
		Icon: Check,
		variant: "outline",
		button: approveButton,
		tone: statusStyles.added_to_collection.badge,
		label: "Approve",
	},
	rejected: {
		title: "Reject submissions",
		description: "The submitter will see this feedback and can submit an improved version.",
		Icon: X,
		variant: "outline",
		button: rejectButton,
		tone: statusStyles.rejected.badge,
		label: "Reject",
	},
	publish: {
		title: "Publish to the collection",
		description: "This starts one GitHub run for the selected icons. Publication is complete only after the repository push succeeds.",
		Icon: Rocket,
		variant: "default",
		button: "",
		tone: "border-primary/20 bg-primary/10 text-primary",
		label: "Publish",
	},
} as const
const LIST_PAGE = 100

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
		return {
			view,
			search: params.get("search") || "",
			status: params.get("status") || "",
			submitter: params.get("submitter") || "",
			reviewer: params.get("reviewer") || "",
			from: params.get("from") || "",
			to: params.get("to") || "",
			sort: params.get("sort") || "recent",
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
	const [activityLimit, setActivityLimit] = useState(50)
	const [listLimit, setListLimit] = useState(LIST_PAGE)
	const [runsLimit, setRunsLimit] = useState(10)
	const returnFocus = useRef<HTMLElement | null>(null)
	const lastInspectedId = useRef(activeId)
	if (activeId) lastInspectedId.current = activeId
	const listActive = authenticated && ["review", "publish", "submissions"].includes(filters.view)
	let listFilters = filters
	if (!isAdmin) listFilters = { ...filters, search: "", status: "" }
	const list = useDashboardSubmissions(listFilters, listActive, isAdmin ? undefined : auth.data?.userId)
	const summary = useDashboardSummary(authenticated && isAdmin)
	const activity = useDashboardActivity(filters, authenticated && isAdmin && filters.view === "activity", undefined, activityLimit)
	const recent = useDashboardActivity(
		{ ...filters, actor: "", action: "", submission: "", from: "", to: "" },
		authenticated && isAdmin && filters.view === "overview",
		undefined,
		8,
	)
	const batches = usePublishBatches(authenticated && isAdmin && filters.view === "publish", runsLimit)
	const { hasUpdates, refresh } = useDashboardUpdates(authenticated && isAdmin)
	const rows = list.data || []
	const selectionKey = JSON.stringify(filters)
	const previousSelectionKey = useRef(selectionKey)
	useEffect(() => {
		if (previousSelectionKey.current === selectionKey) return
		previousSelectionKey.current = selectionKey
		setSelected([])
		setFailures([])
		setActivityLimit(50)
		setListLimit(LIST_PAGE)
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
		update(patch, true)
	}
	function navigate(view: DashboardView, patch: Record<string, string> = {}) {
		update({
			view,
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
			...patch,
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
				if (!failed.length && intent.nextId) update({ item: intent.nextId }, true)
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
			<div className="mx-auto my-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
				<LoginModalContent autoFocus={false} onSuccess={() => void client.invalidateQueries({ queryKey: ["auth"] })} />
			</div>
		)
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
	}
	const activeBatch = summary.data?.batches.find((batch) => batch.active)
	const pendingSelected = rows.filter((record) => selected.includes(record.id) && record.status === "pending")
	const approvedSelected = rows.filter((record) => selected.includes(record.id) && record.status === "approved")
	const intentStyle = intent && intentStyles[intent.kind]
	const sidePanel = filters.view !== "review" && !!activeId && wide
	const refreshing = summary.isFetching || list.isFetching
	return (
		<MotionConfig reducedMotion="user">
			<div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 pt-3 pb-2 sm:px-6 lg:px-8">
				<h1 className="sr-only">{isAdmin ? "Review workbench" : "My submissions"}</h1>
				{isAdmin && (
					<div className="mb-4 flex shrink-0 items-center gap-2 border-b">
						<nav
							aria-label="Dashboard views"
							className="-mb-px flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						>
							{views.map((entry) => {
								const Icon = viewIcons[entry.id]
								const active = filters.view === entry.id
								let count: number | undefined
								let tone = ""
								if (entry.id === "review") {
									count = counts?.pending
									tone = statusStyles.pending.badge
								}
								if (entry.id === "publish") {
									count = counts?.approved
									tone = statusStyles.approved.badge
								}
								return (
									<button
										key={entry.id}
										type="button"
										aria-current={active ? "page" : undefined}
										onClick={() => navigate(entry.id)}
										className={cn(
											"flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:size-4",
											active && "border-primary font-semibold text-primary",
										)}
									>
										<Icon />
										{entry.label}
										{!!count && (
											<span
												className={cn(
													"min-w-5 rounded-full border px-1.5 text-center text-[11px] font-semibold leading-4 tabular-nums",
													tone,
												)}
											>
												{count}
											</span>
										)}
									</button>
								)
							})}
						</nav>
						{hasUpdates && (
							<Button variant="ghost" size="sm" className="mb-1 shrink-0 max-lg:min-h-11" onClick={() => void refresh()}>
								<span className="size-2 rounded-full bg-primary" />
								<span className="max-sm:sr-only">New activity</span>
							</Button>
						)}
						<Button
							size="icon"
							variant="ghost"
							className="mb-1 shrink-0 max-lg:size-11"
							aria-label="Refresh dashboard"
							disabled={refreshing}
							onClick={() => void reconcile().then(refresh)}
						>
							<RefreshCw className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />
						</Button>
					</div>
				)}
				{!!failures.length && (
					<div
						role="alert"
						className="mb-3 max-h-28 shrink-0 overflow-y-auto rounded-lg border border-destructive/40 p-3 text-xs text-destructive"
					>
						{failures.map((failure) => (
							<p key={failure.id}>
								{rows.find((row) => row.id === failure.id)?.name || failure.id}: {failure.error}
							</p>
						))}
					</div>
				)}
				<div className={cn("grid min-h-0 flex-1 gap-4", sidePanel && "grid-cols-[minmax(0,1fr)_420px]")}>
					<div
						className={cn(
							"relative min-h-0 min-w-0 overscroll-contain lg:overflow-y-auto",
							filters.view === "review" && "lg:overflow-hidden",
						)}
					>
						{!isAdmin && (
							<ContributorHome
								records={rows}
								loading={list.isLoading}
								error={list.error}
								retry={() => void list.refetch()}
								filters={filters}
								activeId={activeId}
								onFilter={changeFilters}
								onOpen={open}
								refresh={() => void list.refetch()}
								refreshing={list.isFetching}
							/>
						)}
						{filters.view === "overview" && isAdmin && (
							<AdminOverview
								summary={summary}
								recent={recent}
								onNavigate={navigate}
								onOpen={open}
								onReview={(id) => navigate("review", { item: id })}
							/>
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
										loaded={!list.isPlaceholderData && !list.isFetching}
										onChange={update}
										refresh={refresh}
										approvedCount={counts?.approved || 0}
										onPublish={() => navigate("publish")}
									/>
								)}
							</>
						)}
						{isAdmin && ["publish", "submissions"].includes(filters.view) && (
							<div className="flex min-h-full flex-col gap-3">
								{filters.view === "publish" && (
									<div className="space-y-1">
										<h2 className="font-semibold">Ready to publish</h2>
										<p className="text-sm text-muted-foreground">
											Select approved icons and start one GitHub run. They join the collection once the push succeeds.
										</p>
									</div>
								)}
								{filters.view === "publish" && activeBatch && <PublishRun batch={activeBatch} compact />}
								<Card className="min-h-[320px] flex-1 gap-0 overflow-hidden bg-background/50 py-0">
									<ListFilters filters={filters} onChange={changeFilters} counts={counts} />
									{selected.length > 0 && (
										<motion.div
											initial={{ opacity: 0, y: -4 }}
											animate={{ opacity: 1, y: 0 }}
											className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-4 py-2"
										>
											<span className="mr-auto text-sm font-medium">{selected.length} selected</span>
											<Button size="sm" variant="ghost" onClick={() => setSelected([])}>
												Clear
											</Button>
											{pendingSelected.length > 0 && (
												<>
													<Button
														size="sm"
														variant="outline"
														className={rejectButton}
														disabled={busy || list.isPlaceholderData}
														onClick={() => action({ kind: "rejected", records: pendingSelected })}
													>
														<X />
														Reject {pendingSelected.length}
													</Button>
													<Button
														size="sm"
														variant="outline"
														className={approveButton}
														disabled={busy || list.isPlaceholderData}
														onClick={() => action({ kind: "approved", records: pendingSelected })}
													>
														<Check />
														Approve {pendingSelected.length}
													</Button>
												</>
											)}
											{approvedSelected.length > 0 && (
												<Button
													size="sm"
													disabled={busy || !!activeBatch || list.isPlaceholderData}
													onClick={() => action({ kind: "publish", records: approvedSelected })}
												>
													<Rocket />
													Publish {approvedSelected.length}
												</Button>
											)}
										</motion.div>
									)}
									<div className="relative min-h-0 flex-1 overflow-y-auto">
										{list.isLoading && <Loading />}
										{list.error && <ErrorState error={list.error} retry={() => void list.refetch()} />}
										{list.data && (
											<SubmissionList
												records={rows.slice(0, listLimit)}
												selected={selected}
												onSelection={setSelected}
												onOpen={open}
												activeId={activeId}
												disabled={busy || list.isPlaceholderData}
												view={filters.view}
												sort={filters.sort}
												onSort={(sort) => changeFilters({ sort })}
											/>
										)}
										{list.data && (
											<LoadMore
												shown={Math.min(listLimit, rows.length)}
												total={rows.length}
												loading={false}
												onMore={() => setListLimit((limit) => limit + LIST_PAGE)}
											/>
										)}
									</div>
								</Card>
								{filters.view === "publish" && (
									<Panel title="Publication history" icon={<GitPullRequest className="text-primary" />}>
										<div className="space-y-2 p-3">
											{batches.error && <ErrorState error={batches.error} retry={() => void batches.refetch()} />}
											{batches.data?.items.map((batch) => (
												<PublishRun key={batch.id} batch={batch} />
											))}
											{batches.data?.items.length === 0 && (
												<Empty title="No publish runs yet" icon={Rocket}>
													Select approved icons to publish your first batch.
												</Empty>
											)}
										</div>
										{batches.data && (
											<LoadMore
												shown={batches.data.items.length}
												total={batches.data.totalItems}
												loading={batches.isFetching}
												onMore={() => setRunsLimit((limit) => limit + 10)}
											/>
										)}
									</Panel>
								)}
							</div>
						)}
						{filters.view === "activity" && isAdmin && (
							<Card className="min-h-full gap-0 overflow-hidden bg-background/50 py-0">
								<div className="grid shrink-0 grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3 lg:grid-cols-5">
									<FilterInput label="Actor" value={filters.actor} onChange={(actor) => changeFilters({ actor })} />
									<FilterInput label="Icon" value={filters.submission} onChange={(submission) => changeFilters({ submission })} />
									<label className="space-y-1.5 text-xs text-muted-foreground">
										<span className="block font-medium">Action</span>
										<select
											aria-label="Activity action"
											className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 max-lg:min-h-11"
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
								<div className="min-h-0 flex-1">
									{activity.isLoading && <Loading />}
									{activity.error && <ErrorState error={activity.error} retry={() => void activity.refetch()} />}
									{activity.data && <ActivityFeed events={activity.data.items} onOpen={open} />}
									{activity.data && (
										<LoadMore
											shown={activity.data.items.length}
											total={activity.data.totalItems}
											loading={activity.isFetching}
											onMore={() => setActivityLimit((limit) => limit + 50)}
										/>
									)}
								</div>
							</Card>
						)}
					</div>
					{sidePanel && (
						<aside aria-label="Submission inspector" className="min-h-0 overflow-hidden rounded-lg border bg-background shadow-sm">
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
						<DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
							{intentStyle && (
								<span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md border", intentStyle.tone)}>
									<intentStyle.Icon className="size-4" />
								</span>
							)}
							<div className="space-y-1.5">
								<DialogTitle>{intentStyle?.title}</DialogTitle>
								<DialogDescription>{intentStyle?.description}</DialogDescription>
							</div>
						</DialogHeader>
						<ul className="relative max-h-48 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
							{intent?.records.map((record) => (
								<li key={record.id} className="flex min-w-0 items-center gap-2 p-1">
									<Thumbnail submission={record} className="size-8" />
									<span className="truncate font-mono">{record.name}</span>
								</li>
							))}
						</ul>
						{intent?.kind !== "publish" && (
							<label htmlFor="dashboard-review-feedback" className="space-y-2 text-sm font-medium">
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
							<Button variant={intentStyle?.variant} className={intentStyle?.button} disabled={busy} onClick={() => void submit()}>
								{intentStyle && <intentStyle.Icon />}
								{busy ? "Working…" : `${intentStyle?.label} ${intent?.records.length || ""}`}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</MotionConfig>
	)
}
