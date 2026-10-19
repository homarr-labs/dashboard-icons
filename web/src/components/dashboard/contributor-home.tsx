"use client"
import {
	ArrowRight,
	ExternalLink,
	GitPullRequestArrow,
	ImagePlus,
	Pencil,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	SearchX,
	XCircle,
} from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type DashboardFilters, statusLabels } from "@/lib/dashboard/types"
import { pb, type Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Empty, ErrorState, fileCount, Round, Status, selectedRing, statusStyles, Thumbnail, Time } from "./primitives"
import { FilterInput } from "./submission-list"

const steps = [
	{ label: "Submit", detail: "Upload the icon and its Variants" },
	{ label: "Review", detail: "A maintainer checks every file" },
	{ label: "Publish", detail: "It ships to the collection" },
]
export function ContributorHome({
	records,
	loading,
	error,
	retry,
	filters,
	activeId,
	onFilter,
	onOpen,
	refresh,
	refreshing,
}: {
	records: Submission[]
	loading: boolean
	error: unknown
	retry: () => void
	filters: DashboardFilters
	activeId: string
	onFilter: (patch: Record<string, string>) => void
	onOpen: (id: string) => void
	refresh: () => void
	refreshing: boolean
}) {
	const username: unknown = pb.authStore.record?.username
	const term = filters.search.trim().toLowerCase()
	const visible = records.filter(
		(record) => (!filters.status || record.status === filters.status) && (!term || record.name.toLowerCase().includes(term)),
	)
	const rejected = records.filter((record) => record.status === "rejected")
	const empty = !loading && !error && !records.length
	return (
		<div className="space-y-6 pb-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					{typeof username === "string" && <p className="text-sm text-muted-foreground">Welcome back, {username}</p>}
					<h2 className="text-2xl font-semibold tracking-tight">Your submissions</h2>
					<p className="mt-1 max-w-prose text-sm text-muted-foreground">
						Track every icon you sent, fix anything a reviewer flagged and follow it all the way into the collection.
					</p>
				</div>
				{!empty && (
					<div className="flex flex-wrap gap-2">
						<Button asChild variant="outline" className="max-lg:min-h-11">
							<Link href="/submit">
								<GitPullRequestArrow />
								Propose an update
							</Link>
						</Button>
						<Button asChild className="max-lg:min-h-11">
							<Link href="/submit">
								<Plus />
								Submit an icon
							</Link>
						</Button>
					</div>
				)}
			</header>
			{error !== null && <ErrorState error={error} retry={retry} />}
			{loading && (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{["a", "b", "c", "d", "e", "f"].map((key) => (
						<Skeleton key={key} className="h-44 rounded-lg" />
					))}
				</div>
			)}
			{empty && (
				<section className="rounded-lg border border-dashed px-6 py-12 text-center">
					<span className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
						<ImagePlus className="size-6" />
					</span>
					<h3 className="mt-4 text-lg font-semibold">Your first icon starts here</h3>
					<p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
						Missing a logo for a self-hosted app? Submit it with its Variants and follow it here until it lands in the collection.
					</p>
					<ol className="mx-auto mt-6 grid max-w-xl gap-2 text-left sm:grid-cols-3">
						{steps.map((step, index) => (
							<li key={step.label} className="rounded-md border p-3">
								<span className="flex items-center gap-2 text-sm font-semibold">
									<span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground tabular-nums">
										{index + 1}
									</span>
									{step.label}
								</span>
								<span className="mt-1 block text-xs text-muted-foreground">{step.detail}</span>
							</li>
						))}
					</ol>
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<Button asChild className="max-lg:min-h-11">
							<Link href="/submit">
								<Plus />
								Submit your first icon
							</Link>
						</Button>
						<Button asChild variant="outline" className="max-lg:min-h-11">
							<Link href="/community">
								Browse community icons
								<ArrowRight />
							</Link>
						</Button>
					</div>
				</section>
			)}
			{!!rejected.length && !filters.status && !term && (
				<Card className="gap-0 overflow-hidden bg-background/50 py-0">
					<div className="flex items-start gap-3 border-b px-4 py-3">
						<XCircle className={cn("mt-0.5 size-4 shrink-0", statusStyles.rejected.text)} />
						<div>
							<h3 className="text-sm font-semibold">Needs your attention</h3>
							<p className="text-xs text-muted-foreground">
								Rejections are never final. Fix the feedback and resubmit the same Submission.
							</p>
						</div>
					</div>
					<ul className="divide-y">
						{rejected.map((record) => (
							<li key={record.id} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
								<Thumbnail submission={record} />
								<div className="min-w-0 flex-1">
									<p className="truncate font-mono text-sm font-medium">{record.name}</p>
									<p className="line-clamp-2 text-xs text-muted-foreground">{record.admin_comment || "No written feedback."}</p>
								</div>
								<Button asChild size="sm" className="shrink-0 max-sm:w-full max-lg:min-h-11">
									<Link href={`/submit?submission=${encodeURIComponent(record.id)}`}>
										<RotateCcw />
										Fix & resubmit
									</Link>
								</Button>
							</li>
						))}
					</ul>
				</Card>
			)}
			{!!records.length && (
				<div className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<div className="min-w-56 flex-1">
							<FilterInput
								compact
								label="Search your submissions"
								placeholder="Search your submissions…"
								value={filters.search}
								onChange={(search) => onFilter({ search })}
								icon={<Search />}
							/>
						</div>
						<Button
							variant="outline"
							size="icon"
							className="max-lg:size-11"
							aria-label="Refresh submissions"
							disabled={refreshing}
							onClick={refresh}
						>
							<RefreshCw className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />
						</Button>
					</div>
					<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<ToggleGroup
							type="single"
							variant="outline"
							size="sm"
							aria-label="Filter by status"
							value={filters.status || "all"}
							onValueChange={(value) => {
								if (value === "all") onFilter({ status: "" })
								else if (value) onFilter({ status: value })
							}}
						>
							{[["all", "All"], ...Object.entries(statusLabels)].map(([value, label]) => {
								let count = records.length
								if (value !== "all") count = records.filter((record) => record.status === value).length
								return (
									<ToggleGroupItem key={value} value={value} className="flex-none gap-2 px-3 max-lg:min-h-11">
										{value !== "all" && <span className={cn("size-2 rounded-full", statusStyles[value as Submission["status"]].dot)} />}
										{label}
										<span className="tabular-nums text-muted-foreground">{count}</span>
									</ToggleGroupItem>
								)
							})}
						</ToggleGroup>
					</div>
				</div>
			)}
			{!!records.length && !visible.length && (
				<Empty
					title="No submissions match"
					icon={SearchX}
					action={
						<Button variant="outline" onClick={() => onFilter({ status: "", search: "" })}>
							Clear filters
						</Button>
					}
				>
					Try another status or search term.
				</Empty>
			)}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{visible.map((record) => (
					<motion.div key={record.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
						<SubmissionCard record={record} active={record.id === activeId} onOpen={onOpen} />
					</motion.div>
				))}
			</div>
		</div>
	)
}

function SubmissionCard({ record, active, onOpen }: { record: Submission; active: boolean; onOpen: (id: string) => void }) {
	const edit = `/submit?submission=${encodeURIComponent(record.id)}`
	let kind = "New icon"
	if (record.icon_update) kind = `Update to ${record.icon_update.target.name}`
	else if (record.target_submission) kind = "Update proposal"
	return (
		<Card className={cn("h-full gap-0 overflow-hidden bg-background/50 py-0", active && selectedRing)}>
			<button
				type="button"
				data-submission={record.id}
				onClick={() => onOpen(record.id)}
				className="group flex flex-1 flex-col gap-3 p-4 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
			>
				<span className="flex min-w-0 items-center gap-3">
					<Thumbnail submission={record} large className="size-14 rounded-lg p-2" />
					<span className="min-w-0 flex-1">
						<span className="block truncate font-mono text-sm font-semibold transition-colors group-hover:text-primary">{record.name}</span>
						<span className="block truncate text-xs text-muted-foreground">
							{kind} · {fileCount(record.assets.length)}
						</span>
						<span className="flex items-center gap-1 text-xs text-muted-foreground">
							Updated <Time value={record.updated} />
						</span>
					</span>
				</span>
				<span className="flex flex-wrap gap-1.5">
					<Status status={record.status} />
					<Round round={record.round} />
				</span>
				{record.admin_comment && (
					<span className="line-clamp-2 border-l-2 pl-2.5 text-xs text-muted-foreground">{record.admin_comment}</span>
				)}
			</button>
			<div className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5">
				{record.status === "rejected" && (
					<Button asChild size="sm" className="max-lg:min-h-11">
						<Link href={edit}>
							<RotateCcw />
							Fix & resubmit
						</Link>
					</Button>
				)}
				{record.status === "pending" && (
					<Button asChild size="sm" variant="ghost" className="max-lg:min-h-11">
						<Link href={edit}>
							<Pencil />
							Edit
						</Link>
					</Button>
				)}
				{record.status === "added_to_collection" && (
					<Button asChild size="sm" variant="ghost" className="max-lg:min-h-11">
						<Link href="/submit">
							<GitPullRequestArrow />
							Propose an update
						</Link>
					</Button>
				)}
				{record.status === "approved" && <span className="px-2 text-xs text-muted-foreground">Waiting to be published</span>}
				<Button asChild size="sm" variant="ghost" className="ml-auto text-muted-foreground max-lg:min-h-11">
					<Link href={`/community/submissions/${record.id}`} target="_blank" rel="noreferrer">
						Preview
						<ExternalLink />
					</Link>
				</Button>
			</div>
		</Card>
	)
}
