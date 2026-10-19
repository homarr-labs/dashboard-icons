"use client"
import confetti from "canvas-confetti"
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ChevronDown,
	FileText,
	Flag,
	Layers,
	MessageSquare,
	PartyPopper,
	Pencil,
	Rocket,
	RotateCcw,
	SearchX,
	X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
	reviewRenameUnavailable,
	undoReviewFixup,
} from "@/lib/dashboard/review-fixup-draft"
import type { DashboardFilters, ReviewFixups } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Avatar, Empty, fileCount, Kbd, Kind, Round, statusStyles, Thumbnail, Time } from "./primitives"
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
import { QueueGallery, ReviewQueue, StagedMark } from "./review-queue"
import { ReviewSubmitDialog } from "./review-submit-dialog"

const scrollMargin =
	"max-lg:[&_:is(button,input,textarea,summary,a)]:scroll-mb-[calc(var(--review-action-height)+1.5rem)] lg:[&_:is(button,input,textarea,summary,a)]:scroll-mb-4"

export function ReviewBench({
	rows,
	activeId,
	filters,
	loaded,
	userId,
	onChange,
	refresh,
	approvedCount,
	onPublish,
}: {
	rows: Submission[]
	activeId: string
	filters: DashboardFilters
	loaded: boolean
	userId: string
	onChange: (patch: Record<string, string>, replace?: boolean) => void
	refresh: () => Promise<void>
	approvedCount: number
	onPublish: () => void
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
	const [gallery, setGallery] = useState(false)
	const [flash, setFlash] = useState<{ key: number; name: string; status: "approved" | "rejected" } | null>(null)
	const feedbackRef = useRef<HTMLTextAreaElement>(null)
	const actionsRef = useRef<HTMLDivElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const hadRows = useRef(false)
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
	const renameUnavailable = record && reviewRenameUnavailable(record)
	let unavailable = record && reviewFixupsUnavailable(record, catalog.data?.names)
	if (record && !unavailable && !catalog.data) {
		unavailable = "Checking published Icon names before enabling fix-ups."
		if (catalog.isError) unavailable = "Published Icon names are unavailable. Reload the page to enable fix-ups for new Icons."
	}
	const stale = !!record && !!drafts[record.id] && drafts[record.id].updated !== record.updated
	const fixupsDisabled = busy || !loaded || !hydrated || stale || !!unavailable
	const selectedAsset = preview?.assets.find((asset) => asset.file === selectedFile) || preview?.assets[0]
	const decisions = Object.values(drafts).filter((draft): draft is Draft & { status: "approved" | "rejected" } => !!draft.status)
	const approvals = decisions.filter((draft) => draft.status === "approved").length
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
		if (!loaded || !orderedRows.length) return
		if (!orderedRows.some((row) => row.id === activeId)) onChange({ item: orderedRows[0].id }, true)
	}, [orderedRows, activeId, loaded, onChange])
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
		scrollRef.current?.scrollTo({ top: 0 })
	}, [record?.id])
	useEffect(() => {
		if (!record?.id) return
		const actions = actionsRef.current
		if (!actions) return
		const observer = new ResizeObserver(([entry]) => setActionHeight(Math.ceil(entry.target.getBoundingClientRect().height)))
		observer.observe(actions)
		return () => observer.disconnect()
	}, [record?.id])
	useEffect(() => {
		if (!loaded) return
		if (hadRows.current && !rows.length && !filters.search)
			void confetti({
				particleCount: 50,
				startVelocity: 15,
				spread: 180,
				ticks: 50,
				zIndex: 20,
				origin: { x: 0.5, y: 0.5 },
				colors: ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1bd", "#f9bec7"],
				disableForReducedMotion: true,
			})
		hadRows.current = rows.length > 0
	}, [loaded, rows.length, filters.search])
	useEffect(() => {
		if (!flash) return
		const timer = setTimeout(() => setFlash(null), 1600)
		return () => clearTimeout(timer)
	}, [flash])

	const move = useCallback(
		(direction: number) => {
			if (!loaded || busy) return
			const next = orderedRows[index + direction]
			if (next) onChange({ item: next.id }, true)
		},
		[orderedRows, index, loaded, busy, onChange],
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
			setFlash({ key: Date.now(), name: preview?.record.name || record.name, status })
			move(1)
		},
		[record, loaded, busy, hydrated, decisions.length, drafts, move, note, canApproveTarget, preview?.record.name],
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
	const rejectAsVariant = useCallback(() => {
		if (!record) return
		if (sibling) stage("rejected", variantRejection(sibling.name))
		else setVariantFor(record.id)
	}, [record, sibling, stage])
	useReviewShortcuts({
		disabled: busy || confirm || !!variantFor || !hydrated || !loaded || gallery,
		queueOpen,
		recordId: record?.id,
		reasonOpen: reasonFor === record?.id,
		siblingName: sibling?.name,
		canFixup: !fixupsDisabled,
		selectedFile: selectedAsset?.file,
		stage,
		onReason: setReasonFor,
		onVariantPrompt: setVariantFor,
		onRename: () => {
			if (!renameUnavailable) setRenaming(true)
		},
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
	function select(id: string) {
		onChange({ item: id }, true)
		setGallery(false)
	}
	const queue = (
		<ReviewQueue
			groups={groups}
			total={rows.length}
			currentId={record?.id}
			drafts={drafts}
			disabled={busy || !loaded}
			search={filters.search}
			gallery={gallery}
			onSearch={(search) => onChange({ search, item: "" }, true)}
			onGallery={setGallery}
			onSelect={(id, target) => {
				select(id)
				target.closest("details")?.removeAttribute("open")
			}}
		/>
	)
	const draft = record && drafts[record.id]
	const submitter = record?.expand?.created_by?.username || "Contributor"
	const reasonOpen = !!record && reasonFor === record.id
	let rejectVariant: "outline" | "destructive" = "outline"
	if (reasonOpen) rejectVariant = "destructive"
	let variantLabel = "Variant of…"
	if (sibling) variantLabel = `Variant of ${sibling.name}`
	let emptyTitle = "Inbox zero"
	if (decisions.length) emptyTitle = "Everything is staged"
	const submitButton = (
		<Button variant="outline" disabled={!decisions.length || busy || !hydrated} onClick={() => setConfirm(true)}>
			<Flag />
			Submit review · {decisions.length}
		</Button>
	)
	return (
		<section
			data-review-bench
			aria-label="Review bench"
			style={{ "--review-action-height": `${actionHeight}px` } as CSSProperties}
			className={cn("max-lg:pb-[calc(var(--review-action-height)+1.5rem)] lg:h-full", scrollMargin)}
		>
			<div className="grid min-w-0 gap-4 lg:h-full lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)_280px]">
				<aside
					aria-label="Review queue"
					className="min-w-0 rounded-lg border bg-background/50 shadow-sm lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden"
				>
					<div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">{queue}</div>
					<details className="group lg:hidden" onToggle={(event) => setQueueOpen(event.currentTarget.open)}>
						<summary className="flex min-h-14 list-none items-center gap-2 rounded-lg px-4 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold">Queue</span>
							<span className={cn("rounded-full border px-1.5 text-xs font-semibold leading-5 tabular-nums", statusStyles.pending.badge)}>
								{rows.length}
							</span>
							<span className="ml-auto text-xs text-muted-foreground">{decisions.length} staged</span>
							<ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
						</summary>
						{queue}
					</details>
				</aside>
				<div className="flex min-w-0 flex-col lg:min-h-0">
					<div
						ref={scrollRef}
						className="min-w-0 space-y-4 lg:relative lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-4"
					>
						{gallery && (
							<QueueGallery rows={orderedRows} currentId={record?.id} drafts={drafts} disabled={busy || !loaded} onSelect={select} />
						)}
						{!gallery && !record && filters.search && (
							<Empty
								title="Nothing matches your search"
								icon={SearchX}
								className="rounded-lg border"
								action={
									<Button variant="outline" onClick={() => onChange({ search: "", item: "" }, true)}>
										Clear search
									</Button>
								}
							>
								No pending submission matches “{filters.search}”.
							</Empty>
						)}
						{!gallery && !record && !filters.search && (
							<Empty
								title={emptyTitle}
								icon={PartyPopper}
								className="rounded-lg border py-20"
								action={
									<>
										{!!decisions.length && submitButton}
										{!decisions.length && approvedCount > 0 && (
											<Button onClick={onPublish}>
												<Rocket />
												Publish {approvedCount} approved
											</Button>
										)}
									</>
								}
							>
								{decisions.length > 0 && "Submit your staged review to send the decisions to contributors."}
								{!decisions.length && "Nothing is waiting for review. Take a breather, new submissions land here as they arrive."}
							</Empty>
						)}
						{!gallery && record && (
							<motion.div
								key={record.id}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.15, ease: "easeOut" }}
								className="space-y-4"
							>
								<section aria-label="Current submission" className="rounded-lg border bg-background/50 p-4 shadow-sm">
									<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
										<Thumbnail submission={record} large className="size-16 rounded-lg p-2 sm:size-20 sm:p-3" />
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-1.5">
												<Kind record={record} />
												<Round round={record.round} />
												<DecisionBadge draft={draft} />
											</div>
											<h2 className="mt-1.5 font-mono text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl">
												{preview?.record.name}
											</h2>
											{fixups.name && (
												<p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
													Submitted as <span className="font-mono">{record.name}</span>
												</p>
											)}
											<p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
												<span className="flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
													<Avatar name={submitter} />
													{submitter}
												</span>
												<span aria-hidden>·</span>
												<Time value={record.created} className="text-sm" />
												<span aria-hidden>·</span>
												<span>{fileCount(record.assets.length)}</span>
											</p>
										</div>
										<div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
											<p className="text-xs text-muted-foreground tabular-nums">
												<span className="font-semibold text-foreground">{index + 1}</span> of {orderedRows.length}
											</p>
											<div className="flex gap-1">
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="outline"
															size="icon"
															className="max-lg:size-11"
															aria-label="Previous submission"
															disabled={busy || !loaded || index <= 0}
															onClick={() => move(-1)}
														>
															<ArrowLeft />
														</Button>
													</TooltipTrigger>
													<TooltipContent>Previous · K</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="outline"
															size="icon"
															className="max-lg:size-11"
															aria-label="Next submission"
															disabled={busy || !loaded || index >= orderedRows.length - 1}
															onClick={() => move(1)}
														>
															<ArrowRight />
														</Button>
													</TooltipTrigger>
													<TooltipContent>Next · J</TooltipContent>
												</Tooltip>
											</div>
										</div>
									</div>
									<div className="mt-3">
										{!renaming && !renameUnavailable && (
											<Button
												variant="ghost"
												size="sm"
												className="-ml-2 max-lg:min-h-11"
												disabled={fixupsDisabled}
												onClick={() => setRenaming(true)}
											>
												<Pencil />
												Rename slug <Kbd>E</Kbd>
											</Button>
										)}
										{renameUnavailable && <p className="text-xs leading-5 text-muted-foreground">{renameUnavailable}</p>}
										{renaming && (
											<ReviewRenameEditor
												name={fixups.name || record.name}
												onStage={(name) => changeFixups({ ...fixups, name })}
												onCancel={() => setRenaming(false)}
											/>
										)}
									</div>
								</section>
								<ReviewHints record={record} rows={candidates} />
								<RejectedRoundComparison record={record} defaultOpen layout="grid" />
								{hints.isError && (
									<output className="block text-xs text-muted-foreground">
										Hints are limited to this queue while other Submissions are unavailable.
									</output>
								)}
								{unavailable && <p className="rounded-lg border p-3 text-sm leading-6 text-muted-foreground">{unavailable}</p>}
								{stale && (
									<div role="alert" className="space-y-2 rounded-lg border border-yellow-500/30 p-3 text-sm">
										<p>This Submission changed after your draft was saved. Discard the draft before editing the current version.</p>
										<Button
											variant="outline"
											size="sm"
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
									<p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm leading-6 text-destructive">
										{fixupError || errors[record.id]}
									</p>
								)}
								<ReviewFixupSummary
									changes={preview?.changes || []}
									onUndo={(key) => changeFixups(undoReviewFixup(fixups, key))}
									disabled={fixupsDisabled}
								/>
								<section className="space-y-4 rounded-lg border bg-background/50 p-4 text-sm shadow-sm [overflow-wrap:anywhere]">
									<h3 className="flex items-center gap-2 font-semibold">
										<FileText className="size-4 text-muted-foreground" />
										Details
									</h3>
									{record.description && <p className="whitespace-pre-wrap leading-6">{record.description}</p>}
									{!record.description && <p className="text-muted-foreground">No description provided.</p>}
									{!record.icon_update && (
										<dl className="grid gap-4 sm:grid-cols-2">
											{record.target_submission && (
												<div className="sm:col-span-2">
													<dt className="mb-1.5 text-xs font-medium text-muted-foreground">Proposed update to submission</dt>
													<dd>
														<a
															href={`/community/submissions/${record.target_submission}`}
															target="_blank"
															rel="noreferrer"
															className="break-all font-mono underline underline-offset-4 hover:text-primary"
														>
															{record.target_submission}
														</a>
													</dd>
												</div>
											)}
											{(["categories", "aliases"] as const).map((field) => {
												const values = preview?.record.extras?.[field] || []
												return (
													<div key={field}>
														<dt className="mb-1.5 text-xs font-medium capitalize text-muted-foreground">{field}</dt>
														<dd className="flex flex-wrap gap-1.5">
															{values.map((value) => (
																<span key={value} className="rounded-md border px-2 py-0.5 text-xs">
																	{value}
																</span>
															))}
															{!values.length && <span className="text-muted-foreground">None</span>}
														</dd>
													</div>
												)
											})}
										</dl>
									)}
									{!unavailable && (
										<ReviewMetadataEditor
											key={JSON.stringify([fixups.aliases, fixups.categories])}
											aliases={preview?.metadata.aliases || []}
											categories={preview?.metadata.categories || []}
											disabled={fixupsDisabled}
											onStage={(metadata) => changeFixups({ ...fixups, ...metadata })}
										/>
									)}
									{record.admin_comment && (
										<div className="rounded-md border-l-2 border-l-primary bg-muted/50 p-3">
											<p className="text-xs font-medium text-muted-foreground">Previous feedback</p>
											<p className="mt-1 whitespace-pre-wrap break-words">{record.admin_comment}</p>
										</div>
									)}
								</section>
								<ReviewHistory record={record} filters={filters} />
								<section className="space-y-2 rounded-lg border bg-background/50 p-4 shadow-sm">
									<label htmlFor="review-note" className="flex items-center gap-2 text-sm font-semibold">
										<MessageSquare className="size-4 text-muted-foreground" />
										Note to the contributor
										<span className="font-normal text-muted-foreground">(optional)</span>
										<Kbd className="ml-auto">C</Kbd>
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
									/>
								</section>
							</motion.div>
						)}
						<div className="xl:hidden">
							<ShortcutLegend />
						</div>
					</div>
					{!gallery && record && (
						<div
							ref={actionsRef}
							data-review-actions
							className={cn(
								"z-20 shrink-0 space-y-3 rounded-lg border bg-background p-3 shadow-sm max-lg:fixed max-lg:inset-x-2 max-lg:bottom-2 max-lg:max-h-[calc(100dvh-5rem)] max-lg:overflow-y-auto max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:shadow-lg lg:relative lg:mt-3",
								queueOpen && "max-lg:hidden",
							)}
						>
							<div className="pointer-events-none absolute inset-x-0 -top-12 flex justify-center max-lg:hidden">
								<AnimatePresence>
									{flash && (
										<motion.p
											key={flash.key}
											role="status"
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
											className="flex max-w-full items-center gap-1.5 rounded-md border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
										>
											{flash.status === "approved" && <Check className={cn("size-3.5", statusStyles.approved.text)} />}
											{flash.status === "rejected" && <X className={cn("size-3.5", statusStyles.rejected.text)} />}
											<span className="truncate font-mono">{flash.name}</span>
											{flash.status === "approved" && "staged for approval"}
											{flash.status === "rejected" && "staged for rejection"}
										</motion.p>
									)}
								</AnimatePresence>
							</div>
							<AnimatePresence initial={false}>
								{reasonOpen && (
									<motion.fieldset
										key="reasons"
										aria-label="Rejection reason"
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2, ease: "easeOut" }}
										className="overflow-hidden"
									>
										<div className="space-y-2 pb-1">
											<div className="flex items-center justify-between gap-2">
												<h3 className="text-sm font-semibold">Why are you rejecting it?</h3>
												<Button size="sm" variant="ghost" className="max-lg:min-h-11" onClick={() => setReasonFor(null)}>
													Cancel <Kbd>Esc</Kbd>
												</Button>
											</div>
											<p className="text-xs leading-5 text-muted-foreground">
												The contributor can fix and resubmit this Submission. Pick a reason or reject without one.
											</p>
											<div className="relative grid max-h-[28dvh] gap-1.5 overflow-y-auto overscroll-contain p-0.5 sm:grid-cols-2 lg:max-h-[34dvh]">
												{reasons.map((text, index) => (
													<button
														type="button"
														key={text}
														disabled={busy}
														className="flex min-h-10 items-start gap-2 rounded-md border px-3 py-2 text-left text-xs leading-5 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [overflow-wrap:anywhere]"
														onClick={() => stage("rejected", index === 8 && sibling ? variantRejection(sibling.name) : text)}
													>
														<span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-sm border bg-muted font-mono text-[10px] font-medium text-muted-foreground">
															{index + 1}
														</span>
														{text}
													</button>
												))}
											</div>
											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													variant="outline"
													className="max-lg:min-h-11 [&>svg]:text-destructive"
													disabled={busy}
													onClick={() => stage("rejected")}
												>
													Reject without a reason <Kbd>X</Kbd>
												</Button>
												<Button size="sm" variant="outline" className="max-lg:min-h-11" disabled={busy} onClick={rejectAsVariant}>
													<Layers />
													{variantLabel} <Kbd>V</Kbd>
												</Button>
												{note.trim() && (
													<Button
														size="sm"
														variant="destructive"
														className="max-lg:min-h-11"
														disabled={busy}
														onClick={() => stage("rejected")}
													>
														Reject with note & next
													</Button>
												)}
											</div>
										</div>
									</motion.fieldset>
								)}
							</AnimatePresence>
							<div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
								<Button
									className="min-w-0 max-lg:h-11"
									disabled={busy || !loaded || !hydrated || !canApproveTarget || (!record.assets.length && !record.icon_update)}
									onClick={() => stage("approved")}
								>
									<Check />
									<span className="sm:hidden">Approve</span>
									<span className="max-sm:hidden">Approve & next</span>
									<Kbd className="ml-1">P</Kbd>
								</Button>
								<Button
									variant={rejectVariant}
									aria-expanded={reasonOpen}
									className={cn("min-w-0 max-lg:h-11", !reasonOpen && "[&>svg]:text-destructive")}
									disabled={busy || !loaded || !hydrated}
									onClick={() => {
										if (reasonOpen) setReasonFor(null)
										else setReasonFor(record.id)
									}}
								>
									<X />
									Reject
									<Kbd className="ml-1">X</Kbd>
								</Button>
								<div className="col-span-2 flex gap-2 lg:contents">
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="max-lg:size-11"
												aria-label="Write a note"
												disabled={busy}
												onClick={writeNote}
											>
												<MessageSquare />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Write a note · C</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="max-lg:size-11"
												aria-label="Undo this review"
												disabled={busy || !drafts[record.id]}
												onClick={() => clear(record.id)}
											>
												<RotateCcw />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Undo this review · U</TooltipContent>
									</Tooltip>
									<div className="flex-1 xl:hidden lg:ml-auto lg:flex-none [&>button]:w-full max-lg:[&>button]:h-11">{submitButton}</div>
								</div>
							</div>
							<p className="text-xs leading-5 text-muted-foreground max-lg:hidden">
								Decisions and fix-ups stay staged until you submit review. Approving does not publish.
							</p>
						</div>
					)}
				</div>
				<aside aria-label="Staged decisions" className="hidden min-w-0 xl:flex xl:min-h-0 xl:flex-col xl:gap-3">
					<div className="space-y-3 rounded-lg border bg-background/50 p-3 shadow-sm">
						<p className="text-sm font-semibold">Staged review</p>
						<dl className="grid grid-cols-2 divide-x rounded-md border text-center">
							<div className="p-2">
								<dt className="text-xs text-muted-foreground">To approve</dt>
								<dd className={cn("text-xl font-semibold tabular-nums", statusStyles.approved.text)}>{approvals}</dd>
							</div>
							<div className="p-2">
								<dt className="text-xs text-muted-foreground">To reject</dt>
								<dd className={cn("text-xl font-semibold tabular-nums", statusStyles.rejected.text)}>{decisions.length - approvals}</dd>
							</div>
						</dl>
						<div className="[&>button]:w-full">{submitButton}</div>
						<p className="text-xs text-muted-foreground">Approving does not publish. Decisions are sent together after confirmation.</p>
					</div>
					{!decisions.length && (
						<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
							<span className="flex size-8 items-center justify-center rounded-md border bg-muted">
								<Flag className="size-4" />
							</span>
							Approve or reject submissions and they collect here until you submit.
						</div>
					)}
					<div
						className={cn(
							"relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border bg-background/50 p-2 shadow-sm",
							!decisions.length && "hidden",
						)}
					>
						<ul className="space-y-2">
							<AnimatePresence initial={false}>
								{decisions.map((staged) => {
									const row = rows.find((entry) => entry.id === staged.id)
									return (
										<motion.li
											key={staged.id}
											layout="position"
											initial={{ opacity: 0, x: 16 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
											className={cn("space-y-1.5 rounded-md border p-2 text-xs")}
										>
											<div className="flex items-center gap-2">
												{row && <Thumbnail submission={row} className="size-8 p-1" />}
												<button
													type="button"
													onClick={() => select(staged.id)}
													className="min-w-0 flex-1 rounded-sm text-left font-mono text-[13px] font-medium outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 [overflow-wrap:anywhere]"
												>
													{staged.fixups?.name || staged.name}
												</button>
												<StagedMark draft={staged} className="size-5" />
												<Button
													variant="ghost"
													size="icon"
													className="size-7"
													aria-label={`Unflag ${staged.name}`}
													disabled={busy}
													onClick={() => clear(staged.id)}
												>
													<RotateCcw className="size-3.5" />
												</Button>
											</div>
											{!!staged.fixupSummary?.length && (
												<ul className="space-y-0.5 text-muted-foreground">
													{staged.fixupSummary.map((text) => (
														<li key={text} className="[overflow-wrap:anywhere]">
															{text}
														</li>
													))}
												</ul>
											)}
											{staged.comment && (
												<p className="line-clamp-2 whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{staged.comment}</p>
											)}
										</motion.li>
									)
								})}
							</AnimatePresence>
						</ul>
					</div>
					<div className="mt-auto">
						<ShortcutLegend />
					</div>
				</aside>
			</div>
			<Dialog
				open={variantFor === record?.id}
				onOpenChange={(open) => {
					if (!open) setVariantFor(null)
				}}
			>
				<DialogContent className="max-h-[85dvh] overflow-y-auto">
					<DialogTitle className="flex items-center gap-2">
						<Layers className="size-5 text-muted-foreground" />
						Reject as a Variant
					</DialogTitle>
					<DialogDescription>The contributor can fix and resubmit this Submission as a Variant of an existing Icon.</DialogDescription>
					<label htmlFor="review-variant-parent" className="space-y-2 text-sm font-medium">
						Existing Icon slug
						<Input
							id="review-variant-parent"
							value={variantName}
							onChange={(event) => setVariantName(event.target.value)}
							className="mt-2 font-mono max-lg:min-h-11"
							placeholder="existing-icon"
							maxLength={80}
						/>
					</label>
					<DialogFooter>
						<Button variant="outline" className="max-lg:min-h-11" onClick={() => setVariantFor(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="max-lg:min-h-11"
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
