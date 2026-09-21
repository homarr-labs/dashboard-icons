"use client"
import { ArrowLeft, ArrowRight, Check, Flag, RotateCcw, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { dashboardRequest } from "@/hooks/use-dashboard"
import type { DashboardFilters } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Empty, Pagination, Thumbnail, Time } from "./primitives"
import { ReviewGallery } from "./review-gallery"
import { FilterInput } from "./submission-list"

type Draft = { id: string; name: string; updated: string; status: "approved" | "rejected"; comment: string }
const reasons = [
	"Please provide a clean SVG vector file.",
	"Please remove the background and use transparency.",
	"The icon is too small or blurry. Please upload a higher-quality asset.",
	"This icon is already in the collection.",
	"Please use the official logo and correct its proportions.",
]

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
	const [reason, setReason] = useState("")
	const [confirm, setConfirm] = useState(false)
	const [busy, setBusy] = useState(false)
	const feedbackRef = useRef<HTMLTextAreaElement>(null)
	const [focusFeedback, setFocusFeedback] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [edge, setEdge] = useState<{ page: number; last: boolean } | null>(null)
	const record = rows.find((row) => row.id === activeId) || rows[0]
	const index = rows.findIndex((row) => row.id === record?.id)
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
		if (!rows.length) return
		if (edge && edge.page !== filters.page) return
		if (edge) {
			let target = rows[0]
			if (edge.last) target = rows[rows.length - 1]
			onChange({ item: target.id }, true)
			setEdge(null)
		} else if (!rows.some((row) => row.id === activeId)) onChange({ item: rows[0].id }, true)
	}, [rows, activeId, loaded, edge, filters.page, totalPages, onChange])
	useEffect(() => {
		setReasonFor((current) => {
			if (current !== record?.id) return null
			return current
		})
		setReason("")
	}, [record?.id])
	useEffect(() => {
		if (focusFeedback && reasonFor === record?.id) {
			feedbackRef.current?.focus()
			setFocusFeedback(false)
		}
	}, [focusFeedback, reasonFor, record?.id])

	const move = useCallback(
		(direction: number) => {
			if (!loaded || busy) return
			const next = rows[index + direction]
			if (next) onChange({ item: next.id }, true)
			else {
				const page = filters.page + direction
				if (page < 1 || page > totalPages) return
				setEdge({ page, last: direction < 0 })
				onChange({ page: String(page), item: "" }, true)
			}
		},
		[rows, index, filters.page, totalPages, loaded, busy, onChange],
	)
	const stage = useCallback(
		(status: Draft["status"], comment = "") => {
			if (!record || !loaded || busy || !hydrated) return
			if (status === "approved" && !record.assets.length) {
				toast.error("An icon asset is required before approval.")
				return
			}
			if (decisions.length >= 100 && !drafts[record.id]) {
				toast.error("Submit your 100 staged decisions before continuing.")
				return
			}
			setDrafts((current) => ({ ...current, [record.id]: { id: record.id, name: record.name, updated: record.updated, status, comment } }))
			setErrors((current) => {
				const next = { ...current }
				delete next[record.id]
				return next
			})
			setReasonFor(null)
			move(1)
		},
		[record, loaded, busy, hydrated, decisions.length, drafts, move],
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
	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement
			if (event.key === "Escape" && target === feedbackRef.current && !busy && !confirm) {
				event.preventDefault()
				feedbackRef.current?.blur()
				setReasonFor(null)
				return
			}
			if (
				busy ||
				confirm ||
				!hydrated ||
				!loaded ||
				event.repeat ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				target.closest("input,textarea,select,[contenteditable=true],[role=dialog],[role=menu]")
			)
				return
			const key = event.key.toLowerCase()
			if (reasonFor && /^[1-5]$/.test(key)) {
				event.preventDefault()
				stage("rejected", reasons[Number(key) - 1])
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
				if (event.shiftKey || reasonFor === record.id) stage("rejected")
				else {
					setReason("")
					setReasonFor(record.id)
				}
				return
			}
			if (key === "c" && record) {
				event.preventDefault()
				setReasonFor(record.id)
				setFocusFeedback(true)
				return
			}
			if (key === "u" && record) {
				event.preventDefault()
				clear(record.id)
				return
			}
			if (["j", "arrowright", "arrowdown", "k", "arrowleft", "arrowup"].includes(key)) {
				event.preventDefault()
				let direction = 1
				if (key === "k" || key === "arrowleft" || key === "arrowup") direction = -1
				move(direction)
			}
		}
		window.addEventListener("keydown", keydown)
		return () => window.removeEventListener("keydown", keydown)
	}, [record, reasonFor, stage, move, clear, busy, confirm, hydrated, loaded])
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
				<Button className="hidden lg:inline-flex" disabled={!decisions.length || busy || !hydrated} onClick={() => setConfirm(true)}>
					<Flag className="size-4" />
					Submit review · {decisions.length}
				</Button>
				<FilterInput
					label="Find in queue"
					compact
					placeholder="Icon or submitter…"
					value={filters.search}
					onChange={(search) => onChange({ search, page: "1", item: "" }, true)}
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					{totalItems} waiting · {approved} approved · {rejected} rejected
				</p>
			</div>
			<div className="flex max-h-28 gap-1 overflow-x-auto p-2 lg:max-h-[52vh] lg:flex-col lg:overflow-y-auto">
				{rows.map((row) => (
					<button
						type="button"
						key={row.id}
						disabled={busy || !loaded}
						onClick={() => onChange({ item: row.id }, true)}
						aria-current={record?.id === row.id}
						className={cn(
							"flex w-44 shrink-0 items-center gap-2 rounded-lg border border-transparent p-2 text-left lg:w-full",
							record?.id === row.id && "border-primary/40 bg-primary/5",
							"hover:bg-muted",
						)}
					>
						<Thumbnail submission={row} />
						<span className="min-w-0 flex-1">
							<span className="block truncate text-xs font-medium">{row.name}</span>
							<span className="block text-[10px] text-muted-foreground">{row.assets.length} assets</span>
						</span>
						{drafts[row.id]?.status === "approved" && (
							<Check aria-label="Flagged for approval" className="size-4 shrink-0 text-emerald-600" />
						)}
						{drafts[row.id]?.status === "rejected" && <X aria-label="Flagged for rejection" className="size-4 shrink-0 text-red-500" />}
					</button>
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
					className="rounded border bg-background p-1"
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
		<section data-review-bench aria-label="Review bench" className="space-y-4 pb-36 lg:pb-0">
			<div className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
				<aside aria-label="Review queue" className="relative min-w-0 self-start rounded-xl border bg-background lg:sticky lg:top-24">
					<div className="hidden lg:block">{queue}</div>
					<div className="absolute right-2 top-2 lg:hidden">
						{" "}
						<Button disabled={!decisions.length || busy || !hydrated} onClick={() => setConfirm(true)}>
							<Flag className="size-4" />
							Submit · {decisions.length}
						</Button>
					</div>
					<details className="lg:hidden">
						<summary className="flex min-h-14 cursor-pointer items-center py-3 pl-3 pr-32 text-xs font-medium">
							Queue · {totalItems}
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
									<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
										Submission {(filters.page - 1) * filters.perPage + index + 1} of {totalItems}
									</p>
									<h2 className="break-words text-2xl font-semibold sm:text-3xl">{record.name}</h2>
									<p className="mt-1 text-xs text-muted-foreground">
										By {record.expand?.created_by?.username || "Contributor"} · <Time value={record.created} />
									</p>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										variant="outline"
										size="icon"
										aria-label="Previous submission"
										disabled={busy || !loaded || (index === 0 && filters.page === 1)}
										onClick={() => move(-1)}
									>
										<ArrowLeft />
									</Button>
									<Button
										variant="outline"
										size="icon"
										aria-label="Next submission"
										disabled={busy || !loaded || (index === rows.length - 1 && filters.page >= totalPages)}
										onClick={() => move(1)}
									>
										<ArrowRight />
									</Button>
								</div>
							</div>
							{drafts[record.id] && (
								<div aria-live="polite" className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
									<span>Draft: {drafts[record.id].status}</span>
									<Button variant="ghost" size="sm" disabled={busy} onClick={() => clear(record.id)}>
										<RotateCcw className="size-3" />
										Clear
									</Button>
								</div>
							)}
							<ReviewGallery record={record} />
							<div className="rounded-xl border bg-background p-4 text-sm">
								<p className="whitespace-pre-wrap break-words leading-6">{record.description || "No description provided."}</p>
								<dl className="mt-3 grid gap-3 sm:grid-cols-2">
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
							</div>
							<div className="sticky bottom-0 z-20 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 space-y-3 rounded-xl border bg-background p-3 shadow-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]">
								{reasonFor === record.id && (
									<fieldset aria-label="Rejection reason" className="max-h-[50dvh] space-y-2 overflow-y-auto">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-medium">Feedback for the contributor</h3>
											<Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>
												Cancel · Esc
											</Button>
										</div>
										<div className="grid gap-1 sm:grid-cols-2">
											{reasons.map((text, index) => (
												<button
													type="button"
													key={text}
													disabled={busy}
													className="rounded border px-3 py-2 text-left text-xs hover:bg-muted"
													onClick={() => stage("rejected", text)}
												>
													<kbd className="mr-2 font-mono text-muted-foreground">{index + 1}</kbd>
													{text}
												</button>
											))}
										</div>
										<Textarea
											ref={feedbackRef}
											maxLength={10000}
											aria-label="Custom rejection feedback"
											value={reason}
											onChange={(event) => setReason(event.target.value)}
											placeholder="Write feedback… (C)"
										/>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="destructive"
												disabled={!reason.trim() || busy}
												onClick={() => stage("rejected", reason.trim())}
											>
												Use feedback & next
											</Button>
											<Button size="sm" variant="outline" onClick={() => stage("rejected")}>
												No reason & next · X
											</Button>
										</div>
									</fieldset>
								)}
								<div className="flex flex-wrap items-center gap-2">
									<Button
										className="flex-1"
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
											setReason("")
											setReasonFor(record.id)
										}}
									>
										<X className="size-4" />
										Reject <kbd className="ml-1 text-xs text-muted-foreground">X</kbd>
									</Button>
								</div>
								<p className="text-center text-xs leading-relaxed text-muted-foreground">
									← ↑ / ↓ → navigate · P approve · X reject · X again no message · C write feedback · 1–5 reason · U unflag
								</p>
								<p className="text-center text-xs text-muted-foreground">Decisions stay in draft until you submit review.</p>
							</div>
						</>
					)}
				</div>
			</div>
			<Dialog
				open={confirm}
				onOpenChange={(open) => {
					if (!busy) setConfirm(open)
				}}
			>
				<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
					<DialogTitle>Submit review</DialogTitle>
					<DialogDescription>
						{approved} approvals · {rejected} rejections. Feedback is sent to contributors. Approved icons are not published automatically.
					</DialogDescription>
					<div className="space-y-2">
						{decisions.map((draft) => (
							<div key={draft.id} className="rounded-lg border p-3">
								<div className="flex items-center justify-between gap-2">
									<span className="min-w-0 break-words text-sm font-medium">
										{draft.name} · {draft.status}
									</span>
									<Button size="sm" variant="ghost" disabled={busy} onClick={() => clear(draft.id)}>
										Remove
									</Button>
								</div>
								<label htmlFor={`review-feedback-${draft.id}`} className="mt-2 block text-xs text-muted-foreground">
									Feedback (optional)
									<Textarea
										maxLength={10000}
										disabled={busy}
										id={`review-feedback-${draft.id}`}
										value={draft.comment}
										onChange={(event) => setDrafts((current) => ({ ...current, [draft.id]: { ...draft, comment: event.target.value } }))}
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
						<Button disabled={busy || !decisions.length} onClick={() => void submit()}>
							{busy ? "Submitting…" : `Submit ${decisions.length} decisions`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	)
}
