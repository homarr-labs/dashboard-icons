"use client"
import { RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ReviewFixups } from "@/lib/dashboard/types"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"

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
			className="mt-3 space-y-2"
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
				className="font-mono"
			/>
			{error && (
				<p role="alert" id="review-rename-error" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button type="submit" variant="secondary">
					Stage rename
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel}>
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
	const [aliasText, setAliasText] = useState(aliases.join(", "))
	const [categoryText, setCategoryText] = useState(categories.join(", "))
	const [error, setError] = useState("")
	const disclosure = useRef<HTMLDetailsElement>(null)
	return (
		<details ref={disclosure} className="rounded-lg bg-muted/40">
			<summary className="min-h-11 cursor-pointer rounded-lg p-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
				Edit aliases & categories
			</summary>
			<form
				className="space-y-3 px-3 pb-3"
				onSubmit={(event) => {
					event.preventDefault()
					const split = (value: string) => [
						...new Set(
							value
								.split(",")
								.map((entry) => entry.trim())
								.filter(Boolean),
						),
					]
					const next = { aliases: split(aliasText), categories: split(categoryText) }
					if (Object.values(next).some((entries) => entries.length > 100 || entries.some((entry) => entry.length > 200))) {
						setError("Use up to 100 values per field, each at most 200 characters.")
						return
					}
					if (onStage(next) && disclosure.current) disclosure.current.open = false
				}}
			>
				<p className="text-sm text-muted-foreground">Separate values with commas. Leave a field empty to clear it.</p>
				<label htmlFor="review-aliases" className="block space-y-2 text-sm font-medium">
					Aliases
					<Textarea
						id="review-aliases"
						rows={2}
						disabled={disabled}
						value={aliasText}
						onChange={(event) => {
							setAliasText(event.target.value)
							setError("")
						}}
					/>
				</label>
				<label htmlFor="review-categories" className="block space-y-2 text-sm font-medium">
					Categories
					<Textarea
						id="review-categories"
						rows={2}
						disabled={disabled}
						value={categoryText}
						onChange={(event) => {
							setCategoryText(event.target.value)
							setError("")
						}}
					/>
				</label>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" variant="secondary" disabled={disabled}>
					Stage metadata
				</Button>
			</form>
		</details>
	)
}

export function ReviewVariantEditor({
	file,
	variant,
	originalVariant,
	dropped,
	changed,
	disabled,
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
	onRetag: (variant: SubmissionVariant) => boolean
	onDrop: () => void
	onUndo: () => void
}) {
	const [custom, setCustom] = useState(false)
	const [name, setName] = useState(variant?.startsWith("custom:") ? variant.slice(7) : "")
	const [error, setError] = useState("")
	if (dropped)
		return (
			<Button variant="outline" className="w-full" disabled={disabled} onClick={onUndo}>
				<RotateCcw className="size-4" />
				Restore Variant
			</Button>
		)
	if (!variant || !originalVariant)
		return <p className="text-xs text-muted-foreground">Resolve this Asset's label before applying Variant fix-ups.</p>
	if (originalVariant === "base") return <p className="text-xs leading-5 text-muted-foreground">Base is required and cannot be dropped.</p>
	return (
		<div className="space-y-2 border-t pt-2">
			<label htmlFor={`review-kind-${file}`} className="block text-xs font-medium">
				Variant kind
			</label>
			<select
				id={`review-kind-${file}`}
				disabled={disabled}
				value={custom ? "custom" : variant}
				className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
				{SUBMISSION_VARIANTS.filter((kind) => kind !== "base").map((kind) => (
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
					/>
					<Button type="submit" variant="secondary" disabled={disabled} className="w-full">
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
				<Button variant="ghost" disabled={disabled} className="min-w-0 flex-1 text-destructive hover:text-destructive" onClick={onDrop}>
					<Trash2 className="size-4" />
					Drop <kbd className="text-xs">D</kbd>
				</Button>
				{changed && (
					<Button variant="ghost" disabled={disabled} onClick={onUndo}>
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
		<section aria-label="Staged fix-ups" className="space-y-2 rounded-lg bg-muted/50 p-3">
			<p className="text-sm font-medium">Staged fix-ups · {changes.length}</p>
			<p className="text-xs leading-5 text-muted-foreground">
				Saved with your decision and listed in the contributor's message. File bytes are unchanged.
			</p>
			<ul className="divide-y divide-border/60">
				{changes.map((change) => (
					<li key={change.key} className="flex min-w-0 items-start gap-2 py-2 text-sm">
						<span className="min-w-0 flex-1 py-2 [overflow-wrap:anywhere]">{change.text}</span>
						{onUndo && (
							<Button
								variant="ghost"
								size="icon"
								className="size-11 shrink-0"
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
