"use client"
// PROTOTYPE pass 2: shared state hook (3 modes), background-correct previews, slot tile, custom-variant combobox, existing-icon picker, nudges, payload views, demo buttons.
import {
	AlertTriangle,
	Braces,
	CircleAlert,
	FileStack,
	Info,
	ListTree,
	Plus,
	Search,
	Send,
	Sparkles,
	Trash2,
	Upload,
	X,
} from "lucide-react"
import { type DragEvent, type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
	type Action,
	addFilesAuto,
	addFilesFlat,
	type Bg,
	bgForKey,
	bgLabel,
	CATEGORIES,
	CUSTOM_SUGGESTIONS,
	demoFile,
	diffLines,
	EXISTING,
	type ExistingIcon,
	emptyModify,
	existingLabel,
	fileTypeFiles,
	findExisting,
	type Mode,
	type ModifyDraft,
	modifyPayload,
	type Nudge,
	newPayload,
	newSubmission,
	putVariant,
	STUB_USER,
	type Subs,
	sanitizeSlug,
	selfHostFiles,
	sonarr4kFile,
	startModify,
	targetFilename,
	validateCustomName,
} from "./mock"

export const MODES: { id: Mode; title: string; desc: string }[] = [
	{ id: "one", title: "Submit one", desc: "A new icon with its variants" },
	{ id: "modify", title: "Modify one", desc: "Add, replace or remove variants of an existing icon" },
	{ id: "many", title: "Submit many", desc: "Several new icons at once, each its own submission" },
]

export function usePrototype() {
	const [mode, setMode] = useState<Mode>("one")
	const [one, setOne] = useState<Subs>(() => [newSubmission()])
	const [many, setMany] = useState<Subs>([])
	const [modify, setModify] = useState<ModifyDraft>(emptyModify)
	const run = (a: Action, target: "one" | "many") => {
		if (a.kind === "modify") {
			setModify(startModify(a.slug, a.carry))
			setMode("modify")
			return
		}
		if (target === "one") setOne(a.fn)
		else setMany(a.fn)
	}
	const demos = {
		selfHost: (flat = false) => {
			setMode("many")
			if (flat) setMany(addFilesFlat([], selfHostFiles()))
			else setMany(addFilesAuto([], selfHostFiles()))
		},
		fileTypes: () => {
			setMode("many")
			setMany(addFilesAuto([], fileTypeFiles()))
		},
		sonarr4k: () => {
			setMode("modify")
			setModify(putVariant(startModify("sonarr"), "4k", sonarr4kFile()))
		},
		oneLooksLikeVariant: () => {
			setMode("one")
			setOne(addFilesAuto([newSubmission("plex-amp")], [demoFile("plex-amp.svg")]).filter((s) => s.files.length))
		},
		fixRejected: () => {
			setMode("modify")
			setModify(startModify("immich-kiosk"))
		},
		reset: () => {
			setOne([newSubmission()])
			setMany([])
			setModify(emptyModify())
		},
	}
	return { mode, setMode, one, setOne, many, setMany, modify, setModify, run, demos }
}
export type Proto = ReturnType<typeof usePrototype>

export function bgClass(bg: Bg) {
	if (bg === "dark") return "bg-zinc-900"
	if (bg === "light") return "bg-white"
	return "bg-[conic-gradient(#d4d4d8_0_25%,#fafafa_0_50%,#d4d4d8_0_75%,#fafafa_0)] bg-[length:12px_12px]"
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

export function ProtoNotice() {
	return (
		<p className="text-[11px] text-muted-foreground">
			Prototype · signed in as <span className="font-mono">{STUB_USER.username}</span> (stub) · nothing is saved
		</p>
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

export type TileState = "add" | "replace" | "remove" | "keep" | null

export function SlotTile({
	slug,
	slotKey,
	title,
	hint,
	src,
	sourceName,
	onFile,
	onClear,
	onFileId,
	state,
	compact,
	dragId,
}: {
	slug: string
	slotKey: string
	title: string
	hint?: string
	src?: string
	sourceName?: string
	onFile?: (file: File) => void
	onClear?: () => void
	onFileId?: (id: string) => void
	state?: TileState
	compact?: boolean
	dragId?: string
}) {
	const bg = bgForKey(slotKey)
	const drop = useDrop((files) => files[0] && onFile?.(files[0]), onFileId)
	const removed = state === "remove"
	return (
		<div
			className={cn(
				"group/tile relative overflow-hidden rounded-lg border bg-background",
				drop.active && "ring-2 ring-primary",
				state === "add" && "border-emerald-500/60",
				state === "replace" && "border-amber-500/60",
				removed && "border-red-500/60",
			)}
		>
			<button
				type="button"
				{...(onFile ? drop.props : {})}
				{...(dragId ? dragFile(dragId) : {})}
				disabled={!onFile}
				onClick={() => onFile && pickFiles((f) => f[0] && onFile(f[0]), false)}
				className={cn("flex w-full items-center justify-center", compact ? "h-14" : "h-24", bgClass(bg), removed && "opacity-30 grayscale")}
				title={`${title} · ${bgLabel(bg)}`}
			>
				{src && (
					// biome-ignore lint/performance/noImgElement: prototype blob previews
					<img src={src} alt={sourceName ?? title} className={cn("object-contain", compact ? "size-10" : "size-16")} />
				)}
				{!src && onFile && (
					<span className={cn("flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground")}>
						<Upload className="size-3" /> {compact ? "" : "Drop or click"}
					</span>
				)}
			</button>
			{state && state !== "keep" && (
				<span
					className={cn("absolute top-1 left-1 rounded px-1 text-[9px] font-semibold text-white", {
						"bg-emerald-600": state === "add",
						"bg-amber-600": state === "replace",
						"bg-red-600": removed,
					})}
				>
					{state === "add" && "+ added"}
					{state === "replace" && "~ replaced"}
					{removed && "− removed"}
				</span>
			)}
			{onClear && src && (
				<button
					type="button"
					aria-label={`Clear ${title}`}
					onClick={onClear}
					className="absolute top-1 right-1 hidden rounded bg-background/90 p-0.5 shadow group-hover/tile:block"
				>
					<Trash2 className="size-3" />
				</button>
			)}
			<div className={cn("space-y-0.5", compact ? "px-1.5 py-1" : "p-2")}>
				<div className={cn("font-medium", compact ? "text-[11px]" : "text-sm")}>{title}</div>
				{hint && !compact && <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p>}
				<p className={cn("truncate font-mono text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")} title={sourceName}>
					{targetFilename(slug, slotKey)}
				</p>
			</div>
		</div>
	)
}

export function CustomVariantAdder({
	slug,
	taken,
	onAdd,
	compact,
}: {
	slug: string
	taken: string[]
	onAdd: (name: string, file: File) => void
	compact?: boolean
}) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [focus, setFocus] = useState(false)
	const clean = sanitizeSlug(name)
	const error = name ? validateCustomName(slug, clean, taken) : null
	const suggestions = CUSTOM_SUGGESTIONS.filter((s) => !taken.includes(s) && s.includes(clean))
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
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={cn(
					"inline-flex items-center gap-1 rounded-md border border-dashed px-2 text-xs text-muted-foreground hover:text-foreground",
					compact ? "h-7" : "h-9",
				)}
			>
				<Plus className="size-3.5" /> Add custom variant
			</button>
		)
	return (
		<div className="relative w-full max-w-sm space-y-1">
			<div className="flex items-center gap-1">
				<span className="font-mono text-xs text-muted-foreground">{slug || "<slug>"}-</span>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onFocus={() => setFocus(true)}
					onBlur={() => setTimeout(() => setFocus(false), 150)}
					onKeyDown={(e) => {
						if (e.key === "Enter") choose()
						if (e.key === "Escape") setOpen(false)
					}}
					placeholder="animated, 4k, mono…"
					aria-label="Custom variant name"
					className={cn("h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs", error && "border-red-500")}
				/>
				<Button size="sm" className="h-8" onClick={choose} disabled={!clean || !!error}>
					Choose file
				</Button>
				<Button size="icon" variant="ghost" className="size-8" aria-label="Cancel" onClick={() => setOpen(false)}>
					<X />
				</Button>
			</div>
			{error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
			{!error && clean && <p className="font-mono text-[11px] text-muted-foreground">→ {targetFilename(slug, clean)}</p>}
			{focus && suggestions.length > 0 && (
				<div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
					<p className="px-1.5 pb-1 text-[10px] text-muted-foreground">Used by other contributors</p>
					<div className="flex flex-wrap gap-1">
						{suggestions.map((s) => (
							<button
								key={s}
								type="button"
								onMouseDown={(e) => {
									e.preventDefault()
									setName(s)
								}}
								className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted/70"
							>
								{s}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export function CategoryChips({ value, onChange, compact }: { value: string[]; onChange: (v: string[]) => void; compact?: boolean }) {
	return (
		<div className="flex flex-wrap gap-1">
			{CATEGORIES.map((c) => {
				const on = value.includes(c)
				return (
					<button
						key={c}
						type="button"
						aria-pressed={on}
						onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
						className={cn(
							"rounded px-2 py-0.5 transition-colors",
							compact ? "text-[10px]" : "text-[11px]",
							on && "bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-200",
							!on && "bg-muted text-muted-foreground hover:text-foreground",
						)}
					>
						{c.replace(/-/g, " ")}
					</button>
				)
			})}
		</div>
	)
}

export function AliasInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
	const [text, setText] = useState("")
	const add = () => {
		const t = text.trim()
		if (t && !value.includes(t)) onChange([...value, t])
		setText("")
	}
	return (
		<div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border bg-background px-1.5 py-1">
			{value.map((a) => (
				<span key={a} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 text-[11px]">
					{a}
					<button type="button" aria-label={`Remove ${a}`} onClick={() => onChange(value.filter((x) => x !== a))}>
						<X className="size-3" />
					</button>
				</span>
			))}
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === ",") {
						e.preventDefault()
						add()
					}
				}}
				onBlur={add}
				placeholder="Add alias, Enter"
				aria-label="Add alias"
				className="min-w-24 flex-1 bg-transparent text-xs outline-none"
			/>
		</div>
	)
}

const nudgeStyle = {
	error: "border-red-500/30 bg-red-500/5 text-red-800 dark:text-red-200",
	warn: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
	info: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200",
}
const nudgeIcon = { error: CircleAlert, warn: AlertTriangle, info: Info }

export function NudgeList({ nudges, onAction, compact }: { nudges: Nudge[]; onAction: (a: Action) => void; compact?: boolean }) {
	if (!nudges.length) return null
	return (
		<ul className="space-y-1.5">
			{nudges.map((n) => {
				const Icon = nudgeIcon[n.level]
				return (
					<li
						key={n.id}
						className={cn(
							"flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5",
							compact ? "text-[11px]" : "text-xs",
							nudgeStyle[n.level],
						)}
					>
						<Icon className="size-3.5 shrink-0" />
						<span className="min-w-0 flex-1">{n.text}</span>
						{n.actions.map((a) => (
							<button
								key={a.label}
								type="button"
								onClick={() => onAction(a.action)}
								className="rounded border border-current/30 bg-background/70 px-2 py-0.5 font-medium hover:bg-background"
							>
								{a.label}
							</button>
						))}
					</li>
				)
			})}
		</ul>
	)
}

export function ExistingPicker({ value, onPick }: { value: string | null; onPick: (slug: string) => void }) {
	const [q, setQ] = useState("")
	const list = EXISTING.filter((e) => e.slug.includes(sanitizeSlug(q)))
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 rounded-md border bg-background px-2">
				<Search className="size-4 text-muted-foreground" />
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search icons and community submissions…"
					aria-label="Search existing icons"
					className="h-9 flex-1 bg-transparent text-sm outline-none"
				/>
			</div>
			<ul className="grid gap-1 sm:grid-cols-2">
				{list.map((e) => (
					<li key={e.slug}>
						<button
							type="button"
							onClick={() => onPick(e.slug)}
							className={cn(
								"flex w-full items-center gap-2 rounded-md border p-1.5 text-left hover:bg-muted",
								value === e.slug && "border-primary bg-primary/5",
							)}
						>
							<Preview src={e.variants[0].url} bg="checker" className="size-9" />
							<span className="min-w-0 flex-1">
								<span className="block truncate font-mono text-sm font-semibold">{e.slug}</span>
								<span className="block text-[11px] text-muted-foreground">
									{existingLabel(e)} · {e.variants.length} variant(s)
								</span>
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	)
}

export function ExistingHeader({ e }: { e: ExistingIcon }) {
	return (
		<div className="flex items-center gap-3">
			<Preview src={e.variants[0].url} bg="checker" className="size-12" />
			<div>
				<div className="font-mono text-lg font-semibold">{e.slug}</div>
				<div className="text-xs text-muted-foreground">{existingLabel(e)}</div>
			</div>
		</div>
	)
}

function JsonToggle({ title, json, children }: { title: ReactNode; json: unknown; children: ReactNode }) {
	const [raw, setRaw] = useState(false)
	return (
		<div className="text-xs">
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="font-medium">{title}</span>
				<button
					type="button"
					onClick={() => setRaw(!raw)}
					className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
				>
					{raw && <ListTree className="size-3" />}
					{!raw && <Braces className="size-3" />}
					{raw ? "Tree" : "JSON"}
				</button>
			</div>
			{raw && (
				<pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-4">
					{JSON.stringify(json, null, 2)}
				</pre>
			)}
			{!raw && children}
		</div>
	)
}

export function NewPayloadView({ subs }: { subs: Subs }) {
	const payload = newPayload(subs)
	return (
		<JsonToggle json={payload} title={`${subs.length} independent submission${subs.length === 1 ? "" : "s"}`}>
			<ol className="space-y-2 font-mono text-[11px]">
				{subs.length === 0 && <li className="font-sans text-muted-foreground">Nothing yet.</li>}
				{payload.map((p) => (
					<li key={p.submission}>
						<div>
							<span className="text-muted-foreground">#{p.submission}</span> <span className="font-semibold">{p.slug || "(no slug)"}</span>
						</div>
						<ul className="ml-3 border-l pl-2">
							{p.variants.map((v) => (
								<li key={v.target + v.source} className="leading-5">
									<span className={cn(v.custom ? "text-violet-600 dark:text-violet-400" : "text-sky-600 dark:text-sky-400")}>
										{v.variant}
									</span>{" "}
									<span className="text-muted-foreground">{v.source}</span> → {v.target}
								</li>
							))}
							{p.variants.length === 0 && <li className="font-sans text-muted-foreground">no files</li>}
						</ul>
					</li>
				))}
			</ol>
		</JsonToggle>
	)
}

export function DiffView({ md }: { md: ModifyDraft }) {
	const lines = diffLines(md)
	return (
		<JsonToggle json={modifyPayload(md)} title={md.slug ? `Delta for ${md.slug}` : "Pick an icon"}>
			<ul className="space-y-0.5 font-mono text-[11px]">
				{md.slug && lines.length === 0 && <li className="font-sans text-muted-foreground">No changes yet.</li>}
				{lines.map((l, i) => (
					<li
						key={i}
						className={cn("rounded px-1.5 py-0.5", {
							"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300": l.sign === "+",
							"bg-amber-500/10 text-amber-700 dark:text-amber-300": l.sign === "~",
							"bg-red-500/10 text-red-700 dark:text-red-300": l.sign === "−",
						})}
					>
						{l.sign} {l.text}
					</li>
				))}
			</ul>
		</JsonToggle>
	)
}

export function SubmitButton({
	payload,
	label,
	blocking,
	className,
}: {
	payload: unknown
	label: string
	blocking: number
	className?: string
}) {
	const [open, setOpen] = useState(false)
	return (
		<>
			<Button className={className} onClick={() => setOpen(true)} disabled={!payload}>
				<Send /> {label}
				{blocking > 0 && <span className="rounded bg-background/20 px-1 text-[10px]">{blocking} to fix</span>}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Stub submit: final payload</DialogTitle>
						<DialogDescription>
							{blocking > 0 ? `${blocking} blocking issue(s) would stop this in the real form.` : "Nothing is sent; this is what would be."}
						</DialogDescription>
					</DialogHeader>
					<pre className="overflow-auto rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-4">{JSON.stringify(payload, null, 2)}</pre>
				</DialogContent>
			</Dialog>
		</>
	)
}

export function DemoButtons({ p, flatSelfHost, className }: { p: Proto; flatSelfHost?: boolean; className?: string }) {
	return (
		<div className={cn("flex flex-wrap items-center gap-1.5", className)}>
			<Button size="sm" variant="outline" onClick={() => p.demos.selfHost(flatSelfHost)}>
				<Sparkles /> Load self-host example
			</Button>
			<Button size="sm" variant="outline" onClick={p.demos.fileTypes}>
				<FileStack /> Load file-types example
			</Button>
			<Button size="sm" variant="outline" onClick={p.demos.sonarr4k}>
				<Plus /> Add 4k to sonarr
			</Button>
			<Button size="sm" variant="outline" onClick={p.demos.oneLooksLikeVariant}>
				Try plex-amp as new
			</Button>
			<Button size="sm" variant="ghost" onClick={p.demos.reset}>
				Reset
			</Button>
		</div>
	)
}

export function errorsOf(nudges: Nudge[]) {
	return nudges.filter((n) => n.level === "error").length
}

export function useExisting(slug: string | null) {
	return findExisting(slug ?? "")
}
