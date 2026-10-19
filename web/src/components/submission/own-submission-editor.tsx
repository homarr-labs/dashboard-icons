"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { LegacyAssetAssignment, type UnassignedAsset } from "@/components/submission/legacy-asset-assignment"
import { SubmissionCard } from "@/components/submission/submission-card"
import { SubmissionPreview } from "@/components/submission/submission-preview"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { pb, type Submission } from "@/lib/pb"
import { addDraftFiles, type DraftAsset, draftInput, type SubmissionDraft } from "@/lib/submission-drafts"
import { prepareSubmission } from "@/lib/submission-service"
import { resolveSubmissionAssets } from "@/lib/submission-variants"

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
	const record = load.data?.record
	if (saved)
		return (
			<section className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-background p-5" aria-live="polite">
				<div className="flex items-center gap-3">
					<Check className="size-7 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
					<h2 className="text-xl font-semibold">Awaiting review · Round {saved.round || 1}</h2>
				</div>
				<p className="break-words text-sm">
					Your changes to <strong className="font-mono">{saved.name}</strong> are saved under the same Submission. Its history and previous
					rejected files are kept for review.
				</p>
				<p className="break-all font-mono text-sm text-muted-foreground">#{saved.id}</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild className="min-h-11">
						<Link href={`/community/submissions/${saved.id}`}>View Submission</Link>
					</Button>
					<Button variant="outline" onClick={onBack}>
						Choose another Icon
					</Button>
				</div>
			</section>
		)
	if (load.isPending || (!draft && !load.error))
		return (
			<div
				aria-busy="true"
				aria-live="polite"
				className="mx-auto max-w-3xl animate-pulse space-y-4 rounded-xl bg-muted/40 p-6 motion-reduce:animate-none"
			>
				<p>Loading your Submission and all its files…</p>
				<div className="h-40 rounded-lg bg-muted" />
			</div>
		)
	if (load.error || !record || !draft)
		return (
			<section className="mx-auto max-w-3xl space-y-4 rounded-xl bg-muted/40 p-5">
				<p role="alert" className="break-words text-sm">
					{load.error?.message || "Your Submission could not be loaded."}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={() => void load.refetch()}>
						Retry loading
					</Button>
					<Button variant="ghost" onClick={onBack}>
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
	return (
		<section className="space-y-5">
			<header className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted/40 p-4">
				<div className="min-w-0 space-y-1">
					<h2 className="text-lg font-semibold">Edit your Submission</h2>
					<p className="break-all font-mono text-sm text-muted-foreground">
						#{record.id} · Round {record.round || 1}
					</p>
					<p className="max-w-prose text-sm text-muted-foreground">
						All files and metadata are loaded. Replace Base, and add, replace or remove optional Variants. Saving updates this Submission,
						not a duplicate.
					</p>
				</div>
				<Button variant="outline" disabled={saving} onClick={onBack}>
					Choose another Icon
				</Button>
			</header>
			{record.status === "rejected" && (
				<div className="space-y-2 rounded-lg bg-muted/50 p-4">
					<h3 className="font-semibold">Rejections are never final</h3>
					{record.admin_comment && (
						<p className="whitespace-pre-wrap break-words text-sm">
							<strong>Reviewer feedback:</strong> {record.admin_comment}
						</p>
					)}
					<p className="text-sm">
						Fix the feedback and resubmit. This returns to Awaiting review as Round {(record.round || 1) + 1}; the rejected files stay
						available for comparison.
					</p>
				</div>
			)}
			<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<fieldset disabled={saving} className="min-w-0 space-y-4">
					<legend className="sr-only">Edit Submission files and metadata</legend>
					{unassigned.length > 0 && (
						<section className="space-y-3" aria-label="Assign legacy files">
							<div className="space-y-2 rounded-lg bg-muted/50 p-4">
								<h3 className="font-semibold">Choose Variants for these original files</h3>
								<p className="text-sm">
									Older filenames cannot always be matched safely. Every original file is kept here. Assign each to an empty Variant slot,
									or give additional artwork a distinct Custom name.
								</p>
							</div>
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
				<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:self-start">
					<div className="max-lg:hidden">
						<SubmissionPreview draft={draft} />
					</div>
					<div className="space-y-3 rounded-xl bg-muted/40 p-4">
						<p className="text-sm">{draft.assets.length + unassigned.length} files · Base is required.</p>
						{error && (
							<p role="alert" className="break-words text-sm text-destructive">
								{error}
							</p>
						)}
						<Button
							className="min-h-11 w-full text-secondary-foreground"
							disabled={saving || Boolean(validation)}
							onClick={() => void save()}
						>
							{saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
							{saving ? "Saving…" : "Save changes"}
						</Button>
						<p className="text-sm text-muted-foreground">
							{record.status === "rejected"
								? "Save changes resubmits this same Submission for review."
								: "Your changes stay in Awaiting review for this round."}
						</p>
						{error && (
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">Reloading replaces your unsaved edits with the latest saved version.</p>
								<Button
									variant="outline"
									disabled={saving}
									onClick={() => {
										setError("")
										void load.refetch()
									}}
								>
									Reload latest Submission
								</Button>
							</div>
						)}
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
		</section>
	)
}
