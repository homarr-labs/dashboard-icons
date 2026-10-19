"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { IconUpdateEditor } from "@/components/submission/icon-update-editor"
import { OwnSubmissionEditor } from "@/components/submission/own-submission-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
	return (
		<section className="mx-auto max-w-3xl space-y-5 rounded-xl border bg-background p-4 sm:p-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Which Icon do you want to change?</h2>
				<p className="text-sm text-muted-foreground">
					Find a published Icon or a community Submission. Your new-Icon cards stay here when you switch modes.
				</p>
			</div>
			<div className="space-y-2">
				<label htmlFor="edit-icon-search" className="text-sm font-medium">
					Find an Icon or Submission
				</label>
				<div className="relative">
					<Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
					<Input
						id="edit-icon-search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by slug, for example sonarr"
						className="pl-9"
					/>
				</div>
			</div>
			{matches.length > 0 && (
				<div className="space-y-2">
					<h3 className="font-medium">Community Submissions</h3>
					<ul className="divide-y rounded-lg border">
						{matches.slice(0, 30).map((submission) => (
							<li key={submission.id} className="space-y-2 p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="min-w-0">
										<p className="break-all font-mono text-sm font-semibold">{submission.name}</p>
										<p className="break-all font-mono text-sm text-muted-foreground">#{submission.id}</p>
										<p className="text-sm text-muted-foreground">
											{submission.mine ? "Your Submission" : "Another contributor’s Submission"} · {submission.status}
										</p>
									</div>
									<Button variant="outline" className="min-h-11" asChild>
										<Link href={`/community/submissions/${submission.id}`}>
											View Submission <ArrowRight aria-hidden />
										</Link>
									</Button>
								</div>
								{submission.status === "rejected" && (
									<p className="text-sm">
										{submission.feedback && <span className="block break-words">Reviewer: {submission.feedback}</span>}Rejections are never
										final. Fix the feedback and resubmit this same Submission.
									</p>
								)}
								{!submission.mine && submission.status === "pending" && (
									<Button
										variant="ghost"
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
										Propose an update
									</Button>
								)}
								{submission.mine && (
									<Button variant="outline" className="min-h-11" onClick={() => setOwnId(submission.id)}>
										{submission.status === "rejected" ? "Fix and resubmit" : "Edit your Submission"} <ArrowRight aria-hidden />
									</Button>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
			{!rejectedOnly && (
				<div className="space-y-2">
					<h3 className="font-medium">Published Icons</h3>
					<ul className="divide-y rounded-lg border">
						{published.map((name) => (
							<li key={name} className="flex flex-wrap items-center justify-between gap-2 p-3">
								<Link
									href={`/icons/${name}`}
									className="flex min-h-11 min-w-11 items-center break-all font-mono text-sm font-medium underline underline-offset-4"
								>
									{name}
								</Link>
								<Button variant="outline" onClick={() => setSelection({ label: name, value: name, source: "collection" })}>
									Propose an update <ArrowRight aria-hidden />
								</Button>
							</li>
						))}
					</ul>
					{published.length === 0 && <p className="py-3 text-sm text-muted-foreground">No published Icon matches this search.</p>}
					{published.length === 20 && (
						<p className="text-sm text-muted-foreground">Showing the first 20 matches. Refine your search to find another Icon.</p>
					)}
				</div>
			)}
			{rejectedOnly && matches.length === 0 && <p className="text-sm text-muted-foreground">No rejected Submissions match this search.</p>}
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
			<section className="mx-auto max-w-3xl space-y-4" aria-live="polite">
				{query.isPending && <p>Loading your Submission…</p>}
				{query.error && (
					<p role="alert" className="text-destructive">
						{query.error.message}
					</p>
				)}
				{query.isError && (
					<Button variant="outline" onClick={() => void query.refetch()}>
						Retry loading
					</Button>
				)}
				<Button variant="ghost" onClick={onBack}>
					Choose another Icon
				</Button>
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
