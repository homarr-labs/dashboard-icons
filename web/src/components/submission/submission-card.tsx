"use client"

import {
	AlertCircle,
	Check,
	ChevronDown,
	CopyPlus,
	Eye,
	ImagePlus,
	Layers,
	Plus,
	RefreshCw,
	Tags,
	Trash2,
	UploadCloud,
	WandSparkles,
	X,
} from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { AssetPreview } from "@/components/submission/submission-preview"
import {
	CategoryPicker,
	DropPrompt,
	FileChooser,
	FileDrop,
	SectionHeading,
	splitAliases,
	VariantGlyph,
	variantBackdrop,
} from "@/components/submission/submission-ui"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import { Textarea } from "@/components/ui/textarea"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"
import type { DraftAsset, SubmissionDraft } from "@/lib/submission-drafts"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

interface SubmissionCardProps {
	draft: SubmissionDraft
	index: number
	open: boolean
	error?: string
	customNames: string[]
	onSelect: () => void
	onChange: (patch: Partial<SubmissionDraft>) => void
	onFiles: (files: File[]) => void
	onRemove: () => void
	onPreview: () => void
	onApplyCategories: () => void
	children?: React.ReactNode
	editing?: boolean
}

function VariantSlot({
	variant,
	assets,
	onAdd,
	onRemove,
	onKeep,
	editing = false,
}: {
	variant: SubmissionVariant
	assets: DraftAsset[]
	onAdd: (file: File) => void
	onRemove: (id: string) => void
	onKeep: (id: string) => void
	editing?: boolean
}) {
	const kind = variantKind(variant)
	const backdrop = variantBackdrop(variant)
	const conflict = assets.length > 1
	return (
		<MagicCard className={cn("min-w-0 rounded-md", conflict && "outline-2 outline-destructive")}>
			<div className="flex min-w-0 flex-col gap-2.5 p-2.5 sm:p-3">
				<div className="flex min-h-6 min-w-0 items-center justify-between gap-1.5">
					<h4 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
						<VariantGlyph variant={variant} />
						<span className="truncate">{kind.label}</span>
					</h4>
					{variant === "base" && assets.length === 0 && (
						<Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
							Required
						</Badge>
					)}
					{assets.length === 1 && (
						<span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-success/10 text-success">
							<Check className="size-3.5" aria-label="Added" />
						</span>
					)}
				</div>
				{assets.length === 0 && (
					<FileDrop
						label={`Choose ${kind.label}`}
						backdrop={backdrop}
						className="h-28"
						onFiles={(files) => {
							if (files[0]) onAdd(files[0])
						}}
					>
						<DropPrompt backdrop={backdrop} title="Drop or choose" />
					</FileDrop>
				)}
				{assets.map((asset) => (
					<motion.div key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-w-0 flex-col gap-2">
						{editing && (
							<FileDrop
								label={`Replace ${kind.label}`}
								backdrop={backdrop}
								className="h-28"
								onFiles={(files) => {
									if (files[0]) onAdd(files[0])
								}}
							>
								<AssetPreview asset={asset} background={backdrop} className="size-full" />
								<span className="pointer-events-none absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-sm border bg-background px-1.5 py-0.5 text-xs font-medium text-foreground">
									<RefreshCw className="size-3" aria-hidden />
									Replace
								</span>
							</FileDrop>
						)}
						{!editing && <AssetPreview asset={asset} background={backdrop} className="h-28 w-full" />}
						<div className="flex min-w-0 items-center gap-1">
							<p title={asset.file.name} className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
								{asset.file.name}
							</p>
							{(!editing || variant !== "base") && (
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Remove ${asset.file.name}`}
									className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									onClick={() => onRemove(asset.id)}
								>
									<Trash2 aria-hidden />
								</Button>
							)}
						</div>
						{conflict && (
							<Button variant="outline" size="sm" className="w-full whitespace-normal" onClick={() => onKeep(asset.id)}>
								Keep this file
							</Button>
						)}
					</motion.div>
				))}
				{conflict && <p className="text-xs text-destructive">Choose one file for {kind.label}. Both are kept until you resolve this.</p>}
				<p className="text-xs leading-snug text-muted-foreground">{kind.description}</p>
			</div>
		</MagicCard>
	)
}

export function SubmissionCard({
	draft,
	index,
	open,
	error,
	customNames,
	onSelect,
	onChange,
	onFiles,
	onRemove,
	onPreview,
	onApplyCategories,
	children,
	editing = false,
}: SubmissionCardProps) {
	const [confirmRemoval, setConfirmRemoval] = useState(false)
	const [customOpen, setCustomOpen] = useState(false)
	const customInput = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (customOpen) customInput.current?.focus()
	}, [customOpen])
	const base = draft.assets.find((asset) => asset.variant === "base")
	const variants = [...new Set(draft.assets.map((asset) => asset.variant))]
	const customVariants = variants.filter((variant) => variant.startsWith("custom:"))
	const customError = draft.customVariantName && customVariantNameError(draft.customVariantName)
	const invalidName = Boolean(draft.name && (!ICON_NAME_REGEX.test(draft.name) || draft.name.length > MAX_NAME_LENGTH))
	const addToSlot = (variant: SubmissionVariant, file: File) =>
		onChange({ assets: [...draft.assets, { id: crypto.randomUUID(), file, variant }] })
	const closeCustom = () => {
		setCustomOpen(false)
		if (draft.customVariantName) onChange({ customVariantName: "" })
	}
	return (
		<article
			className={cn(
				"min-w-0 scroll-mt-24 rounded-lg border bg-background shadow-sm transition-colors duration-300",
				open && "border-primary/40",
				error && "border-destructive/50",
			)}
			data-submission-card={draft.id}
		>
			<h2 className="text-base font-normal">
				<button
					type="button"
					aria-expanded={open}
					aria-controls={`body-${draft.id}`}
					onClick={onSelect}
					className="group/header flex min-h-18 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4"
				>
					{base && <AssetPreview asset={base} className="size-12 shrink-0 p-1.5" />}
					{!base && (
						<span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-primary/40 bg-primary/5 text-primary">
							<ImagePlus className="size-5" aria-hidden />
						</span>
					)}
					<span className="min-w-0 flex-1">
						<span className="flex min-w-0 items-center gap-2">
							{!editing && <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">#{index}</span>}
							<span className="truncate font-mono font-semibold">{draft.name || "Untitled icon"}</span>
						</span>
						<span className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
							{draft.assets.length === 0 && "No files yet"}
							{draft.assets.length > 0 && (
								<>
									<span className="shrink-0">
										{draft.assets.length} {draft.assets.length === 1 ? "file" : "files"}
									</span>
									<span className="flex min-w-0 items-center gap-1 overflow-hidden">
										{variants.map((variant) => (
											<span key={variant} title={variantKind(variant).label} className="flex shrink-0">
												<VariantGlyph variant={variant} className="size-3.5" />
												<span className="sr-only">{variantKind(variant).label}</span>
											</span>
										))}
									</span>
								</>
							)}
						</span>
					</span>
					{error && (
						<Badge variant="outline" className="shrink-0 border-destructive/20 bg-destructive/10 text-destructive">
							<AlertCircle aria-hidden />
							Fix needed
						</Badge>
					)}
					{!error && draft.assets.length > 0 && (
						<Badge variant="outline" className="shrink-0 border-success/20 bg-success/10 text-success">
							<Check aria-hidden />
							<span className="max-sm:sr-only">Ready</span>
						</Badge>
					)}
					<ChevronDown
						className={cn(
							"size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/header:text-foreground motion-reduce:transition-none",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</button>
			</h2>
			{open && (
				<motion.div
					id={`body-${draft.id}`}
					initial={{ opacity: 0, y: -4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
					className="flex min-w-0 flex-col gap-6 border-t p-3 sm:p-5"
				>
					<div className="flex flex-col gap-2">
						<label htmlFor={`name-${draft.id}`} className="text-sm font-medium">
							Slug
						</label>
						<div className="flex flex-wrap items-center gap-2">
							<Input
								id={`name-${draft.id}`}
								value={draft.name}
								onChange={(event) => onChange({ name: event.target.value })}
								placeholder="my-app"
								autoComplete="off"
								spellCheck={false}
								className="h-11 min-w-0 flex-1 basis-full font-mono sm:basis-48"
								aria-invalid={invalidName}
								aria-describedby={error ? `error-${draft.id}` : `hint-${draft.id}`}
							/>
							<FileChooser label="Add files" multiple onFiles={onFiles} className="h-11 max-sm:flex-1" />
							{!editing && (
								<Button
									variant="ghost"
									size="icon"
									className="size-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									aria-label={`Remove ${draft.name || `Icon ${index}`}`}
									onClick={() => setConfirmRemoval(true)}
								>
									<Trash2 aria-hidden />
								</Button>
							)}
						</div>
						<p id={`hint-${draft.id}`} className="text-xs text-muted-foreground">
							Lowercase letters, numbers and hyphens, for example <code className="font-mono">my-app</code>.
						</p>
					</div>
					{error && (
						<p
							id={`error-${draft.id}`}
							role="alert"
							className="-mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
						>
							<AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
							{error}
						</p>
					)}
					{children}
					{draft.assets.length === 0 && (
						<FileDrop label="Choose all files for this Icon" multiple onFiles={onFiles} className="min-h-36 bg-primary/5">
							<span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[inherit] border border-dashed border-primary/30 p-4 text-center transition-colors group-hover/drop:border-primary">
								<span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover/drop:-translate-y-0.5 motion-reduce:transition-none">
									<UploadCloud className="size-5" aria-hidden />
								</span>
								<span className="text-sm font-semibold">Drop all of this Icon’s files</span>
								<span className="max-w-sm text-xs text-muted-foreground">
									or click to choose. Suffixes like <code className="font-mono">-light</code>, <code className="font-mono">-dark</code> or{" "}
									<code className="font-mono">-wordmark</code> sort them into Variants.
								</span>
							</span>
						</FileDrop>
					)}
					<section className="flex min-w-0 flex-col gap-4">
						<SectionHeading
							icon={Layers}
							tone="info"
							title="Variants"
							description="Base is required. Add the others when the brand has them."
						>
							<Button variant="outline" size="sm" className="lg:hidden" onClick={onPreview}>
								<Eye aria-hidden />
								Preview files
							</Button>
						</SectionHeading>
						<MagicCardPointerProvider className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
							{[...SUBMISSION_VARIANTS, ...customVariants].map((variant) => (
								<VariantSlot
									key={variant}
									variant={variant}
									assets={draft.assets.filter((asset) => asset.variant === variant)}
									onAdd={(file) => {
										if (editing)
											onChange({
												assets: [...draft.assets.filter((asset) => asset.variant !== variant), { id: crypto.randomUUID(), file, variant }],
											})
										else addToSlot(variant, file)
									}}
									editing={editing}
									onRemove={(id) => onChange({ assets: draft.assets.filter((asset) => asset.id !== id) })}
									onKeep={(id) => onChange({ assets: draft.assets.filter((asset) => asset.variant !== variant || asset.id === id) })}
								/>
							))}
						</MagicCardPointerProvider>
						{!customOpen && !draft.customVariantName && (
							<Button variant="ghost" size="sm" className="self-start" onClick={() => setCustomOpen(true)}>
								<Plus aria-hidden />
								Custom variant
							</Button>
						)}
						{(customOpen || draft.customVariantName) && (
							<motion.div
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex flex-col gap-2 rounded-md border border-community/30 bg-community/5 p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<label htmlFor={`custom-${draft.id}`} className="flex items-center gap-1.5 text-sm font-medium">
										<WandSparkles className="size-4 text-community" aria-hidden />
										Custom variant name
									</label>
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-muted-foreground"
										aria-label="Cancel Custom variant"
										onClick={closeCustom}
									>
										<X aria-hidden />
									</Button>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Input
										ref={customInput}
										id={`custom-${draft.id}`}
										value={draft.customVariantName}
										onChange={(event) => onChange({ customVariantName: event.target.value })}
										placeholder="For example 4k or animated"
										list={`custom-options-${draft.id}`}
										className="min-w-0 flex-1 basis-48 bg-background font-mono"
										aria-invalid={Boolean(customError)}
									/>
									<datalist id={`custom-options-${draft.id}`}>
										{customNames.map((name) => (
											<option key={name} value={name} />
										))}
									</datalist>
									{!customError && draft.customVariantName && (
										<FileChooser
											label="Choose Custom file"
											className="h-10"
											onFiles={(files) => {
												if (!files[0]) return
												setCustomOpen(false)
												onChange({
													customVariantName: "",
													assets: [
														...draft.assets,
														{ id: crypto.randomUUID(), file: files[0], variant: `custom:${draft.customVariantName}` },
													],
												})
											}}
										/>
									)}
								</div>
								{customError && <p className="text-sm text-destructive">{customError}</p>}
								<p className="text-xs text-muted-foreground">
									Lowercase kebab-case, up to 32 characters. Suggested names come from the collection.
								</p>
							</motion.div>
						)}
					</section>
					<section className="flex min-w-0 flex-col gap-5">
						<SectionHeading icon={Tags} tone="success" title="Details" description="Help people find this Icon." />
						<div className="flex flex-col gap-2">
							<label htmlFor={`aliases-${draft.id}`} className="text-sm font-medium">
								Aliases
							</label>
							<TagInput
								id={`aliases-${draft.id}`}
								value={splitAliases(draft.aliases)}
								onValueChange={(aliases) => onChange({ aliases: aliases.join(", ") })}
								placeholder="Alternative names or abbreviations"
								className="min-h-11 bg-background"
							/>
							<p className="text-xs text-muted-foreground">Space, comma or Enter adds an alias. Backspace removes the last one.</p>
						</div>
						<fieldset className="flex flex-col gap-2">
							<legend className="mb-2 text-sm font-medium">Categories</legend>
							<CategoryPicker
								options={SUBMISSION_CATEGORIES}
								value={draft.categories}
								onChange={(categories) => onChange({ categories })}
							/>
							{!editing && (
								<Button
									variant="ghost"
									size="sm"
									className="self-start text-muted-foreground"
									onClick={onApplyCategories}
									disabled={draft.categories.length === 0}
								>
									<CopyPlus aria-hidden />
									Add these categories to other Icons
								</Button>
							)}
						</fieldset>
						<div className="flex flex-col gap-2">
							<label htmlFor={`note-${draft.id}`} className="text-sm font-medium">
								Note for the reviewer <span className="font-normal text-muted-foreground">(optional)</span>
							</label>
							<Textarea
								id={`note-${draft.id}`}
								value={draft.description}
								onChange={(event) => onChange({ description: event.target.value })}
								placeholder="What does this Icon represent? Where is the artwork from?"
								rows={2}
								className="bg-background"
							/>
						</div>
					</section>
				</motion.div>
			)}
			<AlertDialog open={confirmRemoval} onOpenChange={setConfirmRemoval}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove {draft.name || "this Icon"}?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes this card, its files and its metadata from this form. Nothing already submitted is changed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="min-h-11">Keep Icon</AlertDialogCancel>
						<AlertDialogAction className="min-h-11 text-secondary-foreground" onClick={onRemove}>
							Remove Icon
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</article>
	)
}
