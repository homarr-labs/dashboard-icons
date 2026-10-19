"use client"

import { Check, ChevronDown, Plus, Trash2, UploadCloud } from "lucide-react"
import { useState } from "react"
import { AssetPreview } from "@/components/submission/submission-preview"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
}

function FileChooser({
	label,
	multiple = false,
	onFiles,
	className,
}: {
	label: string
	multiple?: boolean
	onFiles: (files: File[]) => void
	className?: string
}) {
	return (
		<label
			className={cn(
				"relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-sm font-medium hover:bg-accent hover:text-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
				className,
			)}
		>
			<UploadCloud className="size-4 shrink-0" aria-hidden />
			{label}
			<input
				type="file"
				aria-label={label}
				accept=".svg,.png,image/svg+xml,image/png"
				multiple={multiple}
				className="absolute inset-0 w-full cursor-pointer opacity-0"
				onChange={(event) => {
					onFiles(Array.from(event.target.files ?? []))
					event.target.value = ""
				}}
			/>
		</label>
	)
}

function VariantSlot({
	variant,
	assets,
	onAdd,
	onRemove,
	onKeep,
}: {
	variant: SubmissionVariant
	assets: DraftAsset[]
	onAdd: (file: File) => void
	onRemove: (id: string) => void
	onKeep: (id: string) => void
}) {
	const kind = variantKind(variant)
	let background: "light" | "dark" | "checker" = "checker"
	if (kind.background !== "any") background = kind.background
	return (
		<div className={cn("min-w-0 space-y-2 rounded-lg bg-muted/40 p-3", assets.length > 1 && "ring-1 ring-inset ring-destructive")}>
			<div className="flex flex-wrap items-center justify-between gap-1">
				<h4 className="break-all text-sm font-medium">{kind.label}</h4>
				{variant === "base" && <span className="text-xs text-muted-foreground">Required</span>}
			</div>
			{assets.length === 0 && (
				<FileChooser
					label={`Choose ${kind.label}`}
					className="w-full border-dashed"
					onFiles={(files) => {
						if (files[0]) onAdd(files[0])
					}}
				/>
			)}
			{assets.map((asset) => (
				<div key={asset.id} className="min-w-0 space-y-2">
					<AssetPreview asset={asset} background={background} className="h-20 w-full" />
					<p title={asset.file.name} className="break-all font-mono text-sm leading-snug">
						{asset.file.name}
					</p>
					<div className="flex flex-wrap items-center justify-between gap-1">
						{assets.length > 1 && (
							<Button variant="outline" className="max-w-full whitespace-normal text-left" onClick={() => onKeep(asset.id)}>
								Keep this file
							</Button>
						)}
						<Button
							variant="ghost"
							aria-label={`Remove ${asset.file.name}`}
							className="ml-auto size-11 shrink-0 p-0 text-muted-foreground hover:text-destructive"
							onClick={() => onRemove(asset.id)}
						>
							<Trash2 aria-hidden />
						</Button>
					</div>
				</div>
			))}
			{assets.length > 1 && (
				<p className="text-sm text-destructive">Choose one file for {kind.label}. Both are kept until you resolve this.</p>
			)}
			<p className="text-sm text-muted-foreground">{kind.description}</p>
		</div>
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
}: SubmissionCardProps) {
	const [confirmRemoval, setConfirmRemoval] = useState(false)
	const base = draft.assets.find((asset) => asset.variant === "base")
	const customVariants = [...new Set(draft.assets.map((asset) => asset.variant).filter((variant) => variant.startsWith("custom:")))]
	const customError = draft.customVariantName && customVariantNameError(draft.customVariantName)
	const invalidName = Boolean(draft.name && (!ICON_NAME_REGEX.test(draft.name) || draft.name.length > MAX_NAME_LENGTH))
	const addToSlot = (variant: SubmissionVariant, file: File) =>
		onChange({ assets: [...draft.assets, { id: crypto.randomUUID(), file, variant }] })
	return (
		<article className={cn("min-w-0 rounded-xl border bg-background", open && "border-foreground/30")} data-submission-card={draft.id}>
			<h2 className="text-base font-normal">
				<button
					type="button"
					aria-expanded={open}
					aria-controls={`body-${draft.id}`}
					onClick={onSelect}
					className="flex min-h-18 w-full items-center gap-3 rounded-xl p-3 text-left"
				>
					{base ? (
						<AssetPreview asset={base} className="size-11 shrink-0 p-1" />
					) : (
						<span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground">
							<UploadCloud className="size-5" aria-hidden />
						</span>
					)}
					<span className="min-w-0 flex-1">
						<span className="flex min-w-0 items-baseline gap-2">
							<span className="text-sm text-muted-foreground">#{index}</span>
							<span className="truncate font-mono font-semibold">{draft.name || "Untitled icon"}</span>
						</span>
						<span className="mt-1 block truncate text-sm text-muted-foreground">
							{draft.assets.length
								? `${draft.assets.length} ${draft.assets.length === 1 ? "file" : "files"} · ${[...new Set(draft.assets.map((asset) => variantKind(asset.variant).label))].join(" · ")}`
								: "No files yet"}
						</span>
					</span>
					{error ? (
						<span className="shrink-0 rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">Fix needed</span>
					) : (
						draft.assets.length > 0 && <Check className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-label="Ready" />
					)}
					<ChevronDown
						className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
						aria-hidden
					/>
				</button>
			</h2>
			{open && (
				<div id={`body-${draft.id}`} className="min-w-0 space-y-5 border-t p-3 sm:p-4">
					<div className="flex flex-wrap items-end gap-2">
						<div className="min-w-0 flex-1 space-y-2">
							<label htmlFor={`name-${draft.id}`} className="text-sm font-medium">
								Slug
							</label>
							<Input
								id={`name-${draft.id}`}
								value={draft.name}
								onChange={(event) => onChange({ name: event.target.value })}
								placeholder="my-app"
								autoComplete="off"
								spellCheck={false}
								className="font-mono"
								aria-invalid={invalidName}
								aria-describedby={error ? `error-${draft.id}` : undefined}
							/>
						</div>
						<FileChooser label="Add files" multiple onFiles={onFiles} />
						<Button
							variant="ghost"
							className="size-11 p-0 text-muted-foreground hover:text-destructive"
							aria-label={`Remove ${draft.name || `Icon ${index}`}`}
							onClick={() => setConfirmRemoval(true)}
						>
							<Trash2 aria-hidden />
						</Button>
					</div>
					{error && (
						<p id={`error-${draft.id}`} role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</p>
					)}
					{children}
					{draft.assets.length === 0 && (
						<FileChooser label="Choose all files for this Icon" multiple onFiles={onFiles} className="min-h-24 w-full border-dashed" />
					)}
					<section className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<h3 className="font-semibold">Variants</h3>
							<Button variant="outline" className="lg:hidden" onClick={onPreview}>
								Preview files
							</Button>
						</div>
						<div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
							{[...SUBMISSION_VARIANTS, ...customVariants].map((variant) => (
								<VariantSlot
									key={variant}
									variant={variant}
									assets={draft.assets.filter((asset) => asset.variant === variant)}
									onAdd={(file) => addToSlot(variant, file)}
									onRemove={(id) => onChange({ assets: draft.assets.filter((asset) => asset.id !== id) })}
									onKeep={(id) => onChange({ assets: draft.assets.filter((asset) => asset.variant !== variant || asset.id === id) })}
								/>
							))}
						</div>
						<p className="text-sm text-muted-foreground">
							Light is light-coloured artwork for dark backgrounds. Dark is dark artwork for light backgrounds.
						</p>
						<div className="space-y-2">
							<label htmlFor={`custom-${draft.id}`} className="text-sm font-medium">
								Add a Custom variant
							</label>
							<div className="flex flex-wrap items-start gap-2">
								<Input
									id={`custom-${draft.id}`}
									value={draft.customVariantName}
									onChange={(event) => onChange({ customVariantName: event.target.value })}
									placeholder="For example 4k or animated"
									list={`custom-options-${draft.id}`}
									className="min-w-0 flex-1 font-mono"
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
										onFiles={(files) => {
											if (!files[0]) return
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
							<p className="text-sm text-muted-foreground">
								Lowercase kebab-case, up to 32 characters. Suggested names come from the collection.
							</p>
						</div>
					</section>
					<section className="space-y-4">
						<div className="space-y-2">
							<label htmlFor={`aliases-${draft.id}`} className="text-sm font-medium">
								Aliases <span className="font-normal text-muted-foreground">(comma-separated)</span>
							</label>
							<Input
								id={`aliases-${draft.id}`}
								value={draft.aliases}
								onChange={(event) => onChange({ aliases: event.target.value })}
								placeholder="Alternative names or abbreviations"
							/>
						</div>
						<fieldset className="space-y-2">
							<legend className="text-sm font-medium">Categories</legend>
							<div className="flex flex-wrap gap-1.5">
								{SUBMISSION_CATEGORIES.map((category) => (
									<button
										key={category}
										type="button"
										aria-pressed={draft.categories.includes(category)}
										onClick={() =>
											onChange({
												categories: draft.categories.includes(category)
													? draft.categories.filter((item) => item !== category)
													: [...draft.categories, category],
											})
										}
										className={cn(
											"min-h-11 rounded-md px-3 py-2 text-sm transition-colors motion-reduce:transition-none",
											draft.categories.includes(category)
												? "bg-primary/15 font-medium text-foreground ring-1 ring-inset ring-primary"
												: "bg-muted/50 hover:bg-muted",
										)}
									>
										{category.replaceAll("-", " ")}
									</button>
								))}
							</div>
							<Button variant="ghost" onClick={onApplyCategories} disabled={draft.categories.length === 0}>
								<Plus aria-hidden />
								Add these categories to other Icons
							</Button>
						</fieldset>
						<div className="space-y-2">
							<label htmlFor={`note-${draft.id}`} className="text-sm font-medium">
								Note for the reviewer <span className="font-normal text-muted-foreground">(optional)</span>
							</label>
							<Textarea
								id={`note-${draft.id}`}
								value={draft.description}
								onChange={(event) => onChange({ description: event.target.value })}
								placeholder="What does this Icon represent? Where is the artwork from?"
								rows={2}
							/>
						</div>
					</section>
				</div>
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
