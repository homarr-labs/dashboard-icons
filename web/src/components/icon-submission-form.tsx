"use client"

import "@/components/submission/submission-form.css"

import {
	ArrowRight,
	Check,
	CheckCircle2,
	Eye,
	History,
	ImagePlus,
	Lightbulb,
	Loader2,
	type LucideIcon,
	PencilLine,
	Plus,
	RefreshCw,
	Send,
	Sparkles,
	UploadCloud,
	UserRound,
} from "lucide-react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { IconSubmissionGuidelines } from "@/components/icon-submission-guidelines"
import { AuroraText } from "@/components/magicui/aurora-text"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { EditIconPicker } from "@/components/submission/edit-icon-picker"
import { SubmissionCard } from "@/components/submission/submission-card"
import { AssetPreview, SubmissionPreview } from "@/components/submission/submission-preview"
import { CTA_CLASS, celebrate, SectionHeading, TONES } from "@/components/submission/submission-ui"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useSubmissionDrafts } from "@/hooks/use-submission-drafts"
import { isEmptyDraft, moveDraftAssets, newSubmissionDraft, sameProductSuggestion } from "@/lib/submission-drafts"
import { MAX_SEND_ASSET_BYTES, MAX_SUBMISSIONS_PER_SEND } from "@/lib/submission-limits"
import { cn } from "@/lib/utils"

export { IconSubmissionContent } from "@/components/legacy-icon-submission-form"

type ModeId = "submit" | "edit" | "rejected"

const MODE_STYLE = {
	primary: { ring: "ring-primary", solid: "bg-primary text-primary-foreground ring-primary", tint: "bg-primary/[0.06]" },
	violet: { ring: "ring-violet-500", solid: "bg-violet-500 text-white ring-violet-500", tint: "bg-violet-500/[0.06]" },
	amber: { ring: "ring-amber-500", solid: "bg-amber-500 text-white ring-amber-500", tint: "bg-amber-500/[0.06]" },
} as const

interface ModeOption {
	id: ModeId
	title: string
	short: string
	description: string
	Icon: LucideIcon
	tone: keyof typeof MODE_STYLE
}

export function IconSubmissionForm() {
	const form = useSubmissionDrafts()
	const [mode, setMode] = useState<"submit" | "edit">("submit")
	const [editSearch, setEditSearch] = useState("")
	const [rejectedOnly, setRejectedOnly] = useState(false)
	const [initialSubmissionId, setInitialSubmissionId] = useState("")
	useEffect(() => {
		const id = new URLSearchParams(window.location.search).get("submission")
		if (!id) return
		setInitialSubmissionId(id)
		setMode("edit")
	}, [])
	useEffect(() => {
		if (form.sent) celebrate()
	}, [form.sent])
	const [previewOpen, setPreviewOpen] = useState(false)
	const [collapsed, setCollapsed] = useState(false)
	const dropzone = useDropzone({ noClick: true, noKeyboard: true, disabled: form.sending, onDrop: (files) => form.addFiles(files) })
	const ownRejected = form.hints.data?.filter((item) => item.mine && item.status === "rejected") ?? []
	const edit = (name = "", onlyRejected = false) => {
		setEditSearch(name)
		setInitialSubmissionId("")
		setRejectedOnly(onlyRejected)
		setMode("edit")
	}
	let activeMode: ModeId | "" = mode
	if (mode === "edit" && rejectedOnly) activeMode = "rejected"
	if (form.sent) activeMode = ""
	const modes: ModeOption[] = [
		{
			id: "submit",
			title: "Submit a new icon",
			short: "New icon",
			description: "Upload one or several icons that aren’t in the collection yet.",
			Icon: ImagePlus,
			tone: "primary",
		},
		{
			id: "edit",
			title: "Update an existing icon",
			short: "Update icon",
			description: "Propose new artwork or metadata, or edit one of your Submissions.",
			Icon: PencilLine,
			tone: "violet",
		},
	]
	if (ownRejected.length > 0)
		modes.push({
			id: "rejected",
			title: "Fix a rejected Submission",
			short: "Fix rejected",
			description: "Address the reviewer’s feedback and resubmit the same Submission.",
			Icon: History,
			tone: "amber",
		})
	const blocked = Object.keys(form.cardErrors).length > 0 || Boolean(form.limitError)
	const sendButton = (
		<Button type="button" disabled={!form.canSend} onClick={form.send} className={cn(CTA_CLASS, "max-lg:w-auto max-lg:shrink-0")}>
			{form.sending && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
			{!form.sending && <Send aria-hidden />}
			{form.sending ? "Sending…" : `Send ${form.filled.length || ""} ${form.filled.length === 1 ? "Submission" : "Submissions"}`}
		</Button>
	)
	return (
		<MotionConfig reducedMotion="user">
			<div
				className="mx-auto max-w-6xl pb-32 lg:pb-6 max-sm:[&_button]:min-h-11 max-sm:[&_input:not([type=file])]:min-h-11 [&_[data-slot=tag-input]_button]:min-h-0 [&_[data-slot=tag-input]_button]:size-6 [&_[data-slot=tag-input]_input]:min-h-0 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-ring"
				data-submission-form
			>
				<header className="mb-8 flex flex-col gap-6">
					<div className="flex flex-col items-start gap-3">
						<Badge variant="outline" className="gap-1.5 rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-primary">
							<Sparkles aria-hidden />
							Community contributions
						</Badge>
						<h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
							Contribute to <AuroraText colors={["#FA5352", "#FA5352", "orange"]}>dashboard icons</AuroraText>
						</h1>
						<p className="max-w-2xl text-pretty text-muted-foreground">
							Add a brand-new icon or improve one that’s already in the collection. A maintainer reviews every Submission before it’s
							published.
						</p>
					</div>
					<fieldset className="min-w-0">
						<legend className="sr-only">What do you want to do?</legend>
						<MagicCardPointerProvider className={cn("grid grid-cols-2 gap-2 sm:gap-3", modes.length > 2 && "lg:grid-cols-3")}>
							{modes.map(({ id, title, short, description, Icon, tone }) => {
								const selected = activeMode === id
								return (
									<MagicCard
										key={id}
										className={cn(
											"rounded-xl transition-shadow duration-300",
											id === "rejected" && "max-lg:col-span-2",
											selected && cn("shadow-lg ring-2 ring-offset-2 ring-offset-background", MODE_STYLE[tone].ring),
										)}
									>
										<button
											type="button"
											disabled={form.sending}
											aria-pressed={selected}
											onClick={() => {
												if (id === "rejected") {
													edit("", true)
													return
												}
												setMode(id)
												form.setSent(null)
												setRejectedOnly(false)
											}}
											className={cn(
												"flex size-full min-h-16 items-center gap-3 rounded-xl p-3 text-left transition-colors sm:items-start sm:p-4",
												selected && MODE_STYLE[tone].tint,
												!selected && "hover:bg-muted/30",
											)}
										>
											<span
												className={cn(
													"flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors duration-300",
													TONES[tone],
													selected && MODE_STYLE[tone].solid,
												)}
											>
												<Icon className="size-5" aria-hidden />
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-center gap-2 font-semibold leading-tight">
													<span className="sm:hidden" aria-hidden>
														{short}
													</span>
													<span className="max-sm:sr-only">{title}</span>
													{id === "rejected" && (
														<Badge className="rounded-full border-transparent bg-amber-500 px-1.5 text-white">{ownRejected.length}</Badge>
													)}
												</span>
												<span className="mt-1 block text-sm text-muted-foreground max-sm:sr-only">{description}</span>
											</span>
											{selected && <CheckCircle2 className="size-5 shrink-0 text-foreground/70 max-sm:hidden" aria-hidden />}
										</button>
									</MagicCard>
								)
							})}
						</MagicCardPointerProvider>
					</fieldset>
				</header>
				{form.catalog.isError && (
					<p aria-live="polite" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
						{form.catalog.error.message}
						<Button variant="ghost" size="sm" onClick={() => form.catalog.refetch()}>
							<RefreshCw aria-hidden />
							Retry suggestions
						</Button>
					</p>
				)}
				{form.hints.isError && (
					<p aria-live="polite" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
						Pending Submission hints could not be loaded.
						<Button variant="ghost" size="sm" onClick={() => form.hints.refetch()}>
							<RefreshCw aria-hidden />
							Retry hints
						</Button>
					</p>
				)}
				{form.catalog.data?.customVariantError && (
					<p aria-live="polite" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
						{form.catalog.data.customVariantError}
						<Button variant="ghost" size="sm" onClick={() => form.catalog.refetch()}>
							<RefreshCw aria-hidden />
							Retry suggestions
						</Button>
					</p>
				)}
				{form.sent && (
					<motion.section
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						className="relative mx-auto flex max-w-2xl flex-col gap-5 overflow-hidden rounded-2xl border bg-card p-5 shadow-lg sm:p-7"
						aria-live="polite"
					>
						<div className="flex items-center gap-4">
							<motion.span
								initial={{ scale: 0, rotate: -45 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
								className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-8 ring-emerald-500/5 dark:text-emerald-400"
							>
								<Check className="size-7" aria-hidden />
							</motion.span>
							<div>
								<h2 className="text-2xl font-bold tracking-tight">Sent for review</h2>
								<p className="text-sm text-muted-foreground">
									{form.sent.length} independent {form.sent.length === 1 ? "Submission was" : "Submissions were"} added to the review queue.
								</p>
							</div>
						</div>
						<MagicCardPointerProvider className="flex flex-col gap-2">
							{form.sent.map((record) => (
								<MagicCard key={record.id} className="rounded-lg">
									<Link
										href={`/community/submissions/${record.id}`}
										className="group/link flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-lg p-3"
									>
										<span className="break-all font-mono text-sm font-semibold">{record.name}</span>
										<span className="flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover/link:text-primary">
											View Submission
											<ArrowRight className="size-4 transition-transform group-hover/link:translate-x-0.5" aria-hidden />
										</span>
									</Link>
								</MagicCard>
							))}
						</MagicCardPointerProvider>
						<p className="text-sm text-muted-foreground">
							A Rejection is never final. You can fix the feedback and resubmit the same Submission.
						</p>
						<Button
							className={cn(CTA_CLASS, "sm:w-auto sm:self-start")}
							onClick={() => {
								form.setSent(null)
								form.setSelected(null)
								setCollapsed(false)
							}}
						>
							<Plus aria-hidden />
							Submit more icons
						</Button>
						<BorderBeam
							size={120}
							duration={9}
							colorFrom="var(--magic-border-from)"
							colorTo="var(--magic-border-to)"
							className="motion-reduce:hidden"
						/>
					</motion.section>
				)}
				{!form.sent && (
					<div hidden={mode !== "edit"}>
						<EditIconPicker
							key={`${editSearch}-${rejectedOnly}-${initialSubmissionId}`}
							names={form.catalog.data?.names ?? []}
							submissions={form.hints.data ?? []}
							initialSearch={editSearch}
							rejectedOnly={rejectedOnly}
							initialSubmissionId={initialSubmissionId}
							customNames={form.catalog.data?.customVariantNames ?? []}
						/>
					</div>
				)}
				{!form.sent && mode === "submit" && (
					<div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
						<fieldset disabled={form.sending || form.importing} className="min-w-0">
							<legend className="sr-only">New Icons</legend>
							<div {...dropzone.getRootProps()} className="relative flex min-w-0 flex-col gap-4">
								<input {...dropzone.getInputProps()} aria-label="Upload files for several Icons" />
								<div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-blue-500/30 bg-gradient-to-r from-blue-500/[0.06] to-transparent p-3 sm:p-4">
									<span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", TONES.blue)}>
										<UploadCloud className="size-5" aria-hidden />
									</span>
									<div className="min-w-0 flex-1 basis-56">
										<p className="text-sm font-medium">Drop SVG or PNG files anywhere on this form</p>
										<p className="text-xs text-muted-foreground">
											Recognised suffixes sort into one Icon’s Variants. Up to 12 Icons, 99 files per Icon, 5 MB per file, 60 MB total.
										</p>
									</div>
									<Button variant="outline" onClick={dropzone.open} className="max-sm:w-full">
										<UploadCloud aria-hidden />
										Choose files
									</Button>
								</div>
								{form.importing && (
									<p aria-live="polite" className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm">
										<Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
										Loading known Variant names and sorting your files…
									</p>
								)}
								{dropzone.isDragActive && (
									<div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 pt-24 backdrop-blur-[2px]">
										<p
											aria-live="polite"
											className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
										>
											<UploadCloud className="size-4" aria-hidden />
											Drop to sort files into Icons. Duplicate slots will ask which file to keep.
										</p>
									</div>
								)}
								<AnimatePresence initial={false}>
									{form.drafts.map((draft, index) => {
										const suggestionSlugs = new Set([...form.knownSlugs, ...(form.hints.data ?? []).map((item) => item.name)])
										const suggestion = sameProductSuggestion(draft, form.drafts, suggestionSlugs)
										const pending = form.hints.data?.filter((item) => item.name === draft.name) ?? []
										return (
											<motion.div
												key={draft.id}
												layout="position"
												initial={{ opacity: 0, y: 16 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
												className="min-w-0"
											>
												<SubmissionCard
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
														<Button variant="outline" className="self-start" onClick={() => edit(draft.name)}>
															<PencilLine aria-hidden />
															Update {draft.name} instead
														</Button>
													)}
													{suggestion && (
														<Alert role="status" className="border-blue-500/30 bg-blue-500/5 text-blue-800 dark:text-blue-200">
															<Lightbulb aria-hidden />
															<AlertTitle className="line-clamp-none break-words">
																Looks like a Variant of <strong className="font-mono">{suggestion.name}</strong>. Is this the same product?
															</AlertTitle>
															<AlertDescription>
																<p>Suggestion only, keeping a separate Icon is allowed.</p>
																<div className="mt-1 flex flex-wrap gap-2">
																	{suggestion.draftId && (
																		<Button
																			variant="outline"
																			size="sm"
																			className="bg-background"
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
																		<Button variant="outline" size="sm" className="bg-background" onClick={() => edit(suggestion.name)}>
																			Update {suggestion.name}
																		</Button>
																	)}
																</div>
															</AlertDescription>
														</Alert>
													)}
													{pending.map((item) => (
														<Alert
															key={item.id}
															role="status"
															className="border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200"
														>
															<UserRound aria-hidden />
															<AlertTitle className="line-clamp-none">
																{item.mine
																	? `You already have a ${item.status} Submission for this Icon.`
																	: "Another contributor has a pending Submission for this Icon. You can propose an update to theirs."}
																{item.status === "rejected" && " Rejections are never final."}
															</AlertTitle>
															<AlertDescription>
																<Button variant="outline" size="sm" className="mt-1 bg-background" onClick={() => edit(draft.name)}>
																	{item.mine ? "Find your Submission" : "Propose an update instead"}
																	<ArrowRight aria-hidden />
																</Button>
																<p>This suggestion does not block sending.</p>
															</AlertDescription>
														</Alert>
													))}
												</SubmissionCard>
											</motion.div>
										)
									})}
								</AnimatePresence>
							</div>
							<Button
								variant="outline"
								className="group/add mt-4 min-h-14 w-full border-2 border-dashed bg-transparent text-muted-foreground shadow-none hover:scale-100 hover:border-primary/50 hover:bg-primary/5"
								onClick={() => {
									const draft = newSubmissionDraft()
									form.setDrafts((items) => [...items, draft])
									form.setSelected(draft.id)
									setCollapsed(false)
								}}
							>
								<span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover/add:rotate-90 motion-reduce:transition-none">
									<Plus aria-hidden />
								</span>
								Add another Icon
							</Button>
						</fieldset>
						<aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto [&>*]:shrink-0">
							<section className="relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
								<SectionHeading
									icon={Send}
									tone="primary"
									level={2}
									title="Ready to send"
									description={`${form.filled.length} of ${MAX_SUBMISSIONS_PER_SEND} Icons`}
								/>
								{form.filled.length === 0 && (
									<p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
										Name an Icon and add its Base to get started.
									</p>
								)}
								{form.filled.length > 0 && (
									<ul className="-mx-1 flex max-h-60 flex-col gap-0.5 overflow-y-auto">
										{form.filled.map((draft) => {
											const base = draft.assets.find((asset) => asset.variant === "base")
											return (
												<li key={draft.id}>
													<button
														type="button"
														onClick={() => {
															form.setSelected(draft.id)
															setCollapsed(false)
															document.querySelector(`[data-submission-card="${draft.id}"]`)?.scrollIntoView({ block: "start" })
														}}
														className="flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/60"
													>
														{base && <AssetPreview asset={base} className="size-8 shrink-0 p-1" />}
														{!base && <span className="size-8 shrink-0 rounded-lg border border-dashed" />}
														<span className="min-w-0 flex-1 truncate font-mono text-sm">{draft.name || "Untitled icon"}</span>
														<span
															className={cn(
																"shrink-0 text-xs",
																form.cardErrors[draft.id] ? "font-medium text-destructive" : "text-muted-foreground",
															)}
														>
															{form.cardErrors[draft.id]
																? "Fix needed"
																: `${draft.assets.length} ${draft.assets.length === 1 ? "file" : "files"}`}
														</span>
													</button>
												</li>
											)
										})}
									</ul>
								)}
								<div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
									<div className="flex items-center justify-between gap-2 text-xs">
										<span className="text-muted-foreground">
											{form.filled.length} Icons · {form.fileCount} files
										</span>
										<span className="font-medium tabular-nums">{(form.bytes / 1024 / 1024).toFixed(1)} / 60 MB</span>
									</div>
									<Progress
										value={Math.min(100, (form.bytes / MAX_SEND_ASSET_BYTES) * 100)}
										aria-label="Total upload size"
										className="h-1.5"
									/>
								</div>
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
								<p className="text-xs text-muted-foreground">All Icons are saved together, or none are. Each is reviewed separately.</p>
								<div className="max-lg:hidden">{sendButton}</div>
								{form.canSend && (
									<BorderBeam
										size={90}
										duration={7}
										colorFrom="var(--magic-border-from)"
										colorTo="var(--magic-border-to)"
										className="motion-reduce:hidden"
									/>
								)}
							</section>
							<div className="max-lg:hidden">
								<SubmissionPreview draft={form.current} />
							</div>
							<IconSubmissionGuidelines />
						</aside>
						<div
							data-submission-actions
							className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t bg-background/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
						>
							<Button variant="outline" className="min-w-11 px-3" aria-label="Preview selected Icon" onClick={() => setPreviewOpen(true)}>
								<Eye aria-hidden />
								<span className="sr-only sm:not-sr-only">Preview</span>
							</Button>
							<p className={cn("min-w-0 flex-1 text-sm", blocked ? "text-destructive" : "text-muted-foreground")}>
								{blocked ? "Fix the highlighted cards" : `${form.fileCount} files, ${form.filled.length} Icons`}
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
		</MotionConfig>
	)
}
