"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	FileStack,
	GitCompareArrows,
	Layers,
	Loader2,
	Minus,
	Plus,
	RefreshCw,
	Send,
	Tags,
	Undo2,
	WandSparkles,
	X,
} from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { RejectedRoundComparison } from "@/components/submission/rejected-round-comparison"
import { RejectionNotice } from "@/components/submission/rejection-notice"
import { AssetPreview } from "@/components/submission/submission-preview"
import {
	CategoryPicker,
	DropPrompt,
	FileChooser,
	FileDrop,
	PANEL_CLASS,
	SectionHeading,
	splitAliases,
	VariantGlyph,
	variantBackdrop,
} from "@/components/submission/submission-ui"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TagInput } from "@/components/ui/tag-input"
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
	className,
}: {
	preview?: UpdatePreview
	variant: SubmissionVariant
	file?: File
	name: string
	compact?: boolean
	present?: boolean
	className?: string
}) {
	const kind = variantKind(variant)
	let background: "light" | "dark" | "checker" = "checker"
	if (kind.background !== "any") background = kind.background
	let size = "h-24 w-full"
	if (compact) size = "size-14 p-1"
	if (file) return <AssetPreview asset={{ id: variant, file, variant }} background={background} className={cn(size, className)} />
	return (
		<div
			className={cn(
				"flex items-center justify-center rounded-md p-3",
				size,
				background === "checker" && "bg-muted",
				background === "light" && "bg-white",
				background === "dark" && "bg-zinc-950",
				className,
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

const ACTION_BADGE = {
	add: "border-success/20 bg-success/10 text-success",
	replace: "border-warning/20 bg-warning/10 text-warning",
	remove: "border-destructive/20 bg-destructive/10 text-destructive",
} as const

const ACTION_TILE = {
	add: "border-success/40 bg-success/5",
	replace: "border-warning/40 bg-warning/5",
	remove: "border-destructive/40 bg-destructive/5",
} as const

export function ChangeBadge({ action }: { action?: "add" | "replace" | "remove" }) {
	let label = "Unchanged"
	if (action === "add") label = "+ added"
	if (action === "replace") label = "~ replaced"
	if (action === "remove") label = "− removed"
	return (
		<span
			className={cn(
				"shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
				!action && "text-muted-foreground",
				action && ACTION_BADGE[action],
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
	const [customOpen, setCustomOpen] = useState(false)
	const customInput = useRef<HTMLInputElement>(null)
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
	useEffect(() => {
		if (customOpen) customInput.current?.focus()
	}, [customOpen])
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
			<motion.section
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				className={cn(PANEL_CLASS, "mx-auto flex max-w-2xl flex-col gap-4 border-success/30 p-4 sm:p-6")}
				aria-live="polite"
			>
				<div className="flex items-center gap-3">
					<motion.span
						initial={{ scale: 0.6, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.3, delay: 0.1 }}
						className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
					>
						<Check className="size-6" aria-hidden />
					</motion.span>
					<h2 className="text-xl font-semibold">{owned ? "Update proposal saved" : "Update proposal sent"}</h2>
				</div>
				<p className="text-sm text-muted-foreground">
					Your changes to <strong className="font-mono text-foreground">{selection.value}</strong> are awaiting review. Unchanged Variants
					and metadata are preserved. Approval does not publish automatically.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild>
						<Link href={`/community/submissions/${sent}`}>
							View Update proposal
							<ArrowRight aria-hidden />
						</Link>
					</Button>
					<Button variant="outline" onClick={onCancel}>
						Choose another Icon
					</Button>
				</div>
			</motion.section>
		)
	if (!loaded)
		return (
			<section className={cn(PANEL_CLASS, "mx-auto flex max-w-3xl flex-col gap-4 p-5")} aria-live="polite">
				{!error && (
					<output className="flex flex-col gap-3" aria-label="Loading current Icon">
						<Skeleton className="h-20 w-full" />
						<div className="grid gap-3 sm:grid-cols-2">
							<Skeleton className="h-40" />
							<Skeleton className="h-40" />
						</div>
					</output>
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					{error && (
						<Button variant="outline" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>
							<RefreshCw aria-hidden />
							Retry loading Icon
						</Button>
					)}
					<Button variant="ghost" className="min-h-11" onClick={onCancel}>
						<ArrowLeft aria-hidden />
						Choose another Icon
					</Button>
				</div>
			</section>
		)
	const { target, previews } = loaded
	const stale = Boolean(owned && live && live.target.revision !== target.revision)
	const keys = [
		...new Set([...Object.keys(target.files), ...retained.map((change) => change.key), ...Object.keys(files), ...Object.keys(removals)]),
	] as SubmissionVariant[]
	const rows = [...SUBMISSION_VARIANTS.filter((key) => keys.includes(key)), ...keys.filter((key) => key.startsWith("custom:"))]
	let proposedAliases = target.metadata.aliases
	if (aliasesEdited) proposedAliases = splitAliases(aliases)
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
	const disabled = !changes || busy || Boolean(target.unresolved) || stale || Boolean(owned && !live)
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
	const cta = (
		<Button disabled={disabled} onClick={() => void send()} className="w-full max-lg:w-auto max-lg:shrink-0">
			{busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
			{!busy && <Send aria-hidden />}
			{saveLabel}
		</Button>
	)
	return (
		<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" data-icon-update-editor>
			<div className="flex min-w-0 flex-col gap-6">
				<header className={cn(PANEL_CLASS, "flex flex-wrap items-center gap-4 p-4 sm:p-5")}>
					<span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-border dark:bg-secondary/10">
						{previews.base && <UnoptimizedImage src={previews.base.url} alt="" width={48} height={48} className="size-12 object-contain" />}
						{!previews.base && <Layers className="size-6 text-muted-foreground" aria-hidden />}
					</span>
					<div className="min-w-0 flex-1 basis-56">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="border-community/20 bg-community/10 text-community">
								Update proposal
							</Badge>
							<Badge variant="outline" className="text-muted-foreground">
								{target.kind === "published" ? "Published Icon" : "Community Submission"}
							</Badge>
						</div>
						<h2 className="mt-1.5 break-all font-mono text-2xl font-semibold">{target.name}</h2>
					</div>
					<Button variant="ghost" disabled={busy} onClick={onCancel}>
						<ArrowLeft aria-hidden />
						Choose another Icon
					</Button>
				</header>
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
					<Alert className="border-warning/30 bg-warning/5 [&>svg]:text-warning">
						<AlertTriangle aria-hidden />
						<AlertTitle className="line-clamp-none">The target Icon changed</AlertTitle>
						<AlertDescription>
							<p>
								Your saved proposal has not been applied. Explicitly choose the latest target and review your artwork against it before
								saving. This reloads metadata; your selected Variant changes stay in this proposal.
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-1"
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
								<RefreshCw aria-hidden />
								Use latest target for this proposal
							</Button>
						</AlertDescription>
					</Alert>
				)}
				{target.unresolved && (
					<section
						className={cn(PANEL_CLASS, "flex flex-col gap-3 border-warning/30 bg-warning/5 p-4")}
						aria-label="Unassigned target artwork"
					>
						<SectionHeading
							icon={FileStack}
							tone="warning"
							title="The contributor needs to assign the existing files"
							description="Every original file is kept. An update cannot be sent until each file has an unambiguous Variant, including Base."
						/>
						{target.unresolved.references.map((reference) => (
							<p key={`${reference.variant}:${reference.reference}`} className="break-all text-sm">
								{variantKind(reference.variant).label}: {reference.reference} could not be matched to exactly one file.
							</p>
						))}
						<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{target.unresolved.assets.map((file) => (
								<li key={file} className="flex min-w-0 flex-col gap-2">
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
				<section className={cn(PANEL_CLASS, "flex min-w-0 flex-col gap-4 p-3 sm:p-5")}>
					<SectionHeading
						icon={Layers}
						tone="info"
						title="Variants"
						description="Replace artwork or remove an optional Variant. Untouched Variants stay as they are. Base is required and cannot be removed."
					/>
					<fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
						<legend className="sr-only">Variants</legend>
						<div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
									<div
										key={key}
										className={cn(
											"flex min-w-0 flex-col gap-3 rounded-md border p-3 transition-colors duration-300",
											action && ACTION_TILE[action],
										)}
									>
										<div className="flex min-w-0 items-center justify-between gap-2">
											<h4 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
												<VariantGlyph variant={key} />
												<span className="truncate">{kind.label}</span>
											</h4>
											<ChangeBadge action={action} />
										</div>
										<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
											<figure className="flex min-w-0 flex-col gap-1">
												<UpdateArtwork
													present={Boolean(target.files[key])}
													preview={previews[key]}
													variant={key}
													name={target.name}
													className="ring-1 ring-inset ring-border"
												/>
												<figcaption className="text-xs text-muted-foreground">Now</figcaption>
											</figure>
											<ArrowRight className="mt-10 size-4 text-muted-foreground" aria-hidden />
											<figure className="flex min-w-0 flex-col gap-1">
												{removed && (
													<div
														className="flex h-24 items-center justify-center rounded-md border border-dashed border-destructive/40 text-destructive"
														aria-label="Variant removed"
														role="img"
													>
														<Minus aria-hidden />
													</div>
												)}
												{!removed && (
													<FileDrop
														label={`Replace ${kind.label}`}
														backdrop={variantBackdrop(key)}
														className="h-24 rounded-md"
														onFiles={(chosen) => {
															if (chosen[0]) changeFile(key, chosen[0])
														}}
													>
														<UpdateArtwork
															present={Boolean(target.files[key])}
															preview={proposedPreview}
															file={file}
															variant={key}
															name={target.name}
															className="ring-1 ring-inset ring-border"
														/>
														<span className="pointer-events-none absolute right-1 bottom-1 inline-flex items-center gap-1 rounded-sm border bg-background px-1.5 py-0.5 text-xs font-medium text-foreground">
															<RefreshCw className="size-3" aria-hidden />
															Replace
														</span>
													</FileDrop>
												)}
												<figcaption className="text-xs text-muted-foreground">Proposed</figcaption>
											</figure>
										</div>
										<div className="flex min-w-0 flex-col gap-0.5">
											<p
												className="truncate font-mono text-xs text-muted-foreground"
												title={file?.name || proposedPreview?.filename || target.files[key]}
											>
												{file?.name || proposedPreview?.filename || target.files[key]}
											</p>
											{!file && previews[key] && (
												<p className="text-xs text-muted-foreground">{previews[key].formats.join(" / ").toUpperCase()}</p>
											)}
											<p className="text-xs text-muted-foreground">{kind.description}</p>
											{saved && !("file" in saved) && <p className="text-sm">Saved {savedAction} operation retained.</p>}
										</div>
										{((key !== "base" && target.files[key] && !removed) || file || saved || removed) && (
											<div className="mt-auto flex flex-wrap gap-1">
												{key !== "base" && target.files[key] && !removed && (
													<Button
														variant="ghost"
														size="sm"
														className="h-auto min-h-9 max-w-full whitespace-normal text-left text-destructive hover:bg-destructive/10"
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
														size="sm"
														className="h-auto min-h-9 max-w-full whitespace-normal text-left"
														onClick={() => undoVariant(key)}
													>
														<Undo2 aria-hidden />
														Undo {kind.label}
													</Button>
												)}
											</div>
										)}
										{removed && (
											<div className="flex flex-col gap-2">
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
									</div>
								)
							})}
							{SUBMISSION_VARIANTS.filter((key) => !rows.includes(key)).map((key) => {
								const kind = variantKind(key)
								return (
									<div key={key} className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed p-3">
										<div className="flex min-w-0 items-center justify-between gap-2">
											<h4 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
												<VariantGlyph variant={key} />
												<span className="truncate">{kind.label}</span>
											</h4>
											<span className="text-xs text-muted-foreground">Not present</span>
										</div>
										<FileDrop
											label={`Add ${kind.label}`}
											backdrop={variantBackdrop(key)}
											className="h-24 rounded-md"
											onFiles={(chosen) => {
												if (chosen[0]) changeFile(key, chosen[0])
											}}
										>
											<DropPrompt backdrop={variantBackdrop(key)} title={`Add ${kind.label}`} />
										</FileDrop>
										<p className="mt-auto text-xs text-muted-foreground">{kind.description}</p>
									</div>
								)
							})}
						</div>
						{!customOpen && !custom && (
							<Button variant="ghost" size="sm" className="self-start" onClick={() => setCustomOpen(true)}>
								<Plus aria-hidden />
								Custom variant
							</Button>
						)}
						{(customOpen || custom) && (
							<motion.div
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex flex-col gap-2 rounded-md border border-community/30 bg-community/5 p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<label htmlFor="update-custom" className="flex items-center gap-1.5 text-sm font-medium">
										<WandSparkles className="size-4 text-community" aria-hidden />
										Custom variant name
									</label>
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-muted-foreground"
										aria-label="Cancel Custom variant"
										onClick={() => {
											setCustomOpen(false)
											setCustom("")
										}}
									>
										<X aria-hidden />
									</Button>
								</div>
								{suggestionsError && <p className="text-sm text-muted-foreground">{suggestionsError}</p>}
								<div className="flex flex-wrap items-center gap-2">
									<Input
										ref={customInput}
										id="update-custom"
										value={custom}
										onChange={(event) => setCustom(event.target.value)}
										placeholder="For example 4k or animated"
										list="update-custom-names"
										className="min-w-0 flex-1 basis-48 font-mono"
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
											className="h-10"
											onFiles={(chosen) => {
												if (chosen[0]) {
													changeFile(`custom:${custom}`, chosen[0])
													setCustom("")
													setCustomOpen(false)
												}
											}}
										/>
									)}
								</div>
								{customError && <p className="text-sm text-destructive">{customError}</p>}
								{custom && rows.includes(`custom:${custom}`) && (
									<p className="text-sm text-muted-foreground">This Variant is listed above. Replace its file there.</p>
								)}
							</motion.div>
						)}
					</fieldset>
				</section>
				<fieldset disabled={busy} className={cn(PANEL_CLASS, "flex min-w-0 flex-col gap-5 p-3 sm:p-5")}>
					<legend className="sr-only">Icon metadata</legend>
					<SectionHeading icon={Tags} tone="success" title="Details" description="Aliases and categories help people find this Icon." />
					<div className="flex flex-col gap-2">
						<label htmlFor="update-aliases" className="text-sm font-medium">
							Aliases
						</label>
						<TagInput
							id="update-aliases"
							value={splitAliases(aliases)}
							onValueChange={(next) => {
								setAliases(next.join(", "))
								setAliasesEdited(true)
							}}
							placeholder="Alternative names or abbreviations"
							className="min-h-11"
						/>
						<p className="text-xs text-muted-foreground">Space, comma or Enter adds an alias. Backspace removes the last one.</p>
					</div>
					<fieldset className="flex flex-col gap-2">
						<legend className="mb-2 text-sm font-medium">Categories</legend>
						<CategoryPicker
							options={[...new Set([...SUBMISSION_CATEGORIES, ...target.metadata.categories])]}
							value={categories}
							onChange={setCategories}
						/>
					</fieldset>
					<div className="flex flex-col gap-2">
						<label htmlFor="update-note" className="text-sm font-medium">
							Note for the reviewer <span className="font-normal text-muted-foreground">(optional)</span>
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
			<aside
				className={cn(
					PANEL_CLASS,
					"relative flex min-w-0 flex-col gap-4 self-start overflow-hidden p-4 lg:sticky lg:top-24",
					!disabled && "border-primary/30",
				)}
				aria-label="Proposal changes"
			>
				<SectionHeading
					icon={GitCompareArrows}
					tone="community"
					level={2}
					title="Changes in this proposal"
					description={
						<>
							<span className="sr-only">{changes}</span>
							<NumberTicker value={changes} className="tracking-normal" aria-hidden /> {changes === 1 ? "change" : "changes"}
						</>
					}
				/>
				{!changes && (
					<p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
						Add, replace or remove a Variant, or edit aliases and categories to start.
					</p>
				)}
				<ul className="flex flex-col gap-1.5 break-words text-sm" aria-live="polite">
					{Object.keys(removals).map((key) => (
						<li key={key} className="flex flex-wrap items-center gap-2">
							<ChangeBadge action="remove" />
							<VariantGlyph variant={key as RemovableVariantKey} className="size-3.5" />
							<span>{variantKind(key as RemovableVariantKey).label}</span>
						</li>
					))}
					{[...new Set([...Object.keys(files), ...retained.map((change) => change.key)])].map((key) => (
						<li key={key} className="flex flex-wrap items-center gap-2">
							<ChangeBadge action={target.files[key as SubmissionVariant] ? "replace" : "add"} />
							<VariantGlyph variant={key as SubmissionVariant} className="size-3.5" />
							<span>{variantKind(key as SubmissionVariant).label}</span>
						</li>
					))}
					{(["aliases", "categories"] as const).flatMap((field) => {
						const delta = field === "aliases" ? aliasDelta : categoryDelta
						return [
							...delta.add.map((value) => (
								<li key={`${field}+${value}`} className="flex flex-wrap items-center gap-2">
									<span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", ACTION_BADGE.add)}>+ {field}</span>
									<span className="font-mono text-xs">{value}</span>
								</li>
							)),
							...delta.remove.map((value) => (
								<li key={`${field}-${value}`} className="flex flex-wrap items-center gap-2">
									<span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", ACTION_BADGE.remove)}>− {field}</span>
									<span className="font-mono text-xs">{value}</span>
								</li>
							)),
						]
					})}
				</ul>
				<p className="text-xs text-muted-foreground">
					Every unrelated Variant, alias and category stays as it is. A reviewer checks this proposal before publication.
				</p>
				{error && (
					<p role="alert" className="break-words text-sm text-destructive">
						{error}
					</p>
				)}
				<div className="max-lg:hidden">{cta}</div>
				{!disabled && (
					<BorderBeam
						size={100}
						duration={8}
						colorFrom="var(--magic-border-from)"
						colorTo="var(--magic-border-to)"
						className="motion-reduce:hidden"
					/>
				)}
			</aside>
			<div
				data-submission-actions
				className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border/50 bg-background/50 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden"
			>
				<p className="min-w-0 flex-1 text-sm text-muted-foreground">
					{changes} {changes === 1 ? "change" : "changes"}
				</p>
				{cta}
			</div>
		</div>
	)
}
