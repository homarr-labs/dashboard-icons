"use client"
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, Grid2x2, Maximize2, Moon, Pencil, Rocket, Sun, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { RejectionNotice } from "@/components/submission/rejection-notice"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { VariantPreview } from "@/components/variant-preview"
import { useDashboardActivity, useSubmissionDetail } from "@/hooks/use-dashboard"
import type { DashboardFilters } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { labelledAssets, type SubmissionVariant, type VariantBackground, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"
import { ActivityFeed } from "./activity-feed"
import {
	Avatar,
	approveButton,
	backdrops,
	ErrorState,
	Kind,
	Loading,
	LoadMore,
	Round,
	rejectButton,
	Status,
	statusStyles,
	Thumbnail,
} from "./primitives"

function variantLabel(variant: SubmissionVariant | null) {
	if (!variant) return "Unlabelled asset"
	return variantKind(variant).label
}
function variantBackdrop(variant: SubmissionVariant | null): VariantBackground {
	if (!variant) return "any"
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
	busy: boolean
	publishBlocked: boolean
}) {
	const detail = useSubmissionDetail(id, true)
	const [tab, setTab] = useState("details")
	const [asset, setAsset] = useState(0)
	const [background, setBackground] = useState<VariantBackground>("any")
	const [enlarged, setEnlarged] = useState(false)
	const [historyLimit, setHistoryLimit] = useState(25)
	const history = useDashboardActivity(
		{ ...filters, actor: "", action: "", submission: "", from: "", to: "" },
		isAdmin && tab === "history",
		id,
		historyLimit,
	)
	const previousId = useRef(id)
	useEffect(() => {
		if (previousId.current === id) return
		previousId.current = id
		setAsset(0)
		setHistoryLimit(25)
	}, [id])
	const record = detail.data
	if (detail.isLoading) return <Loading />
	if (detail.error || !record) return <ErrorState error={detail.error} retry={() => void detail.refetch()} />
	const assets = labelledAssets(record.extras, record.assets, record.name, record.icon_update)
	const current = assets[asset]
	const filename = current?.file
	let assetUrl = ""
	if (filename) assetUrl = pb.files.getURL(record, filename)
	const own = record.created_by === pb.authStore.record?.id
	const submitter = record.expand?.created_by?.username || "Contributor"
	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className={cn("border-b border-l-2 p-4 pr-12 xl:pr-4", statusStyles[record.status].accent)}>
				<div className="flex items-start gap-3">
					<Thumbnail submission={record} large className="size-14 rounded-lg p-2" />
					<div className="min-w-0 flex-1">
						<h2 className="break-all font-mono text-lg font-semibold leading-tight">{record.name}</h2>
						<div className="mt-2 flex flex-wrap gap-1.5">
							<Status status={record.status} />
							<Kind record={record} />
							<Round round={record.round} />
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="max-lg:size-11"
							aria-label="Previous submission"
							disabled={!previous}
							onClick={() => previous && onOpen(previous)}
						>
							<ArrowLeft />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="max-lg:size-11"
							aria-label="Next submission"
							disabled={!next}
							onClick={() => next && onOpen(next)}
						>
							<ArrowRight />
						</Button>
						<Button variant="ghost" size="icon" className="hidden xl:inline-flex" aria-label="Close inspector" onClick={onClose}>
							<X />
						</Button>
					</div>
				</div>
			</div>
			<Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
				{isAdmin && (
					<TabsList className="mx-4 mt-3 h-auto w-fit">
						<TabsTrigger value="details" className="px-3 max-lg:min-h-11">
							Details
						</TabsTrigger>
						<TabsTrigger value="history" className="px-3 max-lg:min-h-11">
							History
						</TabsTrigger>
					</TabsList>
				)}
				<div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
					<TabsContent value="details" className="m-0 space-y-5 p-4">
						{record.status === "rejected" && <RejectionNotice id={record.id} feedback={record.admin_comment} canEdit={own} />}
						<RejectedRoundComparison record={record} />
						<div className="space-y-2">
							<div
								className={cn(
									"relative flex h-48 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border",
									backdrops[background],
								)}
							>
								{current && (
									<span className="absolute top-2 left-2 rounded-md border bg-background/90 px-2 py-0.5 text-xs font-medium">
										{variantLabel(current.variant)}
									</span>
								)}
								{assetUrl && (
									<UnoptimizedImage
										src={assetUrl}
										alt={`${record.name}, ${variantLabel(current?.variant ?? null)}`}
										className="h-32 max-w-[80%] object-contain"
									/>
								)}
								<Button
									size="icon"
									variant="secondary"
									className="absolute right-2 bottom-2 shadow-md max-lg:size-11"
									aria-label="Enlarge asset"
									disabled={!assetUrl}
									onClick={() => setEnlarged(true)}
								>
									<Maximize2 />
								</Button>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<ToggleGroup
									type="single"
									variant="outline"
									size="sm"
									value={background}
									onValueChange={(value) => {
										if (value) setBackground(value as VariantBackground)
									}}
									aria-label="Preview background"
								>
									<ToggleGroupItem value="any" aria-label="Use checker background" className="px-2.5 max-lg:min-h-11">
										<Grid2x2 />
										Checker
									</ToggleGroupItem>
									<ToggleGroupItem value="light" aria-label="Use light background" className="px-2.5 max-lg:min-h-11">
										<Sun />
										Light
									</ToggleGroupItem>
									<ToggleGroupItem value="dark" aria-label="Use dark background" className="px-2.5 max-lg:min-h-11">
										<Moon />
										Dark
									</ToggleGroupItem>
								</ToggleGroup>
								<a
									className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 max-lg:min-h-11"
									href={assetUrl}
									download={filename}
									target="_blank"
									rel="noreferrer"
								>
									<Download className="size-3.5" />
									Download
								</a>
							</div>
							{assets.length > 1 && (
								<div className="grid grid-cols-3 gap-2">
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
											className="flex min-w-0 flex-col items-center gap-1 rounded-md border p-1.5 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary"
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
									className="inline-flex items-center gap-1 font-mono text-sm underline-offset-4 hover:text-primary hover:underline max-lg:min-h-11"
								>
									{record.target_submission}
									<ExternalLink className="size-3" />
								</a>
							</div>
						)}
						<dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border p-3 text-sm">
							<div className="min-w-0">
								<dt className="mb-1 text-xs text-muted-foreground">Submitted by</dt>
								<dd className="flex min-w-0 items-center gap-1.5">
									<Avatar name={submitter} />
									<span className="truncate">{submitter}</span>
								</dd>
							</div>
							<div className="min-w-0">
								<dt className="mb-1 text-xs text-muted-foreground">Reviewed by</dt>
								<dd className="truncate">{record.expand?.approved_by?.username || "Not reviewed yet"}</dd>
							</div>
							<div>
								<dt className="mb-1 text-xs text-muted-foreground">Submitted</dt>
								<dd>{new Date(record.created).toLocaleString()}</dd>
							</div>
							<div>
								<dt className="mb-1 text-xs text-muted-foreground">Updated</dt>
								<dd>{new Date(record.updated).toLocaleString()}</dd>
							</div>
						</dl>
						{["categories", "aliases"].map((key) => {
							const values = record.extras?.[key as "categories" | "aliases"] || []
							return (
								<div key={key}>
									<h3 className="mb-2 text-xs font-medium capitalize text-muted-foreground">{key}</h3>
									<div className="flex flex-wrap gap-1.5">
										{values.map((value) => (
											<span key={value} className="rounded-md border px-2 py-0.5 text-xs">
												{value}
											</span>
										))}
										{!values.length && <p className="text-sm text-muted-foreground">None provided</p>}
									</div>
								</div>
							)
						})}
						{record.admin_comment && record.status !== "rejected" && (
							<div className={cn("rounded-md border border-l-2 p-3", statusStyles[record.status].accent, statusStyles[record.status].tint)}>
								<h3 className="mb-1 text-xs font-semibold">Feedback sent to submitter</h3>
								<p className="whitespace-pre-wrap break-words text-sm leading-6">{record.admin_comment}</p>
							</div>
						)}
						<a
							className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 max-lg:min-h-11"
							target="_blank"
							rel="noreferrer"
							href={`/community/submissions/${record.id}`}
						>
							<ExternalLink className="size-3.5" />
							Open community preview
						</a>
						<details className="border-t pt-3 text-xs text-muted-foreground">
							<summary className="w-fit py-2 hover:text-foreground max-lg:min-h-11">Technical details</summary>
							<dl className="mt-2 space-y-2">
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
						{history.error && <ErrorState error={history.error} retry={() => void history.refetch()} />}
						{history.data && (
							<>
								<ActivityFeed events={history.data.items} onOpen={onOpen} group={false} />
								<LoadMore
									shown={history.data.items.length}
									total={history.data.totalItems}
									loading={history.isFetching}
									onMore={() => setHistoryLimit((limit) => limit + 25)}
								/>
							</>
						)}
					</TabsContent>
				</div>
			</Tabs>
			{isAdmin && record.status === "pending" && (
				<div className="grid grid-cols-3 gap-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<Button
						variant="outline"
						className={cn(rejectButton, "max-lg:min-h-11")}
						disabled={busy}
						onClick={() => onAction({ kind: "rejected", records: [record] })}
					>
						<X />
						Reject
					</Button>
					<Button
						variant="outline"
						className={cn(approveButton, "max-lg:min-h-11")}
						disabled={busy}
						onClick={() => onAction({ kind: "approved", records: [record] })}
					>
						<Check />
						Approve
					</Button>
					<Button
						className="px-3 max-lg:min-h-11"
						disabled={busy || !next}
						onClick={() => onAction({ kind: "approved", records: [record], nextId: next })}
					>
						Approve & next
					</Button>
				</div>
			)}
			{isAdmin && record.status === "approved" && (
				<div className="border-t bg-background p-3">
					<Button
						className="w-full max-lg:min-h-11"
						disabled={busy || publishBlocked}
						onClick={() => onAction({ kind: "publish", records: [record] })}
					>
						<Rocket />
						Publish to collection
					</Button>
					{publishBlocked && (
						<p className="mt-2 text-xs text-muted-foreground">A publish batch is active. Follow its progress in Publish.</p>
					)}
				</div>
			)}
			{!isAdmin && own && record.status === "pending" && (
				<div className="border-t bg-background p-3">
					<Button asChild variant="outline" className="w-full max-lg:min-h-11">
						<Link href={`/submit?submission=${encodeURIComponent(record.id)}`}>
							<Pencil />
							Edit this submission
						</Link>
					</Button>
				</div>
			)}
			<Dialog open={enlarged} onOpenChange={setEnlarged}>
				<DialogContent className="max-w-3xl [&>button]:size-11">
					<DialogTitle className="font-mono">{record.name}</DialogTitle>
					<DialogDescription className="break-all">
						{variantLabel(current?.variant ?? null)} preview · {filename}
					</DialogDescription>
					<div className={cn("flex h-[60vh] items-center justify-center rounded-lg", backdrops[background])}>
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
