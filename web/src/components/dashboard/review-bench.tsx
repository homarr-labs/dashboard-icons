"use client"
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flag, MessageSquare, RotateCcw, X } from "lucide-react"
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { dashboardRequest } from "@/hooks/use-dashboard"
import { useSubmissionHints } from "@/hooks/use-submission-catalog"
import type { DashboardFilters } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Empty, Pagination, Thumbnail, Time } from "./primitives"
import { ReviewGallery } from "./review-gallery"
import { ReviewHistory } from "./review-history"
import {
	DecisionBadge,
	type ReviewDraft as Draft,
	type ReviewCandidate,
	ReviewHints,
	reviewReasons as reasons,
	ShortcutLegend,
	sentTogether,
	variantRejection,
	variantSibling,
} from "./review-presentation"
import { FilterInput } from "./submission-list"

const primaryAction = "bg-foreground text-background hover:bg-foreground/90"

export function ReviewBench({
	rows,
	activeId,
	filters,
	totalItems,
	totalPages,
	loaded,
	userId,
	onChange,
	refresh,
}: {
	rows: Submission[]
	activeId: string
	filters: DashboardFilters
	totalItems: number
	totalPages: number
	loaded: boolean
	userId: string
	onChange: (patch: Record<string, string>, replace?: boolean) => void
	refresh: () => Promise<void>
}) {
	const storageKey = `dashboard-review:${userId}`
	const [drafts, setDrafts] = useState<Record<string, Draft>>({})
	const [hydrated, setHydrated] = useState(false)
	const [reasonFor, setReasonFor] = useState<string | null>(null)
	const [notes, setNotes] = useState<Record<string, string>>({})
	const [variantFor, setVariantFor] = useState<string | null>(null)
	const [variantName, setVariantName] = useState("")
	const [confirm, setConfirm] = useState(false)
	const [busy, setBusy] = useState(false)
	const feedbackRef = useRef<HTMLTextAreaElement>(null)
	const actionsRef = useRef<HTMLDivElement>(null)
	const [actionHeight, setActionHeight] = useState(180)
	const [queueOpen, setQueueOpen] = useState(false)
	const heldKeys = useRef(new Set<string>())
	const groups = useMemo(() => sentTogether(rows), [rows])
	const orderedRows = useMemo(() => groups.flatMap((group) => group.rows), [groups])
	const hints = useSubmissionHints()
	const candidates = useMemo(() => {
		const available = new Map<string, ReviewCandidate>()
		for (const row of hints.data || []) if (row.status === "pending") available.set(row.id, row)
		for (const row of rows) available.set(row.id, { id: row.id, name: row.name, contributor: row.expand?.created_by?.username })
		return [...available.values()]
	}, [hints.data, rows])
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [edge, setEdge] = useState<{ page: number; last: boolean } | null>(null)
	const record = orderedRows.find((row) => row.id === activeId) || orderedRows[0]
	const index = orderedRows.findIndex((row) => row.id === record?.id)
	const sibling = variantSibling(record, candidates)
	const note = notes[record?.id] ?? drafts[record?.id]?.note ?? ""
	const decisions = Object.values(drafts)
	const approved = decisions.filter((draft) => draft.status === "approved").length
	const rejected = decisions.length - approved
	useEffect(() => {
		function load() {
			try {
				const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}")
				const valid: Record<string, Draft> = {}
				for (const value of Object.values(saved) as Draft[]) {
					if (
						value &&
						typeof value.id === "string" &&
						typeof value.name === "string" &&
						typeof value.updated === "string" &&
						typeof value.comment === "string" &&
						(value.note === undefined || typeof value.note === "string") &&
						(value.reason === undefined || typeof value.reason === "string") &&
						["approved", "rejected"].includes(value.status)
					)
						valid[value.id] = value
				}
				setDrafts(valid)
			} catch {
				/* An unavailable or outdated local draft must not block review. */
			}
			setHydrated(true)
		}
		load()
		const saved = (event: Event) => {
			if ((event as CustomEvent).detail === storageKey) load()
		}
		window.addEventListener("dashboard-review-saved", saved)
		return () => window.removeEventListener("dashboard-review-saved", saved)
	}, [storageKey])
	useEffect(() => {
		if (!hydrated) return
		try {
			sessionStorage.setItem(storageKey, JSON.stringify(drafts))
		} catch {
			toast.warning("Drafts could not be saved in this browser. Keep this page open until you submit.")
		}
	}, [drafts, hydrated, storageKey])
	useEffect(() => {
		if (!loaded) return
		if (filters.page > Math.max(1, totalPages)) {
			setEdge(null)
			onChange({ page: String(Math.max(1, totalPages)), item: "" }, true)
			return
		}
		if (!orderedRows.length) return
		if (edge && edge.page !== filters.page) return
		if (edge) {
			let target = orderedRows[0]
			if (edge.last) target = orderedRows[orderedRows.length - 1]
			onChange({ item: target.id }, true)
			setEdge(null)
		} else if (!orderedRows.some((row) => row.id === activeId)) onChange({ item: orderedRows[0].id }, true)
	}, [orderedRows, activeId, loaded, edge, filters.page, totalPages, onChange])
	useEffect(() => {
		setReasonFor((current) => {
			if (current !== record?.id) return null
			return current
		})
		setVariantFor(null)
		setVariantName("")
	}, [record?.id])
	useEffect(() => {
		if (!record?.id) return
		const actions = actionsRef.current
		if (!actions) return
		const observer = new ResizeObserver(([entry]) => setActionHeight(Math.ceil(entry.target.getBoundingClientRect().height)))
		observer.observe(actions)
		return () => observer.disconnect()
	}, [record?.id])

	const move = useCallback(
		(direction: number) => {
			if (!loaded || busy) return
			const next = orderedRows[index + direction]
			if (next) onChange({ item: next.id }, true)
			else {
				const page = filters.page + direction
				if (page < 1 || page > totalPages) return
				setEdge({ page, last: direction < 0 })
				onChange({ page: String(page), item: "" }, true)
			}
		},
		[orderedRows, index, filters.page, totalPages, loaded, busy, onChange],
	)
	const stage = useCallback(
		(status: Draft["status"], reason = "") => {
			if (!record || !loaded || busy || !hydrated) return
			if (status === "approved" && !record.assets.length) {
				toast.error("An icon asset is required before approval.")
				return
			}
			if (decisions.length >= 100 && !drafts[record.id]) {
				toast.error("Submit your 100 staged decisions before continuing.")
				return
			}
			const comment = [reason, note.trim()].filter(Boolean).join("\n\n")
			if (comment.length > 10000) {
				toast.error("Feedback must be 10,000 characters or fewer.")
				return
			}
			setDrafts((current) => ({
				...current,
				[record.id]: { id: record.id, name: record.name, updated: record.updated, status, comment, reason, note: note.trim() },
			}))
			setErrors((current) => {
				const next = { ...current }
				delete next[record.id]
				return next
			})
			setReasonFor(null)
			setVariantFor(null)
			move(1)
		},
		[record, loaded, busy, hydrated, decisions.length, drafts, move, note],
	)
	const clear = useCallback((id: string) => {
		setDrafts((current) => {
			const next = { ...current }
			delete next[id]
			return next
		})
		setErrors((current) => {
			const next = { ...current }
			delete next[id]
			return next
		})
	}, [])
	const writeNote = useCallback(() => {
		setReasonFor(null)
		requestAnimationFrame(() => {
			feedbackRef.current?.focus()
			feedbackRef.current?.scrollIntoView({ block: "center" })
		})
	}, [])
	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (
				(queueOpen && window.matchMedia("(max-width: 1023px)").matches) ||
				busy ||
				confirm ||
				variantFor ||
				!hydrated ||
				!loaded ||
				event.defaultPrevented ||
				event.isComposing ||
				event.repeat ||
				heldKeys.current.has(event.code || event.key) ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				target.closest(
					"form,input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=dialog],[role=menu],[role=listbox],[role=combobox]",
				) ||
				document.querySelector(
					"[role=menu][data-state=open],[role=dialog][data-state=open],[role=alertdialog][data-state=open],[role=listbox][data-state=open],dialog[open]",
				)
			)
				return
			heldKeys.current.add(event.code || event.key)
			const key = event.key.toLowerCase()
			if (reasonFor === record?.id && /^[1-9]$/.test(key)) {
				event.preventDefault()
				let reason = reasons[Number(key) - 1]
				if (key === "9" && sibling) reason = variantRejection(sibling.name)
				stage("rejected", reason)
				return
			}
			if (key === "escape") {
				setReasonFor(null)
				return
			}
			if (key === "p") {
				event.preventDefault()
				stage("approved")
				return
			}
			if (key === "x" && record) {
				event.preventDefault()
				if (reasonFor === record.id) stage("rejected")
				else setReasonFor(record.id)
				return
			}
			if (key === "v" && record) {
				event.preventDefault()
				if (sibling) stage("rejected", variantRejection(sibling.name))
				else setVariantFor(record.id)
				return
			}
			if (key === "c" && record) {
				event.preventDefault()
				writeNote()
				return
			}
			if (key === "u" && record) {
				event.preventDefault()
				clear(record.id)
				return
			}
			if (["j", "k"].includes(key)) {
				event.preventDefault()
				let direction = 1
				if (key === "k") direction = -1
				move(direction)
			}
		}
		const keyup = (event: KeyboardEvent) => heldKeys.current.delete(event.code || event.key)
		const blur = () => heldKeys.current.clear()
		window.addEventListener("keydown", keydown)
		window.addEventListener("keyup", keyup)
		window.addEventListener("blur", blur)
		return () => {
			window.removeEventListener("keydown", keydown)
			window.removeEventListener("keyup", keyup)
			window.removeEventListener("blur", blur)
		}
	}, [record, reasonFor, stage, move, clear, busy, confirm, hydrated, loaded, sibling, variantFor, writeNote, queueOpen])
	async function submit() {
		if (decisions.some((draft) => draft.comment.length > 10000)) {
			toast.error("Feedback must be 10,000 characters or fewer.")
			return
		}
		setBusy(true)
		const failures: Record<string, string> = {}
		let successes = 0
		try {
			const groups = new Map<string, Draft[]>()
			for (const draft of decisions) {
				const key = JSON.stringify([draft.status, draft.comment])
				groups.set(key, [...(groups.get(key) || []), draft])
			}
			for (const group of groups.values()) {
				try {
					const result = await dashboardRequest<{ results: { id: string; success: boolean; error?: string }[]; emailFailed?: boolean }>(
						"review",
						{ items: group.map(({ id, updated }) => ({ id, updated })), status: group[0].status, comment: group[0].comment },
					)
					for (const draft of group) {
						const resultRow = result.results.find((row) => row.id === draft.id)
						if (resultRow?.success) {
							clear(draft.id)
							// Persist confirmation even if navigation has unmounted this bench.
							try {
								const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}")
								delete saved[draft.id]
								sessionStorage.setItem(storageKey, JSON.stringify(saved))
								window.dispatchEvent(new CustomEvent("dashboard-review-saved", { detail: storageKey }))
							} catch {
								toast.warning("Decision saved. Local draft storage is unavailable; refresh before retrying.")
							}
							successes++
						} else failures[draft.id] = resultRow?.error || "No confirmation received. Refresh and check this submission before retrying."
					}
					if (result.emailFailed) toast.warning("Decisions saved, but some feedback emails could not be delivered.")
				} catch (error) {
					for (const draft of group) failures[draft.id] = String(error)
				}
			}
			setErrors(failures)
			if (successes) toast.success(`${successes} decisions submitted`)
			if (!Object.keys(failures).length) setConfirm(false)
			await refresh()
			await hints.refetch()
			await revalidateAllSubmissions()
		} catch {
			toast.error("Review saved where confirmed. Refresh to load the latest queue.")
		} finally {
			setBusy(false)
		}
	}
	const queue = (
		<>
			<div className="space-y-2 border-b p-3">
				<p className="text-sm font-medium">Review queue</p>
				<FilterInput
					label="Find in queue"
					compact
					placeholder="Icon or submitter…"
					value={filters.search}
					onChange={(search) => onChange({ search, page: "1", item: "" }, true)}
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					{totalItems} waiting · {decisions.length} staged
				</p>
			</div>
			<div className="max-h-[50dvh] space-y-2 overflow-y-auto overscroll-contain p-2 lg:max-h-[52dvh]">
				{groups.map((group) => (
					<div key={group.key} className={cn("min-w-0", group.rows.length > 1 && "rounded-lg bg-muted/60 p-1")}>
						{group.rows.length > 1 && (
							<div className="space-y-1 px-2 py-2 text-xs text-muted-foreground">
								<p className="font-medium text-foreground">Sent together · {group.rows.length}</p>
								<p className="[overflow-wrap:anywhere]">
									@{group.rows[0].expand?.created_by?.username || "Contributor"} · <Time value={group.rows[0].created} />
								</p>
							</div>
						)}
						<ul className="space-y-1">
							{group.rows.map((row) => (
								<li key={row.id}>
									<button
										type="button"
										disabled={busy || !loaded}
										onClick={(event) => {
											onChange({ item: row.id }, true)
											event.currentTarget.closest("details")?.removeAttribute("open")
										}}
										aria-current={record?.id === row.id || undefined}
										className={cn(
											"flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
											record?.id === row.id && "bg-primary/10 ring-1 ring-primary/40 [&_.text-muted-foreground]:text-foreground/80",
										)}
									>
										<Thumbnail submission={row} />
										<span className="min-w-0 flex-1">
											<span className="block font-mono text-xs [overflow-wrap:anywhere]">{row.name}</span>
											<span className="block text-xs text-muted-foreground">
												{row.assets.length} Variants{row.target_submission && " · Update"}
												{(row.round || 1) > 1 && ` · Round ${row.round}`}
											</span>
											{group.rows.length === 1 && (
												<span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
													@{row.expand?.created_by?.username || "Contributor"}
												</span>
											)}
										</span>
										{drafts[row.id]?.status === "approved" && (
											<Check aria-label="Approval staged" className="size-4 shrink-0 text-emerald-600" />
										)}
										{drafts[row.id]?.status === "rejected" && (
											<X aria-label="Rejection staged" className="size-4 shrink-0 text-amber-600" />
										)}
									</button>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<Pagination
				page={filters.page}
				totalPages={totalPages}
				totalItems={totalItems}
				perPage={filters.perPage}
				disabled={!loaded || busy}
				onPage={(page) => onChange({ page: String(page), item: "" }, true)}
			/>
			<label className="flex items-center justify-between px-3 pb-3 text-xs text-muted-foreground">
				Per page
				<select
					aria-label="Review items per page"
					className="min-h-11 rounded border bg-background px-2"
					value={filters.perPage}
					disabled={busy}
					onChange={(event) => onChange({ size: event.target.value, page: "1", item: "" }, true)}
				>
					{[25, 50, 100].map((size) => (
						<option key={size}>{size}</option>
					))}
				</select>
			</label>
		</>
	)

	return (
		<section
			data-review-bench
			aria-label="Review bench"
			style={{ "--review-action-height": `${actionHeight}px` } as CSSProperties}
			className="space-y-4 pb-[calc(var(--review-action-height)+1rem)] lg:pb-0 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:hover:scale-100 [&_button]:motion-reduce:transition-none [&_input]:min-h-11"
		>
			<div className="grid min-w-0 items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)_240px]">
				<aside aria-label="Review queue" className="relative min-w-0 self-start rounded-xl border bg-background lg:sticky lg:top-0">
					<div className="hidden lg:block">{queue}</div>
					<details className="group lg:hidden" onToggle={(event) => setQueueOpen(event.currentTarget.open)}>
						<summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
							<span className="font-medium">Queue · {totalItems}</span>
							<span className="ml-auto text-xs text-muted-foreground">{decisions.length} staged</span>
							<ChevronDown className="size-4 shrink-0" />
						</summary>
						{queue}
					</details>
				</aside>
				<div className="min-w-0 space-y-4">
					{!record && <Empty title="Queue cleared">No submissions match this queue. You can still submit your staged review.</Empty>}
					{record && (
						<>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">
										Submission {(filters.page - 1) * filters.perPage + index + 1} of {totalItems}
									</p>
									<h2 className="mt-2 font-mono text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{record.name}</h2>
									<p className="mt-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
										By {record.expand?.created_by?.username || "Contributor"} · <Time value={record.created} />
									</p>
									<div className="mt-3">
										<DecisionBadge draft={drafts[record.id]} round={record.round || 1} />
									</div>
									<p className="mt-2 text-sm text-muted-foreground">{record.target_submission ? "Update proposal" : "New Icon"}</p>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										variant="outline"
										size="icon"
										className="size-11"
										aria-label="Previous submission"
										disabled={busy || !loaded || (index === 0 && filters.page === 1)}
										onClick={() => move(-1)}
									>
										<ArrowLeft />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="size-11"
										aria-label="Next submission"
										disabled={busy || !loaded || (index === rows.length - 1 && filters.page >= totalPages)}
										onClick={() => move(1)}
									>
										<ArrowRight />
									</Button>
								</div>
							</div>
							<ReviewHints record={record} rows={candidates} />
							<RejectedRoundComparison key={record.id} record={record} defaultOpen layout="grid" />
							{hints.isError && (
								<output className="block text-xs text-muted-foreground">
									Hints are limited to this queue page while other Submissions are unavailable.
								</output>
							)}
							<ReviewGallery record={record} />
							<div className="space-y-4 text-sm [overflow-wrap:anywhere]">
								<p className="whitespace-pre-wrap leading-6">{record.description || "No description provided."}</p>
								<dl className="mt-3 grid gap-3 sm:grid-cols-2">
									{record.target_submission && (
										<div>
											<dt className="text-xs text-muted-foreground">Proposed update to submission</dt>
											<dd>
												<a
													href={`/community/submissions/${record.target_submission}`}
													target="_blank"
													rel="noreferrer"
													className="break-all font-mono underline"
												>
													{record.target_submission}
												</a>
											</dd>
										</div>
									)}
									<div>
										<dt className="text-xs text-muted-foreground">Categories</dt>
										<dd className="break-words">{record.extras?.categories?.join(", ") || "None"}</dd>
									</div>
									<div>
										<dt className="text-xs text-muted-foreground">Aliases</dt>
										<dd className="break-words">{record.extras?.aliases?.join(", ") || "None"}</dd>
									</div>
								</dl>
								{record.admin_comment && (
									<p className="mt-3 whitespace-pre-wrap break-words border-t pt-3">Previous feedback: {record.admin_comment}</p>
								)}
								<ReviewHistory key={record.id} record={record} filters={filters} />
								<div className="space-y-2">
									<label htmlFor="review-note" className="text-xs font-medium">
										Note to the contributor (optional)
									</label>
									<Textarea
										ref={feedbackRef}
										id="review-note"
										maxLength={10000}
										rows={3}
										disabled={busy}
										value={note}
										onChange={(event) => {
											const comment = event.target.value
											setNotes((current) => ({ ...current, [record.id]: comment }))
											if (drafts[record.id])
												setDrafts((current) => ({
													...current,
													[record.id]: {
														...current[record.id],
														note: comment,
														comment: [current[record.id].reason, comment].filter(Boolean).join("\n\n"),
													},
												}))
										}}
										placeholder="Sent with your decision"
										className="scroll-mb-[calc(var(--review-action-height)+1.5rem)] placeholder:text-muted-foreground"
									/>
								</div>
							</div>
							<div
								ref={actionsRef}
								data-review-actions
								className={cn(
									"fixed inset-x-3 bottom-0 z-20 max-h-[calc(100dvh-5rem)] space-y-3 overflow-y-auto rounded-xl border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:sticky lg:inset-x-auto",
									queueOpen && "max-lg:hidden",
								)}
							>
								{reasonFor === record.id && (
									<fieldset aria-label="Rejection reason" className="space-y-2">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-medium">Reject and invite a resubmission</h3>
											<Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>
												Cancel · Esc
											</Button>
										</div>
										<p className="text-xs leading-5 text-muted-foreground">
											The contributor can fix and resubmit this Submission. Pick a reason or reject without one.
										</p>
										<div className="grid max-h-[28dvh] gap-1 overflow-y-auto overscroll-contain p-1 sm:grid-cols-2">
											{reasons.map((text, index) => (
												<button
													type="button"
													key={text}
													disabled={busy}
													className="min-h-11 rounded border px-3 py-2 text-left text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [overflow-wrap:anywhere]"
													onClick={() => stage("rejected", index === 8 && sibling ? variantRejection(sibling.name) : text)}
												>
													<kbd className="mr-2 font-mono text-muted-foreground">{index + 1}</kbd>
													{text}
												</button>
											))}
										</div>
										<div className="flex flex-wrap gap-2">
											{note.trim() && (
												<Button size="sm" variant="destructive" disabled={busy} onClick={() => stage("rejected")}>
													Reject with note & next
												</Button>
											)}
											<Button size="sm" variant="outline" className="flex-1" onClick={() => stage("rejected")}>
												Reject without a reason · X
											</Button>
										</div>
									</fieldset>
								)}
								<div className="flex flex-wrap items-center gap-2">
									<Button
										className={cn("flex-1", primaryAction)}
										disabled={busy || !loaded || !hydrated || !record.assets.length}
										onClick={() => stage("approved")}
									>
										<Check className="size-4" />
										Approve & next <kbd className="ml-1 text-xs opacity-70">P</kbd>
									</Button>
									<Button
										variant="outline"
										className="flex-1"
										disabled={busy || !loaded || !hydrated}
										onClick={() => {
											setReasonFor(record.id)
										}}
									>
										<X className="size-4" />
										Reject <kbd className="ml-1 text-xs text-muted-foreground">X</kbd>
									</Button>
									<div className="flex w-full gap-2 xl:w-auto">
										<Button variant="ghost" size="icon" className="size-11" aria-label="Write a note" disabled={busy} onClick={writeNote}>
											<MessageSquare className="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="size-11"
											aria-label="Unflag this Submission"
											disabled={busy || !drafts[record.id]}
											onClick={() => clear(record.id)}
										>
											<RotateCcw className="size-4" />
										</Button>
										<Button
											className="flex-1 xl:hidden"
											variant="secondary"
											disabled={!decisions.length || busy || !hydrated}
											onClick={() => setConfirm(true)}
										>
											<Flag className="size-4" />
											Submit review · {decisions.length}
										</Button>
									</div>
								</div>
								<p className="text-xs leading-5 text-muted-foreground">
									Decisions stay staged until you submit review. Approving does not publish.
								</p>
							</div>
						</>
					)}
					<div className="xl:hidden">
						<ShortcutLegend />
					</div>
					{!record && (
						<Button className={primaryAction} disabled={!decisions.length || busy || !hydrated} onClick={() => setConfirm(true)}>
							Submit review · {decisions.length}
						</Button>
					)}
				</div>
				<aside
					aria-label="Staged decisions"
					className="hidden min-w-0 space-y-4 rounded-xl border bg-background p-3 xl:sticky xl:top-0 xl:block"
				>
					<Button
						className={cn("w-full", primaryAction)}
						disabled={!decisions.length || busy || !hydrated}
						onClick={() => setConfirm(true)}
					>
						<Flag className="size-4" />
						Submit review · {decisions.length}
					</Button>
					<p className="text-xs leading-5 text-muted-foreground">
						Approving does not publish. Decisions are sent together after confirmation.
					</p>
					<ul className="max-h-[42dvh] space-y-2 overflow-y-auto overscroll-contain">
						{!decisions.length && (
							<li className="py-4 text-sm text-muted-foreground">Approve with P or reject with X. Your staged decisions appear here.</li>
						)}
						{decisions.map((draft) => (
							<li key={draft.id} className="space-y-2 rounded-lg bg-muted/60 p-2 text-xs">
								<div className="flex items-start gap-1">
									<p className="min-w-0 flex-1 py-3 font-mono [overflow-wrap:anywhere]">{draft.name}</p>
									<Button
										variant="ghost"
										size="icon"
										className="size-11"
										aria-label={`Unflag ${draft.name}`}
										disabled={busy}
										onClick={() => clear(draft.id)}
									>
										<RotateCcw className="size-3.5" />
									</Button>
								</div>
								<DecisionBadge draft={draft} />
								{draft.comment && <p className="whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{draft.comment}</p>}
								{draft.status === "rejected" && <p className="text-muted-foreground">Contributor can fix and resubmit.</p>}
							</li>
						))}
					</ul>
					<ShortcutLegend />
				</aside>
			</div>
			<Dialog
				open={variantFor === record?.id}
				onOpenChange={(open) => {
					if (!open) setVariantFor(null)
				}}
			>
				<DialogContent className="max-h-[85dvh] overflow-y-auto [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:hover:scale-100">
					<DialogTitle>Reject as a Variant</DialogTitle>
					<DialogDescription>The contributor can fix and resubmit this Submission as a Variant of an existing Icon.</DialogDescription>
					<label htmlFor="review-variant-parent" className="space-y-2 text-sm font-medium">
						Existing Icon slug
						<input
							id="review-variant-parent"
							value={variantName}
							onChange={(event) => setVariantName(event.target.value)}
							className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
							placeholder="existing-icon"
							maxLength={80}
						/>
					</label>
					<DialogFooter>
						<Button variant="outline" className="min-h-11" onClick={() => setVariantFor(null)}>
							Cancel
						</Button>
						<Button
							className={cn("min-h-11", primaryAction)}
							disabled={!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(variantName) || variantName === record?.name}
							onClick={() => stage("rejected", variantRejection(variantName))}
						>
							Stage rejection & next
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={confirm}
				onOpenChange={(open) => {
					if (!busy) setConfirm(open)
				}}
			>
				<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:hover:scale-100">
					<DialogTitle>Submit review</DialogTitle>
					<DialogDescription>
						{approved} approvals · {rejected} rejections. Contributors can fix and resubmit any rejected Submission. Approving does not
						publish.
					</DialogDescription>
					<div className="space-y-2">
						{decisions.map((draft) => (
							<div key={draft.id} className="rounded-lg border p-3 [overflow-wrap:anywhere]">
								<div className="flex items-center justify-between gap-2">
									<span className="min-w-0 break-words text-sm font-medium">
										{draft.name} · {draft.status}
									</span>
									<Button size="sm" variant="ghost" disabled={busy} onClick={() => clear(draft.id)}>
										Remove
									</Button>
								</div>
								{draft.status === "rejected" && (
									<p className="mt-1 text-xs leading-5 text-muted-foreground">The contributor can fix and resubmit this Submission.</p>
								)}
								<label htmlFor={`review-feedback-${draft.id}`} className="mt-2 block text-xs text-muted-foreground">
									Feedback (optional)
									<Textarea
										maxLength={10000}
										disabled={busy}
										id={`review-feedback-${draft.id}`}
										value={draft.comment}
										onChange={(event) => {
											const comment = event.target.value
											setDrafts((current) => ({ ...current, [draft.id]: { ...draft, comment, reason: "", note: comment } }))
											setNotes((current) => ({ ...current, [draft.id]: comment }))
										}}
									/>
								</label>
								{errors[draft.id] && (
									<p role="alert" className="mt-2 text-xs text-destructive">
										{errors[draft.id]} Remove this flag and review the current submission again if it changed.
									</p>
								)}
							</div>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
							Keep reviewing
						</Button>
						<Button className={primaryAction} disabled={busy || !decisions.length} onClick={() => void submit()}>
							{busy ? "Submitting…" : `Submit ${decisions.length} decisions`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	)
}
