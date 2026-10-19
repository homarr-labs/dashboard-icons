"use client"
// PROTOTYPE reference primitives: state hook, background-correct previews, slot tile, custom-variant field, existing-icon picker, nudges, status pill.
import { AlertTriangle, CircleAlert, Info, Plus, Search, Trash2, Upload, X } from "lucide-react"
import { type DragEvent, type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	type Action,
	addFilesAuto,
	type Bg,
	bgForKey,
	bgLabel,
	CATEGORIES,
	CUSTOM_SUGGESTIONS,
	type EditDraft,
	EXISTING,
	type ExistingIcon,
	type editPayload,
	emptyEdit,
	existingLabel,
	fileTypeFiles,
	kioskLightFile,
	type Mode,
	type Nudge,
	type newPayload,
	newSubmission,
	plexAmpFile,
	putVariant,
	resetMocks,
	type Subs,
	sanitizeSlug,
	selfHostFiles,
	sonarr4kFile,
	startEdit,
	targetFilename,
	transparentKioskFile,
	validateCustomName,
} from "./mock"

export const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export type Result =
	| { kind: "new"; payload: ReturnType<typeof newPayload> }
	| { kind: "edit"; payload: NonNullable<ReturnType<typeof editPayload>>; existing: ExistingIcon }

export function usePrototype() {
	const [mode, setMode] = useState<Mode>("submit")
	const [subs, setSubs] = useState<Subs>(() => [{ ...newSubmission(), id: "s-initial" }])
	const [edit, setEdit] = useState<EditDraft>(emptyEdit)
	const [selected, setSelected] = useState<string | null>(null)
	const [result, setResult] = useState<Result | null>(null)
	const run = (a: Action) => {
		if (a.kind === "edit") {
			setEdit(startEdit(a.slug, a.carry))
			setMode("edit")
			return
		}
		setSubs(a.fn)
	}
	const openEdit = (slug: string) => {
		setResult(null)
		setEdit(startEdit(slug))
		setMode("edit")
	}
	const loadSubs = (files: File[]) => {
		setResult(null)
		setMode("submit")
		const next = addFilesAuto([newSubmission()], files)
		setSubs(next)
		setSelected(next[0]?.id ?? null)
	}
	const demos = {
		selfHost: () => loadSubs(selfHostFiles()),
		fileTypes: () => loadSubs(fileTypeFiles()),
		plexAmp: () => loadSubs([plexAmpFile()]),
		sonarr4k: () => {
			setResult(null)
			setMode("edit")
			setEdit(putVariant(startEdit("sonarr"), "4k", sonarr4kFile()))
		},
		fixKiosk: () => {
			setResult(null)
			setMode("edit")
			setEdit(putVariant(putVariant(startEdit("immich-kiosk"), "base", transparentKioskFile()), "light", kioskLightFile()))
		},
		reset: () => {
			resetMocks()
			setResult(null)
			setMode("submit")
			setSubs([newSubmission()])
			setEdit(emptyEdit())
			setSelected(null)
		},
	}
	return { mode, setMode, subs, setSubs, edit, setEdit, selected, setSelected, result, setResult, run, openEdit, demos }
}
export type Proto = ReturnType<typeof usePrototype>

export function bgClass(bg: Bg) {
	if (bg === "dark") return "bg-zinc-900"
	if (bg === "light") return "bg-white"
	return "bg-[conic-gradient(#d4d4d8_0_25%,#fafafa_0_50%,#d4d4d8_0_75%,#fafafa_0)] bg-[length:14px_14px]"
}

export function Preview({ src, bg, className, alt = "" }: { src: string; bg: Bg; className?: string; alt?: string }) {
	return (
		<span
			className={cn("flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border p-1.5", bgClass(bg), className)}
			title={bgLabel(bg)}
		>
			{/* biome-ignore lint/performance/noImgElement: prototype blob previews */}
			<img src={src} alt={alt} className="size-full object-contain" />
		</span>
	)
}

export function pickFiles(onFiles: (files: File[]) => void, multiple = true) {
	const input = document.createElement("input")
	input.type = "file"
	input.multiple = multiple
	input.accept = ".svg,.png,image/svg+xml,image/png"
	input.onchange = () => onFiles([...(input.files ?? [])])
	input.click()
}

export function dragFile(fileId: string) {
	return {
		draggable: true,
		onDragStart: (e: DragEvent<HTMLElement>) => {
			e.dataTransfer.setData("text/x-file", fileId)
			e.dataTransfer.effectAllowed = "move"
		},
	}
}

export function useDrop(onFiles: (files: File[]) => void, onFileId?: (id: string) => void) {
	const [active, setActive] = useState(false)
	return {
		active,
		props: {
			onDragOver: (e: DragEvent<HTMLElement>) => {
				e.preventDefault()
				e.stopPropagation()
				setActive(true)
			},
			onDragLeave: () => setActive(false),
			onDrop: (e: DragEvent<HTMLElement>) => {
				e.preventDefault()
				e.stopPropagation()
				setActive(false)
				const id = e.dataTransfer.getData("text/x-file")
				if (id && onFileId) onFileId(id)
				else if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files])
			},
		},
	}
}

export function SlotTile({
	slug,
	slotKey,
	title,
	src,
	sourceName,
	note,
	onFile,
	onClear,
	onFileId,
	dragId,
}: {
	slug: string
	slotKey: string
	title: string
	src?: string
	sourceName?: string
	note?: string
	onFile?: (file: File) => void
	onClear?: () => void
	onFileId?: (id: string) => void
	dragId?: string
}) {
	const bg = bgForKey(slotKey)
	const drop = useDrop((files) => files[0] && onFile?.(files[0]), onFileId)
	const target = targetFilename(slug, slotKey)
	let label = `Choose a file for ${title}`
	if (src) label = `Replace ${title} (${sourceName})`
	return (
		<div
			className={cn(
				"overflow-hidden rounded-lg border bg-background transition-shadow motion-reduce:transition-none",
				drop.active && "ring-2 ring-primary",
			)}
		>
			<button
				type="button"
				{...(onFile ? drop.props : {})}
				{...(dragId ? dragFile(dragId) : {})}
				disabled={!onFile}
				aria-label={label}
				title={bgLabel(bg)}
				onClick={() => onFile && pickFiles((f) => f[0] && onFile(f[0]), false)}
				className={cn(
					"flex h-20 w-full items-center justify-center sm:h-24",
					bgClass(bg),
					focusRing,
					"focus-visible:ring-inset focus-visible:ring-offset-0",
				)}
			>
				{src && (
					// biome-ignore lint/performance/noImgElement: prototype blob previews
					<img src={src} alt="" className="size-12 object-contain sm:size-14" />
				)}
				{!src && (
					<span className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
						<Upload className="size-3.5" /> Add
					</span>
				)}
			</button>
			<div className="flex items-start gap-1 px-2.5 py-2">
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium">{title}</div>
					<div className="truncate font-mono text-xs text-muted-foreground" title={target}>
						{target}
					</div>
					{note && <div className="truncate text-xs text-sky-700 dark:text-sky-300">{note}</div>}
				</div>
				{onClear && src && (
					<button
						type="button"
						aria-label={`Remove ${title}`}
						onClick={onClear}
						className={cn(
							"-mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive max-sm:size-11",
							focusRing,
						)}
					>
						<Trash2 className="size-4" />
					</button>
				)}
			</div>
		</div>
	)
}

export function CustomVariantAdder({ slug, taken, onAdd }: { slug: string; taken: string[]; onAdd: (name: string, file: File) => void }) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const clean = sanitizeSlug(name)
	const error = name ? validateCustomName(slug, clean, taken) : null
	const suggestions = CUSTOM_SUGGESTIONS.filter((s) => !taken.includes(s) && s.includes(clean) && s !== clean).slice(0, 8)
	const choose = () => {
		if (error || !clean) return
		pickFiles((files) => {
			if (!files[0]) return
			onAdd(clean, files[0])
			setName("")
			setOpen(false)
		}, false)
	}
	if (!open)
		return (
			<Button variant="outline" size="sm" className="border-dashed max-sm:h-11" onClick={() => setOpen(true)}>
				<Plus /> Add custom variant
			</Button>
		)
	const inputId = `custom-${slug}`
	return (
		<div className="w-full space-y-2 rounded-lg bg-muted/40 p-3">
			<label htmlFor={inputId} className="text-sm font-medium">
				Custom variant name
			</label>
			<div className="flex flex-wrap items-center gap-2">
				<div
					className={cn(
						"flex h-9 min-w-0 flex-1 items-center rounded-md border bg-background px-2 max-sm:h-11",
						error && "border-destructive",
					)}
				>
					<span className="shrink-0 font-mono text-sm text-muted-foreground">{slug || "your-icon"}-</span>
					<input
						id={inputId}
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") choose()
							if (e.key === "Escape") setOpen(false)
						}}
						placeholder="animated"
						aria-invalid={Boolean(error)}
						aria-describedby={`${inputId}-msg`}
						className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
					/>
				</div>
				<Button size="sm" className="max-sm:h-11" onClick={choose} disabled={!clean || Boolean(error)}>
					Choose file
				</Button>
				<Button
					size="icon"
					variant="ghost"
					className="size-9 max-sm:size-11"
					aria-label="Cancel custom variant"
					onClick={() => setOpen(false)}
				>
					<X />
				</Button>
			</div>
			<p
				id={`${inputId}-msg`}
				role={error ? "alert" : undefined}
				className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
			>
				{error ?? (clean ? `Saved as ${targetFilename(slug, clean)}` : "One file per custom variant. Lowercase, hyphens allowed.")}
			</p>
			{suggestions.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-xs text-muted-foreground">Used by others:</span>
					{suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setName(s)}
							className={cn(
								"rounded-md bg-background px-2 py-1 font-mono text-xs ring-1 ring-border hover:bg-muted max-sm:min-h-9",
								focusRing,
							)}
						>
							{s}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

export function CategoryChips({ value, onChange, idPrefix }: { value: string[]; onChange: (v: string[]) => void; idPrefix: string }) {
	return (
		<fieldset className="space-y-1.5">
			<legend className="text-sm font-medium">Categories</legend>
			<div className="flex flex-wrap gap-1.5">
				{CATEGORIES.map((c) => {
					const on = value.includes(c)
					return (
						<button
							key={`${idPrefix}-${c}`}
							type="button"
							aria-pressed={on}
							onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none max-sm:min-h-9",
								focusRing,
								on && "bg-primary text-primary-foreground",
								!on && "bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground",
							)}
						>
							{c.replace(/-/g, " ")}
						</button>
					)
				})}
			</div>
		</fieldset>
	)
}

export function AliasInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id: string }) {
	const [text, setText] = useState("")
	const add = () => {
		const t = text.trim()
		if (t && !value.includes(t)) onChange([...value, t])
		setText("")
	}
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-sm font-medium">
				Aliases <span className="font-normal text-muted-foreground">(other names people search for)</span>
			</label>
			<div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring max-sm:min-h-11">
				{value.map((a) => (
					<span key={a} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
						{a}
						<button
							type="button"
							aria-label={`Remove alias ${a}`}
							onClick={() => onChange(value.filter((x) => x !== a))}
							className={cn("rounded", focusRing)}
						>
							<X className="size-3.5" />
						</button>
					</span>
				))}
				<input
					id={id}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault()
							add()
						}
					}}
					onBlur={add}
					placeholder={value.length ? "" : "Type and press Enter"}
					className="min-w-28 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>
		</div>
	)
}

const nudgeStyle = {
	error: "border-destructive/40 bg-destructive/5 text-foreground",
	warn: "border-amber-500/40 bg-amber-500/5 text-foreground",
	info: "border-sky-500/40 bg-sky-500/5 text-foreground",
}
const nudgeIconStyle = { error: "text-destructive", warn: "text-amber-600 dark:text-amber-400", info: "text-sky-600 dark:text-sky-400" }
const nudgeIcon = { error: CircleAlert, warn: AlertTriangle, info: Info }

export function NudgeList({ nudges, onAction }: { nudges: Nudge[]; onAction: (a: Action) => void }) {
	if (!nudges.length) return null
	return (
		<ul className="space-y-2">
			{nudges.map((n) => {
				const Icon = nudgeIcon[n.level]
				return (
					<li key={n.id} className={cn("rounded-lg border px-3 py-2 text-sm", nudgeStyle[n.level])}>
						<div className="flex gap-2">
							<Icon className={cn("mt-0.5 size-4 shrink-0", nudgeIconStyle[n.level])} aria-hidden />
							<span className="min-w-0 flex-1 text-pretty">{n.text}</span>
						</div>
						{n.actions.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-2 pl-6">
								{n.actions.map((a) => (
									<Button
										key={a.label}
										size="sm"
										variant="outline"
										className="h-8 bg-background max-sm:h-11"
										onClick={() => onAction(a.action)}
									>
										{a.label}
									</Button>
								))}
							</div>
						)}
					</li>
				)
			})}
		</ul>
	)
}

export type PillTone = "awaiting" | "rejected" | "collection" | "new"
const pillStyle: Record<PillTone, string> = {
	awaiting: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
	rejected: "border-destructive/30 bg-destructive/10 text-destructive",
	collection: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
	new: "border-border bg-muted text-foreground/80",
}
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
				pillStyle[tone],
			)}
		>
			<span className="size-1.5 rounded-full bg-current" aria-hidden />
			{children}
		</span>
	)
}
export function pillFor(e: ExistingIcon): { tone: PillTone; label: string } {
	if (e.source === "collection") return { tone: "collection", label: "In the collection" }
	if (e.status === "rejected") return { tone: "rejected", label: "Rejected" }
	return { tone: "awaiting", label: `Awaiting review${(e.round ?? 1) > 1 ? ` · round ${e.round}` : ""}` }
}

export function ExistingPicker({ onPick }: { onPick: (slug: string) => void }) {
	const [q, setQ] = useState("")
	const list = EXISTING.filter((e) => e.slug.includes(sanitizeSlug(q)))
	return (
		<div className="space-y-3">
			<label htmlFor="edit-search" className="sr-only">
				Search icons
			</label>
			<div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 focus-within:ring-2 focus-within:ring-ring max-sm:h-11">
				<Search className="size-4 text-muted-foreground" aria-hidden />
				<input
					id="edit-search"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search icons and submissions awaiting review"
					className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>
			<ul className="grid gap-2 sm:grid-cols-2">
				{list.map((e) => (
					<li key={e.slug}>
						<button
							type="button"
							onClick={() => onPick(e.slug)}
							className={cn(
								"flex min-h-14 w-full items-center gap-3 rounded-lg border bg-background p-2 text-left hover:bg-muted/60",
								focusRing,
							)}
						>
							<Preview src={e.variants[0].url} bg="checker" className="size-10" />
							<span className="min-w-0 flex-1">
								<span className="block truncate font-mono text-sm font-semibold">{e.slug}</span>
								<span className="block truncate text-xs text-muted-foreground">{existingLabel(e)}</span>
							</span>
						</button>
					</li>
				))}
				{list.length === 0 && (
					<li className="text-sm text-muted-foreground">No icon matches “{q}”. Check the spelling, or submit it as a new icon.</li>
				)}
			</ul>
		</div>
	)
}

export function PayloadJson({ payload, open }: { payload: unknown; open?: boolean }) {
	return (
		<details open={open} className="group text-sm">
			<summary className={cn("cursor-pointer rounded text-muted-foreground hover:text-foreground", focusRing)}>
				Payload sent to the server
			</summary>
			<pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-5">
				{JSON.stringify(payload, null, 2)}
			</pre>
		</details>
	)
}
