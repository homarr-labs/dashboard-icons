"use client"
import { ArrowLeft, ArrowRight, Download, ExternalLink, Maximize2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { RejectionNotice } from "@/components/submission/rejection-notice"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { VariantPreview } from "@/components/variant-preview"
import { useDashboardActivity, useSubmissionDetail } from "@/hooks/use-dashboard"
import type { DashboardFilters } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { ActivityFeed } from "./activity-feed"
import { ErrorState, Loading, Pagination, Status } from "./primitives"

function variantLabel(variant: SubmissionVariant | null) {
	if (!variant) return "Unlabelled asset"
	return variantKind(variant).label
}
function variantBackdrop(variant: SubmissionVariant | null) {
	if (!variant || variantKind(variant).background === "any") return "checker"
	return variantKind(variant).background
}
export type ReviewIntent = { kind: "approved" | "rejected" | "publish"; records: Submission[]; nextId?: string }
export function Inspector({
	id,
	filters,
	isAdmin,
	onClose,
	onOpen,
	onAction,
	previous,
	next,
	onPrevious,
	onNext,
	busy,
	publishBlocked,
}: {
	id: string
	filters: DashboardFilters
	isAdmin: boolean
	onClose: () => void
	onOpen: (id: string) => void
	onAction: (intent: ReviewIntent) => void
	previous?: string
	next?: string
	onPrevious?: () => void
	onNext?: () => void
	busy: boolean
	publishBlocked: boolean
}) {
	const detail = useSubmissionDetail(id, true)
	const [tab, setTab] = useState("details")
	const [asset, setAsset] = useState(0)
	const [background, setBackground] = useState("checker")
	const [enlarged, setEnlarged] = useState(false)
	const [historyPage, setHistoryPage] = useState(1)
	const history = useDashboardActivity(
		{ ...filters, actor: "", action: "", submission: "", from: "", to: "", page: historyPage, perPage: 25 },
		isAdmin && tab === "history",
		id,
	)
	const previousId = useRef(id)
	useEffect(() => {
		if (previousId.current === id) return
		previousId.current = id
		setAsset(0)
		setHistoryPage(1)
	}, [id])
	const record = detail.data
	if (detail.isLoading) return <Loading />
	if (detail.error || !record) return <ErrorState error={detail.error} retry={() => void detail.refetch()} />
	const assets = labelledAssets(record.extras, record.assets)
	const current = assets[asset]
	const filename = current?.file
	let assetUrl = ""
	if (filename) assetUrl = pb.files.getURL(record, filename)
	let previewClass = "bg-[repeating-conic-gradient(#aaa_0%_25%,#ddd_0%_50%)] [background-size:20px_20px]"
	if (background === "light") previewClass = "bg-white"
	if (background === "dark") previewClass = "bg-zinc-950"
	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex items-start justify-between gap-3 border-b p-4 pr-12 xl:pr-4">
				<div className="min-w-0">
					<h2 className="break-all text-base font-semibold">{record.name}</h2>
					<div className="mt-2">
						<Status status={record.status} />
						<span className="ml-2 text-sm text-muted-foreground">Round {record.round || 1}</span>
					</div>
				</div>
				<Button variant="ghost" size="icon" className="hidden size-11 xl:inline-flex" aria-label="Close inspector" onClick={onClose}>
					<X />
				</Button>
			</div>
			<div className="flex items-center justify-between border-b px-4 py-2">
				<span className="text-xs text-muted-foreground">Submission details</span>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-11"
						aria-label="Previous submission"
						disabled={!previous && !onPrevious}
						onClick={() => {
							if (previous) onOpen(previous)
							else onPrevious?.()
						}}
					>
						<ArrowLeft />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-11"
						aria-label="Next submission"
						disabled={!next && !onNext}
						onClick={() => {
							if (next) onOpen(next)
							else onNext?.()
						}}
					>
						<ArrowRight />
					</Button>
				</div>
			</div>
			<Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
				<TabsList className="mx-4 my-3 h-auto w-fit">
					<TabsTrigger value="details" className="min-h-11">
						Details
					</TabsTrigger>
					{isAdmin && (
						<TabsTrigger value="history" className="min-h-11">
							History
						</TabsTrigger>
					)}
				</TabsList>
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					<TabsContent value="details" className="m-0 space-y-5 px-4 pb-5">
						{record.status === "rejected" && (
							<RejectionNotice id={record.id} feedback={record.admin_comment} canEdit={record.created_by === pb.authStore.record?.id} />
						)}
						<RejectedRoundComparison record={record} />
						<div className="space-y-2">
							<div className={`relative flex h-40 items-center justify-center overflow-hidden rounded-lg border ${previewClass}`}>
								{current && (
									<span className="absolute left-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium shadow-sm">
										{variantLabel(current.variant)}
									</span>
								)}
								{assetUrl && (
									<UnoptimizedImage
										src={assetUrl}
										alt={`${record.name}, ${variantLabel(current?.variant ?? null)}`}
										className="h-28 max-w-[80%] object-contain"
									/>
								)}
								<Button
									size="icon"
									variant="secondary"
									className="absolute bottom-2 right-2 size-11"
									aria-label="Enlarge asset"
									disabled={!assetUrl}
									onClick={() => setEnlarged(true)}
								>
									<Maximize2 />
								</Button>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex gap-1">
									{["checker", "light", "dark"].map((value) => (
										<Button
											key={value}
											variant="outline"
											size="sm"
											className="h-11 min-w-11 px-2 text-xs capitalize"
											aria-label={`Use ${value} background`}
											aria-pressed={background === value}
											onClick={() => setBackground(value)}
										>
											{value}
										</Button>
									))}
								</div>
								<a
									className="inline-flex min-h-11 items-center gap-1 rounded text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
									href={assetUrl}
									download={filename}
									target="_blank"
									rel="noreferrer"
								>
									<Download className="size-3" />
									Download file
								</a>
							</div>
							{assets.length > 1 && (
								<div className="grid grid-cols-3 gap-2 p-1">
									{assets.map(({ file, variant }, index) => (
										<button
											key={file}
											type="button"
											onClick={() => {
												setAsset(index)
												setBackground(variantBackdrop(variant))
											}}
											aria-pressed={asset === index}
											aria-label={`Preview ${variantLabel(variant)} variant`}
											className="flex min-w-0 flex-col items-center gap-1 rounded border bg-muted/30 p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
										>
											<VariantPreview
												src={pb.files.getURL(record, file)}
												alt={variantLabel(variant)}
												background={variant ? variantKind(variant).background : "any"}
												className="h-10 w-full"
											/>
											<span className="w-full break-all text-center text-xs leading-tight">{variantLabel(variant)}</span>
										</button>
									))}
								</div>
							)}
						</div>
						<div>
							<h3 className="mb-1 text-xs font-medium text-muted-foreground">Description</h3>
							<p className="whitespace-pre-wrap break-words text-sm leading-6">{record.description || "No description provided."}</p>
						</div>
						{record.target_submission && (
							<div>
								<h3 className="mb-1 text-xs font-medium text-muted-foreground">Proposed update to submission</h3>
								<a
									href={`/community/submissions/${record.target_submission}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex min-h-11 items-center text-sm font-mono underline"
								>
									{record.target_submission}
								</a>
							</div>
						)}
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<h3 className="mb-1 text-xs text-muted-foreground">Submitted by</h3>
								<p className="break-words">{record.expand?.created_by?.username || "Contributor"}</p>
							</div>
							<div>
								<h3 className="mb-1 text-xs text-muted-foreground">Reviewed by</h3>
								<p className="break-words">{record.expand?.approved_by?.username || "Not reviewed yet"}</p>
							</div>
							<div>
								<h3 className="mb-1 text-xs text-muted-foreground">Submitted</h3>
								<p>{new Date(record.created).toLocaleString()}</p>
							</div>
							<div>
								<h3 className="mb-1 text-xs text-muted-foreground">Updated</h3>
								<p>{new Date(record.updated).toLocaleString()}</p>
							</div>
						</div>
						{["categories", "aliases"].map((key) => {
							const values = record.extras?.[key as "categories" | "aliases"] || []
							return (
								<div key={key}>
									<h3 className="mb-2 text-xs font-medium capitalize text-muted-foreground">{key}</h3>
									<div className="flex flex-wrap gap-1.5">
										{values.map((value) => (
											<span key={value} className="rounded-md bg-muted px-2 py-1 text-xs">
												{value}
											</span>
										))}
										{!values.length && <p className="text-sm text-muted-foreground">None provided</p>}
									</div>
								</div>
							)
						})}
						{record.admin_comment && record.status !== "rejected" && (
							<div className="rounded-lg border bg-muted/20 p-3">
								<h3 className="mb-1 text-xs font-medium">Feedback sent to submitter</h3>
								<p className="whitespace-pre-wrap break-words text-sm leading-6">{record.admin_comment}</p>
							</div>
						)}
						<a
							className="inline-flex min-h-11 items-center gap-1.5 rounded text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
							target="_blank"
							rel="noreferrer"
							href={`/community/submissions/${record.id}`}
						>
							<ExternalLink className="size-3.5" />
							Open community preview
						</a>
						<details className="border-t pt-3 text-xs text-muted-foreground">
							<summary className="min-h-11 cursor-pointer py-3">Technical details</summary>
							<dl className="mt-3 space-y-2">
								<div>
									<dt>Submission ID</dt>
									<dd className="break-all font-mono">{record.id}</dd>
								</div>
								<div>
									<dt>Asset</dt>
									<dd className="break-all">{filename}</dd>
								</div>
								<div>
									<dt>Base format</dt>
									<dd>{record.extras?.base}</dd>
								</div>
							</dl>
						</details>
					</TabsContent>
					<TabsContent value="history" className="m-0">
						{history.isLoading && <Loading />}
						{history.error && <ErrorState error={history.error} retry={() => void history.refetch()} />}{" "}
						{history.data && (
							<>
								<ActivityFeed events={history.data.items} onOpen={onOpen} group={false} />
								<Pagination
									page={historyPage}
									totalPages={history.data.totalPages}
									totalItems={history.data.totalItems}
									perPage={25}
									onPage={setHistoryPage}
								/>
							</>
						)}
					</TabsContent>
				</div>
			</Tabs>
			{isAdmin && record.status === "pending" && (
				<div className="flex flex-wrap gap-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<Button
						size="sm"
						className="h-11"
						variant="outline"
						disabled={busy}
						onClick={() => onAction({ kind: "rejected", records: [record] })}
					>
						Reject
					</Button>
					<Button
						size="sm"
						className="h-11"
						variant="outline"
						disabled={busy}
						onClick={() => onAction({ kind: "approved", records: [record] })}
					>
						Approve
					</Button>
					<Button
						size="sm"
						className="h-11"
						disabled={busy || (!next && !onNext)}
						onClick={() => onAction({ kind: "approved", records: [record], nextId: next || "__next_page__" })}
					>
						Approve & next
					</Button>
				</div>
			)}
			{isAdmin && record.status === "approved" && (
				<div className="border-t bg-background p-3">
					<Button
						className="h-11 w-full"
						disabled={busy || publishBlocked}
						onClick={() => onAction({ kind: "publish", records: [record] })}
					>
						Publish to collection
					</Button>
					{publishBlocked && (
						<p className="mt-2 text-xs text-muted-foreground">A publish batch is active. Follow its progress in Publish.</p>
					)}
				</div>
			)}
			<Dialog open={enlarged} onOpenChange={setEnlarged}>
				<DialogContent className="max-w-3xl [&>button]:size-11">
					<DialogTitle>{record.name}</DialogTitle>
					<DialogDescription className="break-all">
						{variantLabel(current?.variant ?? null)} preview · {filename}
					</DialogDescription>
					<div className={`flex h-[60vh] items-center justify-center rounded-lg ${previewClass}`}>
						<UnoptimizedImage
							width={640}
							height={640}
							src={assetUrl}
							alt={`${record.name}, ${variantLabel(current?.variant ?? null)}`}
							className="max-h-full max-w-full object-contain p-6"
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
