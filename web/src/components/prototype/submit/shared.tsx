"use client"
// PROTOTYPE: small shared bits (state hook, previews, payload view, demo buttons, nudges, metadata editor) for the /submit variants.
import { AlertTriangle, Braces, CircleAlert, FileStack, Info, ListTree, Send, Sparkles, X } from "lucide-react"
import { type DragEvent, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
	addFiles,
	buildPayload,
	CATEGORIES,
	type Draft,
	type DraftVariant,
	emptyDraft,
	fileTypeFiles,
	formLabel,
	type IconMeta,
	type Nudge,
	nudges,
	STUB_USER,
	SUGGESTED_CUSTOM_FORMS,
	sanitizeSlug,
	selfHostFiles,
	TONES,
	type Tone,
	targetFilename,
	toneShort,
	variantKey,
	variantLabel,
} from "./mock"

export function useDraft() {
	const [draft, setDraft] = useState<Draft>(emptyDraft)
	const apply = useCallback((fn: (d: Draft) => Draft) => setDraft((d) => fn(d)), [])
	return { draft, apply, setDraft }
}

export function demoDraft(kind: "self-host" | "file-types", group = true) {
	const files = kind === "self-host" ? selfHostFiles() : fileTypeFiles()
	const d = addFiles(emptyDraft(), files, group)
	if (kind === "file-types") return { ...d, shared: { ...d.shared, categories: ["utility"] } }
	return d
}

export function bgFor(tone: Tone) {
	if (tone === "light") return "bg-zinc-900"
	if (tone === "dark") return "bg-white"
	return "bg-[linear-gradient(135deg,#ffffff_50%,#18181b_50%)]"
}

export function VariantThumb({ variant, className }: { variant: Pick<DraftVariant, "url" | "tone" | "file">; className?: string }) {
	return (
		<span className={cn("flex size-12 shrink-0 items-center justify-center rounded-md border p-1.5", bgFor(variant.tone), className)}>
			{/* biome-ignore lint/performance/noImgElement: prototype blob previews */}
			<img src={variant.url} alt={variant.file.name} className="size-full object-contain" />
		</span>
	)
}

export function DemoButtons({
	onLoad,
	onReset,
	size = "sm",
}: {
	onLoad: (kind: "self-host" | "file-types") => void
	onReset: () => void
	size?: "sm" | "default"
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button size={size} variant="outline" onClick={() => onLoad("self-host")}>
				<Sparkles /> Load self-host example
			</Button>
			<Button size={size} variant="outline" onClick={() => onLoad("file-types")}>
				<FileStack /> Load file-types example
			</Button>
			<Button size={size} variant="ghost" onClick={onReset}>
				Reset
			</Button>
		</div>
	)
}

export function ProtoNotice() {
	return (
		<p className="text-[11px] text-muted-foreground">
			Prototype · signed in as <span className="font-mono">{STUB_USER.username}</span> (stub) · nothing is saved
		</p>
	)
}

const nudgeStyle = {
	error: "border-red-500/30 bg-red-500/5 text-red-800 dark:text-red-200",
	warn: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
	info: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200",
}
const nudgeIcon = { error: CircleAlert, warn: AlertTriangle, info: Info }

export function NudgeList({
	draft,
	apply,
	iconId,
	compact,
}: {
	draft: Draft
	apply: (fn: (d: Draft) => Draft) => void
	iconId?: string
	compact?: boolean
}) {
	const list = nudges(draft).filter((n) => !iconId || n.iconId === iconId)
	if (!list.length) return null
	return (
		<ul className="space-y-1.5">
			{list.map((n) => (
				<NudgeItem key={n.id} nudge={n} apply={apply} compact={compact} />
			))}
		</ul>
	)
}

export function NudgeItem({ nudge, apply, compact }: { nudge: Nudge; apply: (fn: (d: Draft) => Draft) => void; compact?: boolean }) {
	const Icon = nudgeIcon[nudge.level]
	return (
		<li
			className={cn(
				"flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5",
				compact ? "text-[11px]" : "text-xs",
				nudgeStyle[nudge.level],
			)}
		>
			<Icon className="size-3.5 shrink-0" />
			<span className="min-w-0 flex-1">{nudge.text}</span>
			{nudge.actions.map((a) => (
				<button
					key={a.label}
					type="button"
					onClick={() => apply(a.apply)}
					className="rounded border border-current/30 bg-background/70 px-2 py-0.5 font-medium hover:bg-background"
				>
					{a.label}
				</button>
			))}
		</li>
	)
}

export function PayloadTree({ draft, className }: { draft: Draft; className?: string }) {
	const [json, setJson] = useState(false)
	const payload = buildPayload(draft)
	const variantCount = draft.icons.reduce((n, i) => n + i.variants.length, 0)
	return (
		<div className={cn("text-xs", className)}>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="font-medium">
					1 Submission · {draft.icons.length} icon{draft.icons.length === 1 ? "" : "s"} · {variantCount} file{variantCount === 1 ? "" : "s"}
				</span>
				<button
					type="button"
					onClick={() => setJson(!json)}
					className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
				>
					{json ? <ListTree className="size-3" /> : <Braces className="size-3" />}
					{json ? "Tree" : "JSON"}
				</button>
			</div>
			{json && (
				<pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-4">
					{JSON.stringify(payload, null, 2)}
				</pre>
			)}
			{!json && (
				<ul className="space-y-2 font-mono text-[11px]">
					{draft.icons.length === 0 && <li className="font-sans text-muted-foreground">Empty. Drop files or load an example.</li>}
					{draft.icons.map((icon, idx) => (
						<li key={icon.id}>
							<div className="flex items-center gap-1.5">
								<span className="text-muted-foreground">Icon</span>
								<span className="font-semibold">{icon.slug || "(unnamed)"}</span>
								<span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">{payload.icons[idx].intent}</span>
							</div>
							<ul className="ml-3 border-l pl-2">
								{icon.variants.map((v) => (
									<li key={v.id} className="flex flex-wrap gap-x-1.5 leading-5">
										<span className="text-violet-600 dark:text-violet-400">{variantKey(v.form, v.tone)}</span>
										<span className="text-muted-foreground">{v.file.name}</span>
										<span>→ {targetFilename(icon.slug, v)}</span>
									</li>
								))}
								{icon.variants.length === 0 && <li className="font-sans text-muted-foreground">no files</li>}
							</ul>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

export function SubmitButton({ draft, className, label = "Submit" }: { draft: Draft; className?: string; label?: string }) {
	const [open, setOpen] = useState(false)
	const blocking = nudges(draft).filter((n) => n.level === "error").length
	return (
		<>
			<Button className={className} onClick={() => setOpen(true)} disabled={!draft.icons.length}>
				<Send /> {label}
				{blocking > 0 && <span className="rounded bg-background/20 px-1 text-[10px]">{blocking} to fix</span>}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Stub submit: final payload</DialogTitle>
						<DialogDescription>
							{blocking > 0
								? `${blocking} blocking issue(s) would stop this in the real form.`
								: "This is what would be sent as one Submission."}
						</DialogDescription>
					</DialogHeader>
					<pre className="overflow-auto rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-4">
						{JSON.stringify(buildPayload(draft), null, 2)}
					</pre>
				</DialogContent>
			</Dialog>
		</>
	)
}

export function CategoryChips({
	value,
	onChange,
	inherited = [],
}: {
	value: string[]
	onChange: (v: string[]) => void
	inherited?: string[]
}) {
	return (
		<div className="flex flex-wrap gap-1">
			{CATEGORIES.map((c) => {
				const on = value.includes(c)
				const fromShared = inherited.includes(c)
				return (
					<button
						key={c}
						type="button"
						aria-pressed={on}
						onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
						className={cn(
							"rounded px-2 py-0.5 text-[11px] transition-colors",
							on && "bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-200",
							!on &&
								fromShared &&
								"border border-dashed border-emerald-500/50 bg-emerald-500/10 text-emerald-700/80 dark:text-emerald-300/80",
							!on && !fromShared && "bg-muted text-muted-foreground hover:text-foreground",
						)}
						title={fromShared && !on ? "Inherited from the submission" : undefined}
					>
						{c.replace(/-/g, " ")}
					</button>
				)
			})}
		</div>
	)
}

export function AliasInput({
	value,
	onChange,
	placeholder = "Add alias, Enter",
}: {
	value: string[]
	onChange: (v: string[]) => void
	placeholder?: string
}) {
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
				placeholder={placeholder}
				className="min-w-24 flex-1 bg-transparent text-xs outline-none"
			/>
		</div>
	)
}

export function MetaEditor({
	meta,
	onChange,
	inherited,
}: {
	meta: IconMeta
	onChange: (patch: Partial<IconMeta>) => void
	inherited?: IconMeta
}) {
	return (
		<div className="space-y-2">
			<AliasInput value={meta.aliases} onChange={(aliases) => onChange({ aliases })} />
			<CategoryChips value={meta.categories} onChange={(categories) => onChange({ categories })} inherited={inherited?.categories} />
			<textarea
				value={meta.description}
				onChange={(e) => onChange({ description: e.target.value })}
				placeholder={inherited?.description || "Description (optional)"}
				rows={2}
				className="w-full resize-none rounded-md border bg-background px-2 py-1 text-xs"
			/>
		</div>
	)
}

export function KindSelect({
	forms,
	value,
	onChange,
	className,
}: {
	forms: string[]
	value: { form: string; tone: Tone }
	onChange: (form: string, tone: Tone) => void
	className?: string
}) {
	const all = [...new Set(["icon", "wordmark", ...forms, ...SUGGESTED_CUSTOM_FORMS])]
	return (
		<select
			aria-label="Variant kind"
			value={`${value.form}|${value.tone}`}
			onChange={(e) => {
				if (e.target.value === "__custom") {
					const name = sanitizeSlug(window.prompt("Custom variant form (e.g. animated, mono, outline, 3d)") || "")
					if (name) onChange(name, value.tone)
					return
				}
				const [f, t] = e.target.value.split("|")
				onChange(f, t as Tone)
			}}
			className={cn("h-7 rounded border bg-background px-1 text-[11px]", className)}
		>
			{all.map((f) => (
				<optgroup key={f} label={formLabel(f)}>
					{TONES.map((t) => (
						<option key={t} value={`${f}|${t}`}>
							{variantLabel({ form: f, tone: t })} · {toneShort(t)}
						</option>
					))}
				</optgroup>
			))}
			<option value="__custom">+ Custom form…</option>
		</select>
	)
}

export function dragVariant(vid: string) {
	return {
		draggable: true,
		onDragStart: (e: DragEvent<HTMLElement>) => {
			e.dataTransfer.setData("text/x-variant", vid)
			e.dataTransfer.effectAllowed = "move"
		},
	}
}

export function useDrop(onVariant: (vid: string) => void, onFiles: (files: File[]) => void) {
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
				const vid = e.dataTransfer.getData("text/x-variant")
				if (vid) onVariant(vid)
				else if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files])
			},
		},
	}
}

export function pickFiles(onFiles: (files: File[]) => void) {
	const input = document.createElement("input")
	input.type = "file"
	input.multiple = true
	input.accept = ".svg,.png,image/svg+xml,image/png"
	input.onchange = () => onFiles([...(input.files ?? [])])
	input.click()
}
