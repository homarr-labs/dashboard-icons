"use client"
import { Check, RotateCcw, Tags, Trash2, Wand2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import type { ReviewFixups } from "@/lib/dashboard/types"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { Kbd } from "./primitives"

export function ReviewRenameEditor({
	name,
	onStage,
	onCancel,
}: {
	name: string
	onStage: (name: string) => boolean
	onCancel: () => void
}) {
	const [value, setValue] = useState(name)
	const [error, setError] = useState("")
	const input = useRef<HTMLInputElement>(null)
	useEffect(() => {
		input.current?.focus()
		input.current?.select()
	}, [])
	return (
		<form
			className="mt-3 space-y-2 rounded-md border p-3"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault()
					onCancel()
				}
			}}
			onSubmit={(event) => {
				event.preventDefault()
				if (!ICON_NAME_REGEX.test(value) || value.length > MAX_NAME_LENGTH) {
					setError("Use lowercase letters and numbers separated by single hyphens, up to 80 characters.")
					return
				}
				if (onStage(value)) onCancel()
			}}
		>
			<label htmlFor="review-rename" className="text-sm font-medium">
				Icon slug
			</label>
			<Input
				ref={input}
				id="review-rename"
				value={value}
				onChange={(event) => {
					setValue(event.target.value)
					setError("")
				}}
				maxLength={MAX_NAME_LENGTH}
				aria-invalid={!!error}
				aria-describedby={error ? "review-rename-error" : undefined}
				className="font-mono max-lg:min-h-11"
			/>
			{error && (
				<p role="alert" id="review-rename-error" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button type="submit" size="sm" className="max-lg:min-h-11">
					<Check />
					Stage rename
				</Button>
				<Button type="button" variant="ghost" size="sm" className="max-lg:min-h-11" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export function ReviewMetadataEditor({
	aliases,
	categories,
	disabled,
	onStage,
}: {
	aliases: string[]
	categories: string[]
	disabled: boolean
	onStage: (fixups: Pick<ReviewFixups, "aliases" | "categories">) => boolean
}) {
	const [editing, setEditing] = useState(false)
	const [aliasList, setAliasList] = useState(aliases)
	const [categoryList, setCategoryList] = useState(categories)
	const [error, setError] = useState("")
	if (!editing)
		return (
			<Button variant="outline" size="sm" disabled={disabled} onClick={() => setEditing(true)} className="max-lg:min-h-11">
				<Tags />
				Edit aliases & categories
			</Button>
		)
	return (
		<form
			className="space-y-3 rounded-md border p-3"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault()
					setEditing(false)
				}
			}}
			onSubmit={(event) => {
				event.preventDefault()
				const unique = (values: string[]) => [...new Set(values.map((entry) => entry.trim()).filter(Boolean))]
				const next = { aliases: unique(aliasList), categories: unique(categoryList) }
				if (Object.values(next).some((entries) => entries.length > 100 || entries.some((entry) => entry.length > 200))) {
					setError("Use up to 100 values per field, each at most 200 characters.")
					return
				}
				if (onStage(next)) setEditing(false)
			}}
		>
			<p className="text-xs text-muted-foreground">Press Enter, comma or space to add a value. Leave a field empty to clear it.</p>
			<div className="space-y-1.5">
				<label htmlFor="review-aliases" className="text-sm font-medium">
					Aliases
				</label>
				<TagInput
					id="review-aliases"
					value={aliasList}
					maxTags={100}
					disabled={disabled}
					placeholder="Add an alias"
					onValueChange={(value) => {
						setAliasList(value)
						setError("")
					}}
				/>
			</div>
			<div className="space-y-1.5">
				<label htmlFor="review-categories" className="text-sm font-medium">
					Categories
				</label>
				<TagInput
					id="review-categories"
					value={categoryList}
					maxTags={100}
					disabled={disabled}
					placeholder="Add a category"
					onValueChange={(value) => {
						setCategoryList(value)
						setError("")
					}}
				/>
			</div>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button type="submit" size="sm" disabled={disabled} className="max-lg:min-h-11">
					<Check />
					Stage changes
				</Button>
				<Button type="button" variant="ghost" size="sm" className="max-lg:min-h-11" onClick={() => setEditing(false)}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export function ReviewVariantEditor({
	file,
	variant,
	originalVariant,
	dropped,
	changed,
	disabled,
	proposal = false,
	onRetag,
	onDrop,
	onUndo,
}: {
	file: string
	variant: SubmissionVariant | null
	originalVariant: SubmissionVariant | null
	dropped: boolean
	changed: boolean
	disabled: boolean
	proposal?: boolean
	onRetag: (variant: SubmissionVariant) => boolean
	onDrop: () => void
	onUndo: () => void
}) {
	const [custom, setCustom] = useState(false)
	const [name, setName] = useState(variant?.startsWith("custom:") ? variant.slice(7) : "")
	const [error, setError] = useState("")
	if (dropped)
		return (
			<Button variant="outline" size="sm" className="w-full max-lg:min-h-11" disabled={disabled} onClick={onUndo}>
				<RotateCcw />
				Restore Variant
			</Button>
		)
	if (!variant || !originalVariant)
		return <p className="text-xs text-muted-foreground">Resolve this Asset's label before applying Variant fix-ups.</p>
	if (originalVariant === "base" && !proposal)
		return <p className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">Base is required and cannot be dropped.</p>
	return (
		<div className="space-y-2 rounded-md bg-muted/50 p-2.5">
			<label htmlFor={`review-kind-${file}`} className="block text-xs font-medium">
				Variant kind
			</label>
			<select
				id={`review-kind-${file}`}
				disabled={disabled}
				value={custom ? "custom" : variant}
				className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 max-lg:min-h-11"
				onChange={(event) => {
					if (event.target.value === "custom") {
						setCustom(true)
						return
					}
					setCustom(false)
					setError("")
					if (!onRetag(event.target.value as SubmissionVariant))
						setError("That slot is unavailable. Choose another kind or drop its optional Variant first.")
				}}
			>
				{SUBMISSION_VARIANTS.filter((kind) => proposal || kind !== "base").map((kind) => (
					<option key={kind} value={kind}>
						{variantKind(kind).label}
					</option>
				))}
				{variant.startsWith("custom:") && <option value={variant}>{variantKind(variant).label} (Custom)</option>}
				<option value="custom">Custom…</option>
			</select>
			{custom && (
				<form
					className="space-y-2"
					onSubmit={(event) => {
						event.preventDefault()
						const invalid = customVariantNameError(name)
						if (invalid) {
							setError(invalid)
							return
						}
						if (onRetag(`custom:${name}`)) setCustom(false)
						else setError("That slot is unavailable. Choose another name or drop its optional Variant first.")
					}}
				>
					<label htmlFor={`review-custom-${file}`} className="text-xs font-medium">
						Custom variant name
					</label>
					<Input
						id={`review-custom-${file}`}
						disabled={disabled}
						value={name}
						onChange={(event) => {
							setName(event.target.value)
							setError("")
						}}
						placeholder="animated"
						maxLength={32}
						className="h-9 max-lg:min-h-11"
					/>
					<Button type="submit" size="sm" disabled={disabled} className="w-full max-lg:min-h-11">
						Stage kind
					</Button>
				</form>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-1">
				<Button
					variant="ghost"
					size="sm"
					disabled={disabled}
					className="min-w-0 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive max-lg:min-h-11"
					onClick={onDrop}
				>
					<Trash2 />
					Drop <Kbd>D</Kbd>
				</Button>
				{changed && (
					<Button variant="ghost" size="sm" disabled={disabled} className="max-lg:min-h-11" onClick={onUndo}>
						Undo kind
					</Button>
				)}
			</div>
		</div>
	)
}

export function ReviewFixupSummary({
	changes,
	onUndo,
	disabled = false,
}: {
	changes: { key: string; text: string }[]
	onUndo?: (key: string) => void
	disabled?: boolean
}) {
	if (!changes.length) return null
	return (
		<section aria-label="Staged fix-ups" className="space-y-2 rounded-lg border border-l-2 border-l-primary bg-primary/5 p-3">
			<p className="flex items-center gap-2 text-sm font-semibold">
				<Wand2 className="size-4 text-primary" />
				Staged fix-ups · {changes.length}
			</p>
			<p className="text-xs text-muted-foreground">
				Saved with your decision and listed in the contributor's message. File bytes are unchanged.
			</p>
			<ul className="divide-y">
				{changes.map((change) => (
					<li key={change.key} className="flex min-w-0 items-center gap-2 py-1.5 text-sm">
						<span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{change.text}</span>
						{onUndo && (
							<Button
								variant="ghost"
								size="icon"
								className="size-8 shrink-0 max-lg:size-11"
								aria-label={`Undo ${change.text}`}
								disabled={disabled}
								onClick={() => onUndo(change.key)}
							>
								<RotateCcw className="size-4" />
							</Button>
						)}
					</li>
				))}
			</ul>
		</section>
	)
}
