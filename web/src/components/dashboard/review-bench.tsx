"use client"
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flag, MessageSquare, Pencil, RotateCcw, X } from "lucide-react"
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { reviewSubmissions } from "@/hooks/use-dashboard"
import { useReviewShortcuts } from "@/hooks/use-review-shortcuts"
import { useSubmissionCatalog, useSubmissionHints } from "@/hooks/use-submission-catalog"
import {
	changeReviewVariant,
	isReviewFixups,
	normalizeReviewFixups,
	reviewFixupError,
	reviewFixupPreview,
	reviewFixupsUnavailable,
	undoReviewFixup,
} from "@/lib/dashboard/review-fixup-draft"
import type { DashboardFilters, ReviewFixups } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Empty, Pagination, Thumbnail, Time } from "./primitives"
import { ReviewFixupSummary, ReviewMetadataEditor, ReviewRenameEditor } from "./review-fixup-editors"
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
import { ReviewSubmitDialog } from "./review-submit-dialog"
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
	const [renaming, setRenaming] = useState(false)
	const [selectedFile, setSelectedFile] = useState("")
	const [fixupError, setFixupError] = useState("")
	const feedbackRef = useRef<HTMLTextAreaElement>(null)
	const actionsRef = useRef<HTMLDivElement>(null)
	const [actionHeight, setActionHeight] = useState(180)
	const [queueOpen, setQueueOpen] = useState(false)
	const groups = useMemo(() => sentTogether(rows), [rows])
	const orderedRows = useMemo(() => groups.flatMap((group) => group.rows), [groups])
	const hints = useSubmissionHints()
	const catalog = useSubmissionCatalog()
	const candidates = useMemo(() => {
		const available = new Map<string, ReviewCandidate>()
		for (const row of hints.data || []) if (row.status === "pending") available.set(row.id, row)
		for (const row of rows) available.set(row.id, { id: row.id, name: row.name, contributor: row.expand?.created_by?.username })
		return [...available.values()]
	}, [hints.data, rows])
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [edge, setEdge] = useState<{ page: number; last: boolean } | null>(null)
	const record = orderedRows.find((row) => row.id === activeId) || orderedRows[0]
	const [updateReady, setUpdateReady] = useState("")
	const canApproveTarget = !record?.icon_update || updateReady === `${record.id}:${record.updated}`
	const targetReady = useCallback(
		(ready: boolean) => {
			if (ready && record) setUpdateReady(`${record.id}:${record.updated}`)
			else setUpdateReady("")
		},
		[record],
	)
	const index = orderedRows.findIndex((row) => row.id === record?.id)
	const sibling = variantSibling(record, candidates)
	const note = notes[record?.id] ?? drafts[record?.id]?.note ?? ""
	const fixups = drafts[record?.id]?.fixups || {}
	const preview = record && reviewFixupPreview(record, fixups)
	let unavailable = record && reviewFixupsUnavailable(record, catalog.data?.names)
	if (record && !unavailable && !catalog.data) {
		unavailable = "Checking published Icon names before enabling fix-ups."
		if (catalog.isError) unavailable = "Published Icon names are unavailable. Reload the page to enable fix-ups for new Icons."
	}
	const stale = !!record && !!drafts[record.id] && drafts[record.id].updated !== record.updated
	const fixupsDisabled = busy || !loaded || !hydrated || stale || !!unavailable
	const selectedAsset = preview?.assets.find((asset) => asset.file === selectedFile) || preview?.assets[0]
	const decisions = Object.values(drafts).filter((draft): draft is Draft & { status: "approved" | "rejected" } => !!draft.status)
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
						(value.fixups === undefined || isReviewFixups(value.fixups)) &&
						(value.fixupSummary === undefined ||
							(Array.isArray(value.fixupSummary) && value.fixupSummary.every((entry) => typeof entry === "string"))) &&
						(value.status === undefined || ["approved", "rejected"].includes(value.status))
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
		setRenaming(false)
		setSelectedFile("")
		setFixupError("")
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
		(status: NonNullable<Draft["status"]>, reason = "") => {
			if (!record || !loaded || busy || !hydrated) return
			if (status === "approved" && !canApproveTarget) {
				toast.error("Load the current target Icon before approving this proposal.")
				return
			}
			if (status === "approved" && !record.assets.length && !record.icon_update) {
				toast.error("An icon asset is required before approval.")
				return
			}
			if (decisions.length >= 100 && !drafts[record.id]?.status) {
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
				[record.id]: {
					...current[record.id],
					id: record.id,
					name: record.name,
					updated: current[record.id]?.updated || record.updated,
					status,
					comment,
					reason,
					note: note.trim(),
				},
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
		[record, loaded, busy, hydrated, decisions.length, drafts, move, note, canApproveTarget],
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
		setFixupError("")
	}, [])
	const changeFixups = useCallback(
		(next: ReviewFixups) => {
			if (!record || fixupsDisabled) return false
			const normalized = normalizeReviewFixups(record, next)
			const invalid = reviewFixupError(record, normalized)
			if (invalid) {
				setFixupError(invalid)
				return false
			}
			const summary = reviewFixupPreview(record, normalized).changes.map((change) => change.text)
			setDrafts((current) => ({
				...current,
				[record.id]: {
					...current[record.id],
					id: record.id,
					name: record.name,
					updated: current[record.id]?.updated || record.updated,
					comment: current[record.id]?.comment || "",
					note,
					fixups: normalized,
					fixupSummary: summary,
				},
			}))
			setFixupError("")
			setErrors((current) => {
				const next = { ...current }
				delete next[record.id]
				return next
			})
			return true
		},
		[record, fixupsDisabled, note],
	)
	const dropVariant = useCallback(
		(file: string) => {
			changeFixups(changeReviewVariant(fixups, { action: "drop", file }))
		},
		[changeFixups, fixups],
	)
	const writeNote = useCallback(() => {
		setReasonFor(null)
		requestAnimationFrame(() => {
			feedbackRef.current?.focus()
			feedbackRef.current?.scrollIntoView({ block: "center" })
		})
	}, [])
	useReviewShortcuts({
		disabled: busy || confirm || !!variantFor || !hydrated || !loaded,
		queueOpen,
		recordId: record?.id,
		reasonOpen: reasonFor === record?.id,
		siblingName: sibling?.name,
		canFixup: !fixupsDisabled,
		selectedFile: selectedAsset?.file,
		stage,
		onReason: setReasonFor,
		onVariantPrompt: setVariantFor,
		onRename: () => setRenaming(true),
		onDrop: dropVariant,
		move,
		clear,
		writeNote,
	})
	async function submit() {
		if (decisions.some((draft) => draft.comment.length > 10000)) {
			toast.error("Feedback must be 10,000 characters or fewer.")
			return
		}
		setBusy(true)
		const failures: Record<string, string> = {}
		let successes = 0
		try {
			const groups = new Map<string, (Draft & { status: "approved" | "rejected" })[]>()
			for (const draft of decisions) {
				const key = JSON.stringify([draft.status, draft.comment])
				groups.set(key, [...(groups.get(key) || []), draft])
			}
			for (const group of groups.values()) {
				try {
					const result = await reviewSubmissions({
						items: group.map(({ id, updated, fixups }) => ({ id, updated, fixups })),
						status: group[0].status,
						comment: group[0].comment,
					})
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
			if (successes) toast.success(`Review submitted · ${successes} saved`)
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
											<span className="block font-mono text-xs [overflow-wrap:anywhere]">{drafts[row.id]?.fixups?.name || row.name}</span>
											<span className="block text-xs text-muted-foreground">
												{row.assets.length - (drafts[row.id]?.fixups?.variants?.filter((change) => change.action === "drop").length || 0)}{" "}
												Variants{row.target_submission && " · Update"}
												{(row.round || 1) > 1 && ` · Round ${row.round}`}
												{!!drafts[row.id]?.fixupSummary?.length && " · Fix-ups"}
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
			className="space-y-4 pb-[calc(var(--review-action-height)+1rem)] [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:scroll-mb-[calc(var(--review-action-height)+1.5rem)] [&_button]:hover:scale-100 [&_button]:motion-reduce:transition-none [&_input]:min-h-11 [&_input]:scroll-mb-[calc(var(--review-action-height)+1.5rem)] [&_textarea]:scroll-mb-[calc(var(--review-action-height)+1.5rem)] [&_summary]:scroll-mb-[calc(var(--review-action-height)+1.5rem)]"
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
									<h2 className="mt-2 font-mono text-2xl font-semibold [overflow-wrap:anywhere] sm:text-3xl">{preview?.record.name}</h2>
									{fixups.name && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">Submitted as {record.name}</p>}
									{!renaming && (
										<Button variant="ghost" className="mt-1 -ml-3" disabled={fixupsDisabled} onClick={() => setRenaming(true)}>
											<Pencil className="size-3.5" />
											Rename slug <kbd className="text-xs text-muted-foreground">E</kbd>
										</Button>
									)}
									{renaming && (
										<ReviewRenameEditor
											key={record.id}
											name={fixups.name || record.name}
											onStage={(name) => changeFixups({ ...fixups, name })}
											onCancel={() => setRenaming(false)}
										/>
									)}
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
							{unavailable && <p className="rounded-lg bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">{unavailable}</p>}
							{stale && (
								<div role="alert" className="space-y-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
									<p>This Submission changed after your draft was saved. Discard the draft before editing the current version.</p>
									<Button
										variant="outline"
										disabled={busy}
										onClick={() => {
											clear(record.id)
											void refresh()
										}}
									>
										Discard stale draft
									</Button>
								</div>
							)}
							<ReviewGallery
								key={record.id}
								record={record}
								onTargetReady={targetReady}
								edit={
									!unavailable
										? {
												fixups,
												selectedFile: selectedAsset?.file || "",
												disabled: fixupsDisabled,
												onSelect: setSelectedFile,
												onRetag: (file, variant) => changeFixups(changeReviewVariant(fixups, { action: "retag", file, variant })),
												onDrop: dropVariant,
												onUndo: (file) => changeFixups(undoReviewFixup(fixups, `variant:${file}`)),
											}
										: undefined
								}
							/>
							{(fixupError || errors[record.id]) && (
								<p role="alert" className="text-sm leading-6 text-destructive">
									{fixupError || errors[record.id]}
								</p>
							)}
							<ReviewFixupSummary
								changes={preview?.changes || []}
								onUndo={(key) => changeFixups(undoReviewFixup(fixups, key))}
								disabled={fixupsDisabled}
							/>
							<div className="space-y-4 text-sm [overflow-wrap:anywhere]">
								<p className="whitespace-pre-wrap leading-6">{record.description || "No description provided."}</p>
								{!record.icon_update && (
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
											<dd className="break-words">{preview?.record.extras?.categories?.join(", ") || "None"}</dd>
										</div>
										<div>
											<dt className="text-xs text-muted-foreground">Aliases</dt>
											<dd className="break-words">{preview?.record.extras?.aliases?.join(", ") || "None"}</dd>
										</div>
									</dl>
								)}
								{!unavailable && (
									<ReviewMetadataEditor
										key={`${record.id}:${JSON.stringify([fixups.aliases, fixups.categories])}`}
										aliases={preview?.record.extras.aliases || []}
										categories={preview?.record.extras.categories || []}
										disabled={fixupsDisabled}
										onStage={(metadata) => changeFixups({ ...fixups, ...metadata })}
									/>
								)}
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
										disabled={busy || !loaded || !hydrated || !canApproveTarget || (!record.assets.length && !record.icon_update)}
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
											aria-label="Undo this review"
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
									Decisions and fix-ups stay staged until you submit review. Approving does not publish.
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
									<p className="min-w-0 flex-1 py-3 font-mono [overflow-wrap:anywhere]">{draft.fixups?.name || draft.name}</p>
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
								{!!draft.fixupSummary?.length && (
									<ul className="space-y-1 text-muted-foreground">
										{draft.fixupSummary.map((text) => (
											<li key={text} className="[overflow-wrap:anywhere]">
												{text}
											</li>
										))}
									</ul>
								)}
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
			<ReviewSubmitDialog
				open={confirm}
				onOpenChange={setConfirm}
				busy={busy}
				decisions={decisions}
				errors={errors}
				onRemove={clear}
				onComment={(draft, comment) => {
					setDrafts((current) => ({ ...current, [draft.id]: { ...draft, comment, reason: "", note: comment } }))
					setNotes((current) => ({ ...current, [draft.id]: comment }))
				}}
				onSubmit={() => void submit()}
			/>
		</section>
	)
}
