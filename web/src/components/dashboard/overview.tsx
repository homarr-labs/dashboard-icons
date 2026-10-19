"use client"
import type { UseQueryResult } from "@tanstack/react-query"
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock, Library, PartyPopper, Rss, XCircle } from "lucide-react"
import type { ListResult } from "pocketbase"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Button } from "@/components/ui/button"
import type { DashboardSummary, DashboardView, SubmissionEvent } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { ActivityFeed } from "./activity-feed"
import { Empty, ErrorState, Kind, Loading, Panel, Round, statusStyles, Thumbnail, Time } from "./primitives"
import { PublishRun } from "./publishing"

export function AdminOverview({
	summary,
	recent,
	onNavigate,
	onOpen,
	onReview,
}: {
	summary: UseQueryResult<DashboardSummary>
	recent: UseQueryResult<ListResult<SubmissionEvent>>
	onNavigate: (view: DashboardView, patch?: Record<string, string>) => void
	onOpen: (id: string) => void
	onReview: (id: string) => void
}) {
	const counts = summary.data?.counts
	const pending = summary.data?.pending || []
	const approved = summary.data?.approved || []
	const batch = summary.data?.batches.find((entry) => entry.active) || summary.data?.batches[0]
	const metrics = [
		{
			label: "Needs review",
			value: counts?.pending,
			caption: summary.data?.oldest ? "Oldest waiting" : "Nothing waiting",
			since: summary.data?.oldest?.created,
			Icon: Clock,
			style: statusStyles.pending,
			open: () => onNavigate("review"),
		},
		{
			label: "Ready to publish",
			value: counts?.approved,
			caption: "Approved, not yet published",
			Icon: CheckCircle2,
			style: statusStyles.approved,
			open: () => onNavigate("publish"),
		},
		{
			label: "Published",
			value: counts?.added_to_collection,
			caption: "Live in the collection",
			Icon: Library,
			style: statusStyles.added_to_collection,
			open: () => onNavigate("submissions", { status: "added_to_collection" }),
		},
		{
			label: "With contributors",
			value: counts?.rejected,
			caption: "Rejected, awaiting a fix",
			Icon: XCircle,
			style: statusStyles.rejected,
			open: () => onNavigate("submissions", { status: "rejected" }),
		},
	]
	return (
		<div className="space-y-4 pb-4">
			{summary.error && <ErrorState error={summary.error} retry={() => void summary.refetch()} />}
			<MagicCardPointerProvider className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{metrics.map((metric) => (
					<MagicCard key={metric.label} className="rounded-lg shadow-sm">
						<button
							type="button"
							onClick={metric.open}
							className="group flex w-full items-start gap-3 rounded-lg p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md border", metric.style.badge)}>
								<metric.Icon className="size-4" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-center gap-2 text-sm font-medium">
									{metric.label}
									<ArrowUpRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
								</span>
								{metric.value === undefined && <span className="block text-2xl font-semibold text-muted-foreground">—</span>}
								{metric.value !== undefined && (
									<NumberTicker value={metric.value} className={cn("block text-2xl font-semibold tracking-normal", metric.style.text)} />
								)}
								<span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
									{metric.caption}
									{metric.since && <Time value={metric.since} />}
								</span>
							</span>
						</button>
					</MagicCard>
				))}
			</MagicCardPointerProvider>
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
				<div className="min-w-0 space-y-4">
					<Panel
						title="Waiting for review"
						icon={<Clock className="text-warning" />}
						action={
							<Button size="sm" variant="ghost" onClick={() => onNavigate("review")}>
								Open the bench
								<ArrowRight />
							</Button>
						}
					>
						{summary.isLoading && <Loading />}
						{summary.data && !pending.length && (
							<Empty title="Inbox zero" icon={PartyPopper} tone={statusStyles.added_to_collection.badge}>
								Nothing is waiting for review. New submissions appear here as they arrive.
							</Empty>
						)}
						{!!pending.length && (
							<MagicCardPointerProvider className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 xl:grid-cols-5">
								{pending.map((record) => (
									<MagicCard key={record.id} className="rounded-md shadow-md">
										<button
											type="button"
											onClick={() => onReview(record.id)}
											className="group flex w-full flex-col items-center p-3 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4"
										>
											<Thumbnail
												submission={record}
												large
												className="mb-2 size-16 rounded-lg p-2 transition-transform duration-300 group-hover:scale-105"
											/>
											<span className="w-full truncate font-mono text-xs font-medium transition-colors group-hover:text-primary sm:text-sm">
												{record.name}
											</span>
											<Time value={record.created} className="mt-1 text-[10px]" />
										</button>
									</MagicCard>
								))}
							</MagicCardPointerProvider>
						)}
					</Panel>
					<Panel
						title="Recent team activity"
						icon={<Rss className="text-primary" />}
						action={
							<Button size="sm" variant="ghost" onClick={() => onNavigate("activity")}>
								View all
								<ArrowRight />
							</Button>
						}
					>
						{recent.isLoading && <Loading />}
						{recent.error && <ErrorState error={recent.error} retry={() => void recent.refetch()} />}
						{recent.data && <ActivityFeed events={recent.data.items} onOpen={onOpen} />}
					</Panel>
				</div>
				<div className="min-w-0 space-y-4">
					<Panel
						title="Ready to publish"
						icon={<CheckCircle2 className="text-info" />}
						action={
							<Button size="sm" variant="ghost" onClick={() => onNavigate("publish")}>
								Publish
								<ArrowRight />
							</Button>
						}
					>
						{summary.data && !approved.length && (
							<p className="p-4 text-sm text-muted-foreground">Approve icons in the bench to queue them here.</p>
						)}
						<ul className="divide-y">
							{approved.map((record) => (
								<ApprovedRow key={record.id} record={record} onOpen={onOpen} />
							))}
						</ul>
					</Panel>
					{batch && <PublishRun batch={batch} compact />}
				</div>
			</div>
		</div>
	)
}

function ApprovedRow({ record, onOpen }: { record: Submission; onOpen: (id: string) => void }) {
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(record.id)}
				data-submission={record.id}
				className="group flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 max-lg:min-h-14"
			>
				<Thumbnail submission={record} />
				<span className="min-w-0 flex-1">
					<span className="block truncate font-mono text-sm font-medium transition-colors group-hover:text-primary">{record.name}</span>
					<span className="mt-0.5 flex flex-wrap gap-1">
						<Kind record={record} />
						<Round round={record.round} />
					</span>
				</span>
				<Time value={record.updated} />
				<ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
			</button>
		</li>
	)
}
