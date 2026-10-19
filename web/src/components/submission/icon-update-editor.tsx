"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Check, Minus, Undo2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { RejectionNotice } from "@/components/submission/rejection-notice"
import { FileChooser } from "@/components/submission/submission-card"
import { AssetPreview } from "@/components/submission/submission-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { IconNameOption } from "@/hooks/use-submissions"
import {
	applyList,
	type IconUpdate,
	listDelta,
	type OwnedSubmissionResponse,
	type RemovableVariantKey,
	type UpdatePreview,
	type UpdateTargetResponse,
} from "@/lib/icon-update"
import { pb } from "@/lib/pb"
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"
import { MAX_ASSET_BYTES } from "@/lib/submission-service"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { submitProposal } from "@/lib/submit-proposal"
import { cn } from "@/lib/utils"

export function UpdateArtwork({
	preview,
	variant,
	file,
	name,
	compact = false,
	present = false,
}: {
	preview?: UpdatePreview
	variant: SubmissionVariant
	file?: File
	name: string
	compact?: boolean
	present?: boolean
}) {
	const kind = variantKind(variant)
	let background: "light" | "dark" | "checker" = "checker"
	if (kind.background !== "any") background = kind.background
	let size = "h-24 w-full"
	if (compact) size = "size-14 p-1"
	if (file) return <AssetPreview asset={{ id: variant, file, variant }} background={background} className={size} />
	return (
		<div
			className={cn(
				"flex items-center justify-center rounded-md p-3",
				size,
				background === "checker" && "bg-muted",
				background === "light" && "bg-white",
				background === "dark" && "bg-zinc-950",
			)}
		>
			{preview && (
				<UnoptimizedImage src={preview.url} alt={`${name} ${kind.label}, current artwork`} className="h-full w-full object-contain" />
			)}
			{!preview && (
				<span
					className={cn(
						"text-center text-xs text-muted-foreground",
						background === "light" && "text-zinc-700",
						background === "dark" && "text-zinc-300",
					)}
				>
					{present ? "Preview unavailable" : "Not present"}
				</span>
			)}
		</div>
	)
}

export function ChangeBadge({ action }: { action?: "add" | "replace" | "remove" }) {
	let label = "Unchanged"
	if (action === "add") label = "+ added"
	if (action === "replace") label = "~ replaced"
	if (action === "remove") label = "− removed"
	return (
		<span
			className={cn(
				"shrink-0 rounded px-2 py-1 text-xs font-medium",
				!action && "bg-muted text-muted-foreground",
				action === "add" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
				action === "replace" && "bg-amber-500/10 text-amber-800 dark:text-amber-200",
				action === "remove" && "bg-red-500/10 text-red-800 dark:text-red-200",
			)}
		>
			{label}
		</span>
	)
}

export function IconUpdateEditor({
	selection,
	onCancel,
	owned,
}: {
	selection: IconNameOption
	onCancel: () => void
	owned?: OwnedSubmissionResponse
}) {
	const queryClient = useQueryClient()
	const [loaded, setLoaded] = useState<UpdateTargetResponse | null>(owned?.baseline ?? null)
	const [live, setLive] = useState<UpdateTargetResponse | null>(null)
	const [retained, setRetained] = useState<IconUpdate["variants"]>([])
	const [refreshChosen, setRefreshChosen] = useState(false)
	const [error, setError] = useState("")
	const [files, setFiles] = useState<Partial<Record<SubmissionVariant, File>>>({})
	const [removals, setRemovals] = useState<Partial<Record<RemovableVariantKey, string>>>({})
	const [aliases, setAliases] = useState("")
	const [aliasesEdited, setAliasesEdited] = useState(false)
	const [categories, setCategories] = useState<string[]>([])
	const [custom, setCustom] = useState("")
	const [customNames, setCustomNames] = useState<string[]>([])
	const [suggestionsError, setSuggestionsError] = useState("")
	const [note, setNote] = useState("")
	const [busy, setBusy] = useState(false)
	const [sent, setSent] = useState("")
	const [attempt, setAttempt] = useState(0)
	useEffect(() => {
		const controller = new AbortController()
		const query = new URLSearchParams({ name: selection.value, submission: selection.submissionId ?? "" })
		query.set("retry", String(attempt))
		setError("")
		setLive(null)
		if (owned?.record.icon_update) {
			const update = owned.record.icon_update
			setLoaded(owned.baseline ?? null)
			setRetained(update.variants.filter((change) => change.action !== "remove"))
			setRemovals(
				Object.fromEntries(update.variants.flatMap((change) => (change.action === "remove" ? [[change.key, change.note ?? ""]] : []))),
			)
			setAliases(applyList(update.target.metadata.aliases, update.aliases).join(", "))
			setAliasesEdited(true)
			setCategories(applyList(update.target.metadata.categories, update.categories))
			setNote(owned.record.description)
		}
		fetch(`/api/submissions/target?${query}`, { headers: { Authorization: pb.authStore.token }, signal: controller.signal })
			.then(async (response) => {
				const result = await response.json()
				if (!response.ok) throw new Error(result.error || "The Icon could not be loaded")
				return result as UpdateTargetResponse
			})
			.then((result) => {
				setLive(result)
				if (owned) return
				setLoaded(result)
				setAliases(result.target.metadata.aliases.join(", "))
				setAliasesEdited(false)
				setCategories(result.target.metadata.categories)
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) setError(String(error))
			})
		pb.send<{ names: string[] }>("/api/submissions/variant-names", { requestKey: null })
			.then((result) => setCustomNames(result.names))
			.catch(() => setSuggestionsError("Suggested names are unavailable. You can still enter a Custom variant name."))
		return () => controller.abort()
	}, [selection.value, selection.submissionId, attempt, owned])
	const changeFile = (key: SubmissionVariant, file: File) => {
		if (!/\.(svg|png)$/i.test(file.name) || !file.size || file.size > MAX_ASSET_BYTES) {
			setError("Choose a non-empty SVG or PNG, up to 5 MB.")
			return
		}
		setError("")
		setFiles((current) => ({ ...current, [key]: file }))
	}
	const undoVariant = (key: SubmissionVariant) => {
		setRetained((current) => current.filter((change) => change.key !== key))
		setFiles((current) => {
			const next = { ...current }
			delete next[key]
			return next
		})
		if (key === "base") return
		setRemovals((current) => {
			const next = { ...current }
			delete next[key]
			return next
		})
	}
	if (sent)
		return (
			<section className="mx-auto max-w-2xl space-y-4 rounded-xl bg-muted/40 p-6" aria-live="polite">
				<Check className="size-8 text-emerald-700 dark:text-emerald-300" aria-hidden />
				<h2 className="text-xl font-semibold">{owned ? "Update proposal saved" : "Update proposal sent"}</h2>
				<p className="text-sm">
					Your changes to {selection.value} are awaiting review. Unchanged Variants and metadata are preserved. Approval does not publish
					automatically.
				</p>
				<Button asChild className="min-h-11 text-secondary-foreground">
					<Link href={`/community/submissions/${sent}`}>View Update proposal</Link>
				</Button>
				<Button variant="outline" className="min-h-11" onClick={onCancel}>
					Choose another Icon
				</Button>
			</section>
		)
	if (!loaded)
		return (
			<section className="mx-auto max-w-3xl space-y-4" aria-live="polite">
				{!error && (
					<output className="block h-48 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" aria-label="Loading current Icon" />
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				{error && (
					<Button variant="outline" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>
						Retry loading Icon
					</Button>
				)}
				<Button variant="ghost" className="min-h-11" onClick={onCancel}>
					Choose another Icon
				</Button>
			</section>
		)
	const { target, previews } = loaded
	const stale = Boolean(owned && live && live.target.revision !== target.revision)
	const keys = [
		...new Set([...Object.keys(target.files), ...retained.map((change) => change.key), ...Object.keys(files), ...Object.keys(removals)]),
	] as SubmissionVariant[]
	const rows = [...SUBMISSION_VARIANTS.filter((key) => keys.includes(key)), ...keys.filter((key) => key.startsWith("custom:"))]
	let proposedAliases = target.metadata.aliases
	if (aliasesEdited)
		proposedAliases = aliases
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean)
	const aliasDelta = listDelta(target.metadata.aliases, proposedAliases)
	const categoryDelta = listDelta(target.metadata.categories, categories)
	const changes =
		new Set([...Object.keys(files), ...retained.map((change) => change.key)]).size +
		Object.keys(removals).length +
		aliasDelta.add.length +
		aliasDelta.remove.length +
		categoryDelta.add.length +
		categoryDelta.remove.length
	const customError = custom && customVariantNameError(custom)
	let saveLabel = "Send Update proposal"
	if (owned) saveLabel = "Save Update proposal"
	if (owned?.record.status === "rejected") saveLabel = "Resubmit Update proposal"
	if (busy) saveLabel = "Saving proposal…"
	const send = async () => {
		setBusy(true)
		setError("")
		try {
			const result = await submitProposal(
				{
					kind: "update",
					name: target.name,
					revision: target.revision,
					targetSubmission: target.id,
					description: note,
					aliases: proposedAliases,
					categories,
					assets: files,
					removeVariants: Object.entries(removals).map(([key, note]) => ({ key: key as RemovableVariantKey, note })),
				},
				owned
					? {
							id: owned.record.id,
							updated: owned.record.updated,
							refreshTarget: refreshChosen,
							retainVariants: retained.map((change) => change.key),
						}
					: undefined,
			)
			if (owned) {
				await revalidateAllSubmissions()
				await queryClient.invalidateQueries({ queryKey: ["owned-editor", owned.record.id] })
			}
			setSent(result.id)
		} catch (error) {
			setError(String(error))
		} finally {
			setBusy(false)
		}
	}
	return (
		<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" data-icon-update-editor>
			<div className="min-w-0 space-y-5">
				<header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-4">
					<div className="min-w-0">
						<h2 className="break-all font-mono text-xl font-semibold">{target.name}</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{target.kind === "published" ? "Published Icon" : "Community Submission"} · Update proposal
						</p>
					</div>
					<Button variant="outline" className="min-h-11" disabled={busy} onClick={onCancel}>
						Choose another Icon
					</Button>
				</header>
				<p className="max-w-prose text-sm text-muted-foreground">
					Replace artwork or remove an optional Variant. Untouched Variants stay as they are. Base is required and cannot be removed.
				</p>
				{owned?.record.status === "rejected" && (
					<RejectionNotice id={owned.record.id} feedback={owned.record.admin_comment} canEdit={false} />
				)}
				{owned && (
					<p className="text-sm text-muted-foreground">
						Editing the same Submission · Round {owned.record.round || 1}. Resubmitting a rejection keeps its id and retains the rejected
						review and artwork.
					</p>
				)}
				{owned && <RejectedRoundComparison record={owned.record} />}
				{stale && live && (
					<section role="alert" className="space-y-3 rounded-xl bg-amber-500/10 p-4">
						<h3 className="font-semibold">The target Icon changed</h3>
						<p className="text-sm">
							Your saved proposal has not been applied. Explicitly choose the latest target and review your artwork against it before
							saving. This reloads metadata; your selected Variant changes stay in this proposal.
						</p>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => {
								setLoaded(live)
								setRefreshChosen(true)
								const update = owned?.record.icon_update
								if (update) {
									setAliases(applyList(live.target.metadata.aliases, update.aliases).join(", "))
									setAliasesEdited(true)
									setCategories(applyList(live.target.metadata.categories, update.categories))
								}
							}}
						>
							Use latest target for this proposal
						</Button>
					</section>
				)}
				{target.unresolved && (
					<section className="space-y-3 rounded-xl bg-amber-500/10 p-4" aria-label="Unassigned target artwork">
						<h3 className="font-semibold">The contributor needs to assign the existing files</h3>
						<p className="text-sm">
							Every original file is kept. An update cannot be sent until each file has an unambiguous Variant, including Base.
						</p>
						{target.unresolved.references.map((reference) => (
							<p key={`${reference.variant}:${reference.reference}`} className="break-all text-sm">
								{variantKind(reference.variant).label}: {reference.reference} could not be matched to exactly one file.
							</p>
						))}
						<ul className="grid grid-cols-2 gap-3">
							{target.unresolved.assets.map((file) => (
								<li key={file} className="min-w-0 space-y-2">
									<UnoptimizedImage
										src={pb.files.getURL({ collectionName: "submissions", id: target.id }, file)}
										alt={`Unassigned original ${file}`}
										className="h-20 w-full rounded-md bg-muted object-contain p-2"
									/>
									<p className="break-all font-mono text-xs">{file}</p>
								</li>
							))}
						</ul>
					</section>
				)}
				<fieldset disabled={busy} className="min-w-0 space-y-3">
					<legend className="mb-3 font-semibold">Variants</legend>
					<ul className="divide-y rounded-xl border bg-background">
						{rows.map((key) => {
							const kind = variantKind(key)
							const file = files[key]
							const saved = retained.find((change) => change.key === key)
							const savedAction = saved?.action
							let proposedPreview = previews[key]
							if (saved && "file" in saved && owned)
								proposedPreview = {
									url: pb.files.getURL(owned.record, saved.file),
									formats: [saved.file.split(".").pop() || ""],
									filename: saved.file,
								}
							const removed = key !== "base" && Object.hasOwn(removals, key)
							let action: "add" | "replace" | "remove" | undefined
							if (file || saved) action = target.files[key] ? "replace" : "add"
							if (removed) action = "remove"
							return (
								<li key={key} className="min-w-0 space-y-3 p-4">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h3 className="break-all text-sm font-semibold">{kind.label}</h3>
										<ChangeBadge action={action} />
									</div>
									<div className="flex items-center gap-3">
										<figure className="shrink-0 space-y-1">
											<UpdateArtwork
												compact
												present={Boolean(target.files[key])}
												preview={previews[key]}
												variant={key}
												name={target.name}
											/>
											<figcaption className="text-xs text-muted-foreground">Now</figcaption>
										</figure>
										<figure className="shrink-0 space-y-1">
											{removed ? (
												<div
													className="flex size-14 items-center justify-center rounded-md bg-red-500/10 text-red-800 dark:text-red-200"
													aria-label="Variant removed"
													role="img"
												>
													<Minus aria-hidden />
												</div>
											) : (
												<UpdateArtwork
													compact
													present={Boolean(target.files[key])}
													preview={proposedPreview}
													file={file}
													variant={key}
													name={target.name}
												/>
											)}
											<figcaption className="text-xs text-muted-foreground">Proposed</figcaption>
										</figure>
										<div className="min-w-0 space-y-1">
											<p className="break-all font-mono text-xs text-muted-foreground">
												{file?.name || proposedPreview?.filename || target.files[key]}
											</p>
											{!file && previews[key] && (
												<p className="text-xs text-muted-foreground">{previews[key].formats.join(" / ").toUpperCase()}</p>
											)}
											<p className="text-sm text-muted-foreground">{kind.description}</p>
											{saved && !("file" in saved) && <p className="text-sm">Saved {savedAction} operation retained.</p>}
										</div>
									</div>
									<div className="flex flex-wrap justify-end gap-2">
										{!removed && (
											<FileChooser
												label={`Replace ${kind.label}`}
												onFiles={(chosen) => {
													if (chosen[0]) changeFile(key, chosen[0])
												}}
											/>
										)}
										{key !== "base" && target.files[key] && !removed && (
											<Button
												variant="ghost"
												className="h-auto min-h-11 max-w-full whitespace-normal text-left text-red-800 hover:bg-red-500/10 dark:text-red-200"
												onClick={() => {
													undoVariant(key)
													setRemovals((current) => ({ ...current, [key]: "" }))
												}}
											>
												<Minus aria-hidden />
												Remove {kind.label}
											</Button>
										)}
										{(file || saved || removed) && (
											<Button
												variant="ghost"
												className="h-auto min-h-11 max-w-full whitespace-normal text-left"
												onClick={() => undoVariant(key)}
											>
												<Undo2 aria-hidden />
												Undo {kind.label}
											</Button>
										)}
									</div>
									{removed && (
										<div className="space-y-2">
											<label htmlFor={`remove-${key}`} className="text-sm font-medium">
												Why remove {kind.label}? (optional)
											</label>
											<Textarea
												id={`remove-${key}`}
												value={removals[key]}
												maxLength={10000}
												onChange={(event) => setRemovals((current) => ({ ...current, [key]: event.target.value }))}
												placeholder="Help the reviewer understand this removal"
											/>
										</div>
									)}
								</li>
							)
						})}
						<li className="space-y-3 p-4">
							<h3 className="text-sm font-semibold">Add a Variant</h3>
							<div className="flex flex-wrap gap-2">
								{SUBMISSION_VARIANTS.filter((key) => !rows.includes(key)).map((key) => (
									<FileChooser
										key={key}
										label={`Add ${variantKind(key).label}`}
										onFiles={(chosen) => {
											if (chosen[0]) changeFile(key, chosen[0])
										}}
									/>
								))}
							</div>
							<label htmlFor="update-custom" className="block text-sm font-medium">
								Custom variant name
							</label>
							{suggestionsError && <p className="text-sm text-muted-foreground">{suggestionsError}</p>}
							<div className="flex flex-wrap gap-2">
								<Input
									id="update-custom"
									value={custom}
									onChange={(event) => setCustom(event.target.value)}
									placeholder="For example 4k or animated"
									list="update-custom-names"
									className="min-w-0 flex-1 font-mono"
									aria-invalid={Boolean(customError)}
								/>
								<datalist id="update-custom-names">
									{customNames.map((name) => (
										<option key={name} value={name} />
									))}
								</datalist>
								{custom && !customError && !rows.includes(`custom:${custom}`) && (
									<FileChooser
										label="Choose Custom file"
										onFiles={(chosen) => {
											if (chosen[0]) {
												changeFile(`custom:${custom}`, chosen[0])
												setCustom("")
											}
										}}
									/>
								)}
							</div>
							{customError && <p className="text-sm text-destructive">{customError}</p>}
							{custom && rows.includes(`custom:${custom}`) && (
								<p className="text-sm text-muted-foreground">This Variant is listed above. Replace its file there.</p>
							)}
						</li>
					</ul>
				</fieldset>
				<fieldset disabled={busy} className="space-y-5 rounded-xl bg-muted/40 p-4">
					<legend className="sr-only">Icon metadata</legend>
					<div className="space-y-2">
						<label htmlFor="update-aliases" className="text-sm font-medium">
							Aliases (comma-separated)
						</label>
						<Input
							id="update-aliases"
							value={aliases}
							onChange={(event) => {
								setAliases(event.target.value)
								setAliasesEdited(true)
							}}
						/>
					</div>
					<fieldset className="space-y-2">
						<legend className="mb-2 text-sm font-medium">Categories</legend>
						<div className="flex flex-wrap gap-2">
							{[...new Set([...SUBMISSION_CATEGORIES, ...target.metadata.categories])].map((category) => (
								<button
									type="button"
									key={category}
									aria-pressed={categories.includes(category)}
									onClick={() =>
										setCategories((current) =>
											current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
										)
									}
									className={cn(
										"min-h-11 rounded-md px-3 py-2 text-sm",
										categories.includes(category)
											? "bg-primary/15 font-medium ring-1 ring-inset ring-primary"
											: "bg-background hover:bg-muted",
									)}
								>
									{category}
								</button>
							))}
						</div>
					</fieldset>
					<div className="space-y-2">
						<label htmlFor="update-note" className="text-sm font-medium">
							Note for the reviewer (optional)
						</label>
						<Textarea
							id="update-note"
							value={note}
							maxLength={10000}
							onChange={(event) => setNote(event.target.value)}
							placeholder="What changed and why"
						/>
					</div>
				</fieldset>
			</div>
			<aside className="min-w-0 space-y-4 self-start rounded-xl bg-muted/40 p-4 lg:sticky lg:top-24" aria-label="Proposal changes">
				<h2 className="font-semibold">Changes in this proposal</h2>
				{!changes && (
					<p className="text-sm text-muted-foreground">Add, replace or remove a Variant, or edit aliases and categories to start.</p>
				)}
				<ul className="space-y-2 break-words text-sm" aria-live="polite">
					{Object.keys(removals).map((key) => (
						<li key={key} className="flex flex-wrap items-center gap-2">
							<ChangeBadge action="remove" />
							<span>{variantKind(key as RemovableVariantKey).label}</span>
						</li>
					))}
					{[...new Set([...Object.keys(files), ...retained.map((change) => change.key)])].map((key) => (
						<li key={key} className="flex flex-wrap items-center gap-2">
							<ChangeBadge action={target.files[key as SubmissionVariant] ? "replace" : "add"} />
							<span>{variantKind(key as SubmissionVariant).label}</span>
						</li>
					))}
					{(["aliases", "categories"] as const).flatMap((field) => {
						const delta = field === "aliases" ? aliasDelta : categoryDelta
						return [
							...delta.add.map((value) => (
								<li key={`${field}+${value}`}>
									+ {field}: {value}
								</li>
							)),
							...delta.remove.map((value) => (
								<li key={`${field}-${value}`}>
									− {field}: {value}
								</li>
							)),
						]
					})}
				</ul>
				<p className="text-sm text-muted-foreground">
					Every unrelated Variant, alias and category stays as it is. A reviewer checks this proposal before publication.
				</p>
				{error && (
					<p role="alert" className="break-words text-sm text-destructive">
						{error}
					</p>
				)}
				<Button
					disabled={!changes || busy || Boolean(target.unresolved) || stale || Boolean(owned && !live)}
					onClick={() => void send()}
					className="min-h-11 w-full whitespace-normal text-secondary-foreground"
				>
					{saveLabel}
				</Button>
			</aside>
		</div>
	)
}
