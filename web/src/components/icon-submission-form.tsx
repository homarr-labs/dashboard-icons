"use client"

import "@/components/submission/submission-form.css"

import { Check, Eye, History, Loader2, Pencil, Plus, UploadCloud } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { EditIconPicker } from "@/components/submission/edit-icon-picker"
import { SubmissionCard } from "@/components/submission/submission-card"
import { SubmissionPreview } from "@/components/submission/submission-preview"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSubmissionDrafts } from "@/hooks/use-submission-drafts"
import { isEmptyDraft, moveDraftAssets, newSubmissionDraft, sameProductSuggestion } from "@/lib/submission-drafts"
import { cn } from "@/lib/utils"

export { IconSubmissionContent } from "@/components/legacy-icon-submission-form"

export function IconSubmissionForm() {
	const form = useSubmissionDrafts()
	const [mode, setMode] = useState<"submit" | "edit">("submit")
	const [editSearch, setEditSearch] = useState("")
	const [rejectedOnly, setRejectedOnly] = useState(false)
	const [previewOpen, setPreviewOpen] = useState(false)
	const [collapsed, setCollapsed] = useState(false)
	const dropzone = useDropzone({ noClick: true, noKeyboard: true, disabled: form.sending, onDrop: (files) => form.addFiles(files) })
	const ownRejected = form.hints.data?.filter((item) => item.mine && item.status === "rejected") ?? []
	const edit = (name = "", onlyRejected = false) => {
		setEditSearch(name)
		setRejectedOnly(onlyRejected)
		setMode("edit")
	}
	const sendButton = (
		<Button type="button" disabled={!form.canSend} onClick={form.send} className="min-h-11 whitespace-normal text-secondary-foreground">
			{form.sending && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
			{form.sending ? "Sending…" : `Send ${form.filled.length || ""} ${form.filled.length === 1 ? "Submission" : "Submissions"}`}
		</Button>
	)
	return (
		<div
			className="mx-auto max-w-6xl pb-32 lg:pb-6 [&_button]:min-h-11 [&_input:not([type=file])]:min-h-11 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-ring"
			data-submission-form
		>
			<header className="mb-6 space-y-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Submit icons</h1>
					<p className="mt-2 max-w-prose text-sm text-muted-foreground">
						Each Icon is its own Submission, with all of its Variants. Reviewers check them one at a time.
					</p>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto">
						{(
							[
								{ id: "submit", label: "Submit new icons", short: "Submit", Icon: Plus },
								{ id: "edit", label: "Edit an existing icon", short: "Edit", Icon: Pencil },
							] as const
						).map(({ id, label, short, Icon }) => (
							<button
								key={id}
								type="button"
								disabled={form.sending}
								aria-pressed={mode === id && !form.sent}
								onClick={() => {
									setMode(id)
									form.setSent(null)
									setRejectedOnly(false)
								}}
								className={cn(
									"flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium sm:flex-none",
									mode === id && !form.sent ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="size-4" aria-hidden />
								<span className="sm:hidden">{short}</span>
								<span className="max-sm:hidden">{label}</span>
							</button>
						))}
					</div>
					{ownRejected.length > 0 && (
						<Button variant="outline" disabled={form.sending} onClick={() => edit("", true)} className="max-sm:w-full">
							<History aria-hidden />
							Fix a rejected Submission ({ownRejected.length})
						</Button>
					)}
				</div>
			</header>
			{form.catalog.isError && (
				<p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
					{form.catalog.error.message}
					<Button variant="ghost" onClick={() => form.catalog.refetch()}>
						Retry suggestions
					</Button>
				</p>
			)}
			{form.hints.isError && (
				<p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
					Pending Submission hints could not be loaded.
					<Button variant="ghost" onClick={() => form.hints.refetch()}>
						Retry hints
					</Button>
				</p>
			)}
			{form.catalog.data?.customVariantError && (
				<p aria-live="polite" className="mb-4 text-sm text-muted-foreground">
					{form.catalog.data.customVariantError}
					<Button variant="ghost" onClick={() => form.catalog.refetch()}>
						Retry suggestions
					</Button>
				</p>
			)}
			{form.sent && (
				<section className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-background p-5" aria-live="polite">
					<div className="flex items-center gap-3">
						<Check className="size-8 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
						<div>
							<h2 className="text-xl font-semibold">Sent for review</h2>
							<p className="text-sm text-muted-foreground">
								{form.sent.length} independent {form.sent.length === 1 ? "Submission was" : "Submissions were"} added to the review queue.
							</p>
						</div>
					</div>
					<ul className="divide-y rounded-lg border">
						{form.sent.map((record) => (
							<li key={record.id}>
								<Link
									href={`/community/submissions/${record.id}`}
									className="flex min-h-14 flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50"
								>
									<span className="break-all font-mono text-sm font-semibold">{record.name}</span>
									<span className="text-sm text-muted-foreground">View Submission →</span>
								</Link>
							</li>
						))}
					</ul>
					<p className="text-sm text-muted-foreground">
						A Rejection is never final. You can fix the feedback and resubmit the same Submission.
					</p>
					<Button
						onClick={() => {
							form.setSent(null)
							form.setSelected(null)
							setCollapsed(false)
						}}
					>
						Submit more icons
					</Button>
				</section>
			)}
			{!form.sent && (
				<div hidden={mode !== "edit"}>
					<EditIconPicker
						key={`${editSearch}-${rejectedOnly}`}
						names={form.catalog.data?.names ?? []}
						submissions={form.hints.data ?? []}
						initialSearch={editSearch}
						rejectedOnly={rejectedOnly}
					/>
				</div>
			)}
			{!form.sent && mode === "submit" && (
				<div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
					<fieldset disabled={form.sending || form.importing} className="min-w-0 space-y-3">
						<legend className="sr-only">New Icons</legend>
						<div
							{...dropzone.getRootProps()}
							className={cn("relative min-w-0 space-y-3", dropzone.isDragActive && "rounded-xl outline-2 outline-offset-4 outline-primary")}
						>
							<input {...dropzone.getInputProps()} aria-label="Upload files for several Icons" />
							{form.importing && (
								<p aria-live="polite" className="rounded-lg bg-muted/50 p-3 text-sm">
									Loading known Variant names and sorting your files…
								</p>
							)}
							<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
								<p className="max-w-prose text-sm text-muted-foreground">
									Drop SVG or PNG files here, or choose files. Recognised suffixes sort into one Icon’s Variants. Up to 12 Icons, 99 files
									per Icon, 5 MB per file, 60 MB total.
								</p>
								<Button variant="outline" onClick={dropzone.open}>
									<UploadCloud aria-hidden />
									Choose files
								</Button>
							</div>
							{dropzone.isDragActive && (
								<p aria-live="polite" className="rounded-lg bg-primary/10 p-3 text-sm font-medium">
									Drop to sort files into Icons. Duplicate slots will ask which file to keep.
								</p>
							)}
							{form.drafts.map((draft, index) => {
								const suggestionSlugs = new Set([...form.knownSlugs, ...(form.hints.data ?? []).map((item) => item.name)])
								const suggestion = sameProductSuggestion(draft, form.drafts, suggestionSlugs)
								const pending = form.hints.data?.filter((item) => item.name === draft.name) ?? []
								return (
									<SubmissionCard
										key={draft.id}
										draft={draft}
										index={index + 1}
										open={!collapsed && form.current?.id === draft.id}
										error={form.cardErrors[draft.id]}
										customNames={form.catalog.data?.customVariantNames ?? []}
										onSelect={() => {
											setCollapsed(form.current?.id === draft.id && !collapsed)
											form.setSelected(draft.id)
										}}
										onChange={(patch) => form.update(draft.id, patch)}
										onFiles={(files) => form.addFiles(files, draft.id)}
										onRemove={() => {
											form.setDrafts((items) => {
												const next = items.filter((item) => item.id !== draft.id)
												return next.length ? next : [newSubmissionDraft()]
											})
											form.setSelected(null)
										}}
										onPreview={() => {
											form.setSelected(draft.id)
											setPreviewOpen(true)
										}}
										onApplyCategories={() => {
											form.setDrafts((items) =>
												items.map((item) =>
													item.id !== draft.id && !isEmptyDraft(item)
														? { ...item, categories: [...new Set([...item.categories, ...draft.categories])] }
														: item,
												),
											)
											toast.success("Categories added to the other filled cards")
										}}
									>
										{form.knownSlugs.has(draft.name) && (
											<Button variant="outline" onClick={() => edit(draft.name)}>
												Edit {draft.name} instead
											</Button>
										)}
										{suggestion && (
											<div className="space-y-2 rounded-lg bg-muted/50 p-3">
												<p className="break-words text-sm">
													Looks like a Variant of <strong className="font-mono">{suggestion.name}</strong>. Is this the same product?
												</p>
												<div className="flex flex-wrap gap-2">
													{suggestion.draftId && (
														<Button
															variant="outline"
															onClick={() => {
																const targetId = suggestion.draftId
																if (!targetId) return
																form.setDrafts((items) => moveDraftAssets(items, draft.id, targetId, suggestion.variant))
																form.setSelected(targetId)
																setCollapsed(false)
															}}
														>
															Move onto {suggestion.name}
														</Button>
													)}
													{suggestionSlugs.has(suggestion.name) && (
														<Button variant="outline" onClick={() => edit(suggestion.name)}>
															Edit {suggestion.name}
														</Button>
													)}
													<span className="self-center text-sm text-muted-foreground">
														Suggestion only, keeping a separate Icon is allowed.
													</span>
												</div>
											</div>
										)}
										{pending.map((item) => (
											<div key={item.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
												<p className="text-sm">
													{item.mine
														? `You already have a ${item.status} Submission for this Icon.`
														: "Another contributor has a pending Submission for this Icon. You can propose an update to theirs."}
													{item.status === "rejected" && " Rejections are never final."}
												</p>
												<Button variant="outline" onClick={() => edit(draft.name)}>
													{item.mine ? "Find your Submission" : "Propose an update instead"}
												</Button>
												<p className="text-sm text-muted-foreground">This suggestion does not block sending.</p>
											</div>
										))}
									</SubmissionCard>
								)
							})}
						</div>
						<Button
							variant="outline"
							className="min-h-12 w-full border-dashed"
							onClick={() => {
								const draft = newSubmissionDraft()
								form.setDrafts((items) => [...items, draft])
								form.setSelected(draft.id)
								setCollapsed(false)
							}}
						>
							<Plus aria-hidden />
							Add new Submission
						</Button>
					</fieldset>
					<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:self-start">
						<div className="max-lg:hidden">
							<SubmissionPreview draft={form.current} />
						</div>
						<section className="space-y-3 rounded-xl border bg-background p-4">
							<h2 className="font-semibold">Ready to send</h2>
							<ul className="max-h-60 space-y-1 overflow-y-auto">
								{form.filled.map((draft) => (
									<li key={draft.id}>
										<button
											type="button"
											onClick={() => {
												form.setSelected(draft.id)
												setCollapsed(false)
												document.querySelector(`[data-submission-card="${draft.id}"]`)?.scrollIntoView({ block: "start" })
											}}
											className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded px-1 text-left hover:bg-muted/50"
										>
											<span className="truncate font-mono text-sm">{draft.name || "Untitled icon"}</span>
											<span className={cn("shrink-0 text-sm", form.cardErrors[draft.id] ? "text-destructive" : "text-muted-foreground")}>
												{form.cardErrors[draft.id]
													? "Fix needed"
													: `${draft.assets.length} ${draft.assets.length === 1 ? "file" : "files"}`}
											</span>
										</button>
									</li>
								))}
							</ul>
							<p className="text-sm text-muted-foreground">
								{form.filled.length} Icons · {form.fileCount} files · {(form.bytes / 1024 / 1024).toFixed(1)} / 60 MB
							</p>
							{form.limitError && (
								<p role="alert" className="text-sm text-destructive">
									{form.limitError}
								</p>
							)}
							{form.sendError && (
								<p role="alert" className="break-words text-sm text-destructive">
									{form.sendError}
								</p>
							)}
							<p className="text-sm text-muted-foreground">All Icons are saved together, or none are. Each is reviewed separately.</p>
							<div className="max-lg:hidden [&>button]:w-full">{sendButton}</div>
						</section>
					</aside>
					<div
						data-submission-actions
						className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
					>
						<Button variant="outline" className="min-w-11" aria-label="Preview selected Icon" onClick={() => setPreviewOpen(true)}>
							<Eye aria-hidden />
							<span className="sr-only sm:not-sr-only">Preview</span>
						</Button>
						<p
							className={cn(
								"min-w-0 flex-1 text-sm",
								Object.keys(form.cardErrors).length > 0 || form.limitError ? "text-destructive" : "text-muted-foreground",
							)}
						>
							{Object.keys(form.cardErrors).length > 0 || form.limitError
								? "Fix the highlighted cards"
								: `${form.fileCount} files, ${form.filled.length} Icons`}
						</p>
						{sendButton}
					</div>
					<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
						<DialogContent
							aria-describedby={undefined}
							className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md [&>button]:top-1 [&>button]:right-1 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
						>
							<DialogHeader>
								<DialogTitle>Selected Icon preview</DialogTitle>
							</DialogHeader>
							<SubmissionPreview draft={form.current} embedded />
						</DialogContent>
					</Dialog>
				</div>
			)}
		</div>
	)
}
