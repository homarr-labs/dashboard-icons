"use client"

import { useQuery } from "@tanstack/react-query"
import {
	ArrowLeft,
	ArrowRight,
	ExternalLink,
	History,
	type LucideIcon,
	MessageSquareWarning,
	PencilLine,
	RefreshCw,
	Search,
	SearchX,
	Users,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { StatusBadge } from "@/components/status-badge"
import { IconUpdateEditor } from "@/components/submission/icon-update-editor"
import { OwnSubmissionEditor } from "@/components/submission/own-submission-editor"
import { SectionHeading, type Tone } from "@/components/submission/submission-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { BASE_URL } from "@/constants"
import type { ExistingSubmission } from "@/hooks/use-submission-catalog"
import type { IconNameOption } from "@/hooks/use-submissions"
import type { OwnedSubmissionResponse } from "@/lib/icon-update"
import { pb } from "@/lib/pb"

export function EditIconPicker({
	names,
	submissions,
	initialSearch = "",
	rejectedOnly = false,
	initialSubmissionId = "",
	customNames = [],
}: {
	names: string[]
	submissions: ExistingSubmission[]
	initialSearch?: string
	rejectedOnly?: boolean
	initialSubmissionId?: string
	customNames?: string[]
}) {
	const [search, setSearch] = useState(initialSearch)
	const [selection, setSelection] = useState<IconNameOption | null>(null)
	const [ownId, setOwnId] = useState(initialSubmissionId)
	const term = search.trim().toLowerCase()
	const matches = submissions.filter(
		(submission) => submission.name.includes(term) && (!rejectedOnly || (submission.mine && submission.status === "rejected")),
	)
	const published = names
		.filter((name) => name.includes(term))
		.sort((a, b) => {
			if (a === term) return -1
			if (b === term) return 1
			return a.localeCompare(b)
		})
		.slice(0, 20)
	if (ownId) return <OwnedEditor key={ownId} id={ownId} customNames={customNames} onBack={() => setOwnId("")} />
	if (selection)
		return <IconUpdateEditor key={selection.submissionId ?? selection.value} selection={selection} onCancel={() => setSelection(null)} />
	let heading: { icon: LucideIcon; tone: Tone; title: string; description: string } = {
		icon: PencilLine,
		tone: "violet",
		title: "Which Icon do you want to change?",
		description: "Find a published Icon or a community Submission. Your new-Icon cards stay here when you switch modes.",
	}
	if (rejectedOnly)
		heading = {
			icon: History,
			tone: "amber",
			title: "Which rejected Submission do you want to fix?",
			description: "Each one keeps its id and history when you resubmit it.",
		}
	return (
		<section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
			<SectionHeading level={2} {...heading} />
			<div className="flex flex-col gap-2">
				<label htmlFor="edit-icon-search" className="text-sm font-medium">
					Find an Icon or Submission
				</label>
				<div className="relative">
					<Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input
						id="edit-icon-search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by slug, for example sonarr"
						className="h-12 rounded-xl bg-background pl-12 text-base"
					/>
				</div>
			</div>
			{matches.length > 0 && (
				<div className="flex flex-col gap-3">
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<Users className="size-4 text-muted-foreground" aria-hidden />
						Community Submissions
						<Badge variant="secondary" className="rounded-full">
							{matches.length}
						</Badge>
					</h3>
					<ul className="flex flex-col gap-2">
						{matches.slice(0, 30).map((submission) => (
							<li key={submission.id} className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="min-w-0 flex-1 basis-48">
										<p className="flex flex-wrap items-center gap-2">
											<span className="break-all font-mono text-sm font-semibold">{submission.name}</span>
											<StatusBadge status={submission.status} />
										</p>
										<p className="mt-1 break-all text-xs text-muted-foreground">
											<span className="font-mono">#{submission.id}</span> ·{" "}
											{submission.mine ? "Your Submission" : "Another contributor’s Submission"}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button variant="ghost" size="sm" asChild>
											<Link href={`/community/submissions/${submission.id}`}>
												View Submission <ExternalLink aria-hidden />
											</Link>
										</Button>
										{!submission.mine && submission.status === "pending" && (
											<Button
												variant="outline"
												size="sm"
												className="border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10"
												onClick={() =>
													setSelection({
														label: submission.name,
														value: submission.name,
														source: "community",
														submissionId: submission.id,
														status: submission.status,
													})
												}
											>
												<PencilLine aria-hidden />
												Propose an update
											</Button>
										)}
										{submission.mine && (
											<Button
												variant="outline"
												size="sm"
												className="border-primary/40 bg-primary/5 hover:bg-primary/10"
												onClick={() => setOwnId(submission.id)}
											>
												{submission.status === "rejected" ? "Fix and resubmit" : "Edit your Submission"} <ArrowRight aria-hidden />
											</Button>
										)}
									</div>
								</div>
								{submission.status === "rejected" && (
									<div className="flex gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm">
										<MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
										<p>
											{submission.feedback && <span className="block break-words font-medium">Reviewer: {submission.feedback}</span>}
											<span className="text-muted-foreground">
												Rejections are never final. Fix the feedback and resubmit this same Submission.
											</span>
										</p>
									</div>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
			{!rejectedOnly && (
				<div className="flex flex-col gap-3">
					<h3 className="text-sm font-semibold">Published Icons</h3>
					<MagicCardPointerProvider className="grid gap-2 sm:grid-cols-2">
						{published.map((name) => (
							<MagicCard key={name} className="min-w-0 rounded-xl">
								<div className="flex min-w-0 items-center gap-3 p-2.5">
									<span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-white/5 dark:bg-secondary/10 dark:ring-white/10">
										<UnoptimizedImage
											src={`${BASE_URL}/webp/${name}.webp`}
											alt=""
											width={32}
											height={32}
											className="size-8 object-contain"
										/>
									</span>
									<Link
										href={`/icons/${name}`}
										className="flex min-h-11 min-w-0 flex-1 items-center truncate font-mono text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
									>
										<span className="truncate">{name}</span>
									</Link>
									<Button
										variant="outline"
										size="sm"
										className="shrink-0 border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10"
										onClick={() => setSelection({ label: name, value: name, source: "collection" })}
									>
										<span className="max-sm:sr-only">Propose an update</span>
										<ArrowRight aria-hidden />
									</Button>
								</div>
							</MagicCard>
						))}
					</MagicCardPointerProvider>
					{published.length === 0 && (
						<p className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground">
							<SearchX className="size-6" aria-hidden />
							No published Icon matches this search.
						</p>
					)}
					{published.length === 20 && (
						<p className="text-sm text-muted-foreground">Showing the first 20 matches. Refine your search to find another Icon.</p>
					)}
				</div>
			)}
			{rejectedOnly && matches.length === 0 && (
				<p className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground">
					<SearchX className="size-6" aria-hidden />
					No rejected Submissions match this search.
				</p>
			)}
		</section>
	)
}

function OwnedEditor({ id, customNames, onBack }: { id: string; customNames: string[]; onBack: () => void }) {
	const query = useQuery({
		queryKey: ["owned-editor", id, pb.authStore.record?.id],
		retry: false,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		queryFn: async (): Promise<OwnedSubmissionResponse> => {
			const response = await fetch(`/api/submissions/${encodeURIComponent(id)}`, { headers: { Authorization: pb.authStore.token } })
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || "Your Submission could not be loaded.")
			return result
		},
	})
	if (!query.data)
		return (
			<section className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm" aria-live="polite">
				{query.isPending && (
					<div className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">Loading your Submission…</p>
						<Skeleton className="h-16 w-full rounded-xl" />
						<Skeleton className="h-40 w-full rounded-xl" />
					</div>
				)}
				{query.error && (
					<p role="alert" className="text-destructive">
						{query.error.message}
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					{query.isError && (
						<Button variant="outline" onClick={() => void query.refetch()}>
							<RefreshCw aria-hidden />
							Retry loading
						</Button>
					)}
					<Button variant="ghost" onClick={onBack}>
						<ArrowLeft aria-hidden />
						Choose another Icon
					</Button>
				</div>
			</section>
		)
	const record = query.data.record
	if (!record.icon_update) return <OwnSubmissionEditor id={id} customNames={customNames} onBack={onBack} />
	return (
		<IconUpdateEditor
			owned={query.data}
			selection={{ value: record.name, label: record.name, source: "community", submissionId: record.icon_update.target.id }}
			onCancel={onBack}
		/>
	)
}
