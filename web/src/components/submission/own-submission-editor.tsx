"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Check, FileStack, ImagePlus, Loader2, MessageSquareWarning, RefreshCw, Save } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { StatusBadge } from "@/components/status-badge"
import { LegacyAssetAssignment, type UnassignedAsset } from "@/components/submission/legacy-asset-assignment"
import { SubmissionCard } from "@/components/submission/submission-card"
import { AssetPreview, SubmissionPreview } from "@/components/submission/submission-preview"
import { CTA_CLASS, celebrate, SectionHeading } from "@/components/submission/submission-ui"
import { Badge } from "@/components/ui/badge"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { pb, type Submission } from "@/lib/pb"
import { addDraftFiles, type DraftAsset, draftInput, type SubmissionDraft } from "@/lib/submission-drafts"
import { prepareSubmission } from "@/lib/submission-service"
import { resolveSubmissionAssets } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

async function loadSubmission(id: string) {
	const record = await pb.collection("submissions").getOne(id, { requestKey: null })
	if (record.created_by !== pb.authStore.record?.id) throw new Error("Only your own Submissions can be edited.")
	if (!["pending", "rejected"].includes(record.status)) throw new Error("This Submission is locked. Propose an update to the Icon instead.")
	const resolved = resolveSubmissionAssets(record.extras, record.assets, record.name)
	const loaded = await Promise.all(
		resolved.assets.map(async ({ file, variant }) => {
			const response = await fetch(pb.files.getURL(record, file), { cache: "no-store" })
			if (!response.ok) throw new Error("An existing file could not be loaded. Retry before editing so no artwork is lost.")
			const blob = await response.blob()
			return { id: crypto.randomUUID(), variant, file: new File([blob], file, { type: blob.type }) }
		}),
	)
	const assets: DraftAsset[] = []
	const unassigned: UnassignedAsset[] = []
	for (const asset of loaded) {
		if (asset.variant) assets.push({ ...asset, variant: asset.variant })
		else
			unassigned.push({
				...asset,
				references: resolved.references.filter((reference) => !reference.file && reference.candidates.includes(asset.file.name)),
			})
	}
	const draft: SubmissionDraft = {
		id: record.id,
		name: record.name,
		description: record.description || "",
		aliases: (record.extras?.aliases || []).join(", "),
		categories: record.extras?.categories || [],
		customVariantName: "",
		assets,
	}
	return { record, draft, unassigned }
}

export function OwnSubmissionEditor({ id, customNames, onBack }: { id: string; customNames: string[]; onBack: () => void }) {
	const queryClient = useQueryClient()
	const load = useQuery({
		queryKey: ["own-submission-editor", id, pb.authStore.record?.id],
		queryFn: () => loadSubmission(id),
		staleTime: Infinity,
		gcTime: 0,
		refetchOnWindowFocus: false,
		retry: false,
	})
	const [draft, setDraft] = useState<SubmissionDraft | null>(null)
	const [unassigned, setUnassigned] = useState<UnassignedAsset[]>([])
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState("")
	const [saved, setSaved] = useState<Submission | null>(null)
	const [previewOpen, setPreviewOpen] = useState(false)
	const [cardOpen, setCardOpen] = useState(true)
	const savingRef = useRef(false)
	useEffect(() => {
		if (load.data) {
			setDraft(load.data.draft)
			setUnassigned(load.data.unassigned)
		}
	}, [load.data])
	useEffect(() => {
		if (saved) celebrate()
	}, [saved])
	const record = load.data?.record
	if (saved)
		return (
			<motion.section
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				className="relative mx-auto flex max-w-2xl flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-5 shadow-lg sm:p-7"
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
					<h2 className="text-2xl font-bold tracking-tight">Awaiting review · Round {saved.round || 1}</h2>
				</div>
				<p className="break-words text-sm text-muted-foreground">
					Your changes to <strong className="font-mono text-foreground">{saved.name}</strong> are saved under the same Submission. Its
					history and previous rejected files are kept for review.
				</p>
				<p className="break-all font-mono text-xs text-muted-foreground">#{saved.id}</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild className={cn(CTA_CLASS, "sm:w-auto")}>
						<Link href={`/community/submissions/${saved.id}`}>
							View Submission
							<ArrowRight aria-hidden />
						</Link>
					</Button>
					<Button variant="outline" className="min-h-11" onClick={onBack}>
						Choose another Icon
					</Button>
				</div>
				<BorderBeam
					size={120}
					duration={9}
					colorFrom="var(--magic-border-from)"
					colorTo="var(--magic-border-to)"
					className="motion-reduce:hidden"
				/>
			</motion.section>
		)
	if (load.isPending || (!draft && !load.error))
		return (
			<div aria-busy="true" aria-live="polite" className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
				<p className="text-sm text-muted-foreground">Loading your Submission and all its files…</p>
				<Skeleton className="h-20 w-full rounded-xl" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Skeleton className="h-36 rounded-xl" />
					<Skeleton className="h-36 rounded-xl" />
					<Skeleton className="h-36 rounded-xl max-sm:hidden" />
				</div>
			</div>
		)
	if (load.error || !record || !draft)
		return (
			<section className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
				<p role="alert" className="break-words text-sm">
					{load.error?.message || "Your Submission could not be loaded."}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={() => void load.refetch()}>
						<RefreshCw aria-hidden />
						Retry loading
					</Button>
					<Button variant="ghost" onClick={onBack}>
						<ArrowLeft aria-hidden />
						Choose another Icon
					</Button>
				</div>
			</section>
		)
	const prepared = prepareSubmission(record.created_by, draftInput(draft))
	let validation = ""
	if (!prepared.ok) validation = prepared.error
	if (draft.customVariantName) validation = "Choose a file for the Custom variant, or clear its name."
	if (new Set(draft.assets.map((asset) => asset.variant)).size !== draft.assets.length)
		validation = "Two files occupy the same Variant slot. Choose which file to keep."
	if (unassigned.length)
		validation = `Assign a Variant to ${unassigned.length} unlabelled ${unassigned.length === 1 ? "file" : "files"} before saving. No files have been removed.`
	const update = (patch: Partial<SubmissionDraft>) => {
		setDraft({ ...draft, ...patch })
		setError("")
	}
	const save = async () => {
		if (validation || savingRef.current) return
		savingRef.current = true
		setSaving(true)
		setError("")
		const input = draftInput(draft)
		const body = new FormData()
		body.set("name", input.name)
		body.set("description", input.description)
		body.set("updated", record.updated)
		body.set("target_submission", record.target_submission || "")
		for (const alias of input.aliases) body.append("aliases", alias)
		for (const category of input.categories) body.append("categories", category)
		for (const asset of draft.assets) body.set(asset.variant, asset.file)
		try {
			const response = await fetch(`/api/submissions/${id}`, { method: "PATCH", headers: { Authorization: pb.authStore.token }, body })
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || "The save could not be confirmed. Your edits remain here.")
			setSaved(result)
			await Promise.all([
				revalidateAllSubmissions(),
				queryClient.invalidateQueries({ queryKey: ["submission-hints"] }),
				queryClient.invalidateQueries({ queryKey: ["submissions"] }),
				queryClient.removeQueries({ queryKey: ["own-submission-editor", id] }),
			])
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "The connection was interrupted. Your edits remain here.")
		} finally {
			savingRef.current = false
			setSaving(false)
		}
	}
	const base = draft.assets.find((asset) => asset.variant === "base")
	let status = `${draft.assets.length + unassigned.length} files`
	if (validation) status = "Fix the highlighted card"
	const cta = (
		<Button className={cn(CTA_CLASS, "max-lg:w-auto max-lg:shrink-0")} disabled={saving || Boolean(validation)} onClick={() => void save()}>
			{saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
			{!saving && <Save aria-hidden />}
			{saving ? "Saving…" : "Save changes"}
		</Button>
	)
	return (
		<section className="flex flex-col gap-6">
			<header className="relative isolate flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
				<span className="pointer-events-none absolute -top-16 -right-10 -z-10 size-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
				{base && <AssetPreview asset={base} className="size-16 shrink-0 rounded-xl p-2" />}
				{!base && (
					<span className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary">
						<ImagePlus className="size-6" aria-hidden />
					</span>
				)}
				<div className="min-w-0 flex-1 basis-60">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
							Your Submission
						</Badge>
						<StatusBadge status={record.status} />
						<Badge variant="outline" className="rounded-full font-mono text-muted-foreground">
							Round {record.round || 1}
						</Badge>
					</div>
					<h2 className="mt-1.5 text-2xl font-bold tracking-tight">Edit your Submission</h2>
					<p className="break-all font-mono text-xs text-muted-foreground">#{record.id}</p>
					<p className="mt-1 max-w-prose text-sm text-muted-foreground">
						All files and metadata are loaded. Replace Base, and add, replace or remove optional Variants. Saving updates this Submission,
						not a duplicate.
					</p>
				</div>
				<Button variant="ghost" className="min-h-11" disabled={saving} onClick={onBack}>
					<ArrowLeft aria-hidden />
					Choose another Icon
				</Button>
			</header>
			{record.status === "rejected" && (
				<section className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
					<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/25 dark:text-amber-400">
						<MessageSquareWarning className="size-[18px]" aria-hidden />
					</span>
					<div className="flex min-w-0 flex-col gap-2">
						<h3 className="font-semibold">Rejections are never final</h3>
						{record.admin_comment && (
							<blockquote className="whitespace-pre-wrap break-words border-l-2 border-amber-500/60 pl-3 text-sm">
								<strong>Reviewer feedback:</strong> {record.admin_comment}
							</blockquote>
						)}
						<p className="text-sm text-muted-foreground">
							Fix the feedback and resubmit. This returns to Awaiting review as Round {(record.round || 1) + 1}; the rejected files stay
							available for comparison.
						</p>
					</div>
				</section>
			)}
			<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
					<legend className="sr-only">Edit Submission files and metadata</legend>
					{unassigned.length > 0 && (
						<section
							className="flex flex-col gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4"
							aria-label="Assign legacy files"
						>
							<SectionHeading
								icon={FileStack}
								tone="amber"
								title="Choose Variants for these original files"
								description="Older filenames cannot always be matched safely. Every original file is kept here. Assign each to an empty Variant slot, or give additional artwork a distinct Custom name."
							/>
							<div className="grid gap-3 sm:grid-cols-2">
								{unassigned.map((asset) => (
									<LegacyAssetAssignment
										key={asset.id}
										asset={asset}
										occupied={draft.assets.map((asset) => asset.variant)}
										onAssign={(variant) => {
											update({ assets: [...draft.assets, { id: asset.id, file: asset.file, variant }] })
											setUnassigned((items) => items.filter((item) => item.id !== asset.id))
										}}
									/>
								))}
							</div>
						</section>
					)}
					<SubmissionCard
						draft={draft}
						index={record.round || 1}
						open={cardOpen}
						editing
						error={validation || undefined}
						customNames={customNames}
						onSelect={() => setCardOpen(!cardOpen)}
						onChange={update}
						onFiles={(files) => {
							const next = addDraftFiles([draft], files, customNames, new Set(), draft.id)
							if (next[0]) update(next[0])
						}}
						onRemove={() => {}}
						onPreview={() => setPreviewOpen(true)}
						onApplyCategories={() => {}}
					/>
				</fieldset>
				<aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto [&>*]:shrink-0">
					<div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
						<SectionHeading
							icon={Save}
							tone="primary"
							level={2}
							title="Save changes"
							description={`${draft.assets.length + unassigned.length} files · Base is required.`}
						/>
						{error && (
							<p role="alert" className="break-words text-sm text-destructive">
								{error}
							</p>
						)}
						<div className="max-lg:hidden">{cta}</div>
						<p className="text-xs text-muted-foreground">
							{record.status === "rejected"
								? "Save changes resubmits this same Submission for review."
								: "Your changes stay in Awaiting review for this round."}
						</p>
						{error && (
							<div className="flex flex-col gap-2">
								<p className="text-sm text-muted-foreground">Reloading replaces your unsaved edits with the latest saved version.</p>
								<Button
									variant="outline"
									disabled={saving}
									onClick={() => {
										setError("")
										void load.refetch()
									}}
								>
									<RefreshCw aria-hidden />
									Reload latest Submission
								</Button>
							</div>
						)}
						{!saving && !validation && (
							<BorderBeam
								size={90}
								duration={7}
								colorFrom="var(--magic-border-from)"
								colorTo="var(--magic-border-to)"
								className="motion-reduce:hidden"
							/>
						)}
					</div>
					<div className="max-lg:hidden">
						<SubmissionPreview draft={draft} />
					</div>
				</aside>
			</div>
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent
					aria-describedby={undefined}
					className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md [&>button]:size-11"
				>
					<DialogHeader>
						<DialogTitle>Submission preview</DialogTitle>
					</DialogHeader>
					<SubmissionPreview draft={draft} embedded />
				</DialogContent>
			</Dialog>
			<div
				data-submission-actions
				className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t bg-background/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
			>
				<p className={cn("min-w-0 flex-1 text-sm text-muted-foreground", validation && "text-destructive")}>{status}</p>
				{cta}
			</div>
		</section>
	)
}
