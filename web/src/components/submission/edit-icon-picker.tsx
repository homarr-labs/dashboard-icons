"use client"

import { useQuery } from "@tanstack/react-query"
import {
	ArrowLeft,
	ArrowRight,
	ExternalLink,
	History,
	Library,
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
import { PANEL_CLASS, SectionHeading, type Tone } from "@/components/submission/submission-ui"
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
import { cn } from "@/lib/utils"

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
		tone: "community",
		title: "Which Icon do you want to change?",
		description: "Find a published Icon or a community Submission. Your new-Icon cards stay here when you switch modes.",
	}
	if (rejectedOnly)
		heading = {
			icon: History,
			tone: "destructive",
			title: "Which rejected Submission do you want to fix?",
			description: "Each one keeps its id and history when you resubmit it.",
		}
	return (
		<section className={cn(PANEL_CLASS, "mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6")}>
			<SectionHeading level={2} {...heading} />
			<div className="flex flex-col gap-2">
				<label htmlFor="edit-icon-search" className="text-sm font-medium">
					Find an Icon or Submission
				</label>
				<div className="relative">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input
						id="edit-icon-search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by slug, for example sonarr"
						className="h-10 pl-9"
					/>
				</div>
			</div>
			{matches.length > 0 && (
				<div className="flex flex-col gap-3">
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<Users className="size-4 text-community" aria-hidden />
						Community Submissions
						<Badge variant="outline" className="border-community/20 bg-community/10 text-community">
							{matches.length}
						</Badge>
					</h3>
					<ul className="flex flex-col gap-2">
						{matches.slice(0, 30).map((submission) => (
							<li key={submission.id} className="flex flex-col gap-3 rounded-md border p-3">
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
												className="border-community/40 text-community hover:bg-community/10"
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
											<Button size="sm" onClick={() => setOwnId(submission.id)}>
												{submission.status === "rejected" ? "Fix and resubmit" : "Edit your Submission"} <ArrowRight aria-hidden />
											</Button>
										)}
									</div>
								</div>
								{submission.status === "rejected" && (
									<div className="flex gap-2.5 rounded-md border-l-2 border-destructive bg-destructive/5 p-3 text-sm">
										<MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
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
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<Library className="size-4 text-success" aria-hidden />
						Published Icons
					</h3>
					<MagicCardPointerProvider className="grid gap-2 sm:grid-cols-2">
						{published.map((name) => (
							<MagicCard key={name} className="min-w-0 rounded-md">
								<div className="flex min-w-0 items-center gap-3 p-2">
									<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-border dark:bg-secondary/10">
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
										className="shrink-0 border-community/40 text-community hover:bg-community/10"
										onClick={() => setSelection({ label: name, value: name, source: "collection" })}
									>
										<PencilLine aria-hidden />
										<span className="max-sm:sr-only">Propose an update</span>
										<span className="sm:hidden" aria-hidden>
											Update
										</span>
									</Button>
								</div>
							</MagicCard>
						))}
					</MagicCardPointerProvider>
					{published.length === 0 && (
						<p className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground">
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
				<p className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground">
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
			<section className={cn(PANEL_CLASS, "mx-auto flex max-w-3xl flex-col gap-4 p-5")} aria-live="polite">
				{query.isPending && (
					<div className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">Loading your Submission…</p>
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-40 w-full" />
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
