"use client"

import { ArrowRight, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { LegacyIconSubmissionForm } from "@/components/legacy-icon-submission-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ExistingSubmission } from "@/hooks/use-submission-catalog"
import type { IconNameOption } from "@/hooks/use-submissions"

export function EditIconPicker({
	names,
	submissions,
	initialSearch = "",
	rejectedOnly = false,
}: {
	names: string[]
	submissions: ExistingSubmission[]
	initialSearch?: string
	rejectedOnly?: boolean
}) {
	const [search, setSearch] = useState(initialSearch)
	const [selection, setSelection] = useState<IconNameOption | null>(null)
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
	if (selection)
		return (
			<section className="space-y-5">
				<div className="space-y-3 rounded-xl bg-muted/40 p-4">
					<h2 className="font-semibold">Propose an update to {selection.value}</h2>
					<p className="max-w-prose text-sm text-muted-foreground">
						The current update form sends a separate Submission with replacement files for review. Include the Base and every Variant you
						want kept. Nothing changes in the collection until reviewed and published.
					</p>
					<Button variant="outline" onClick={() => setSelection(null)}>
						Choose another Icon
					</Button>
				</div>
				<LegacyIconSubmissionForm key={selection.submissionId ?? selection.value} initialIcon={selection} />
			</section>
		)
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
										final. You can fix and resubmit the same Submission when in-place editing is available.
									</p>
								)}
								{!submission.mine && (
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
									<p className="text-sm text-muted-foreground">
										In-place editing is coming. View the Submission and its feedback now; do not create a duplicate to fix it.
									</p>
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
