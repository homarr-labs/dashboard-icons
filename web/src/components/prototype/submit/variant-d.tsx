"use client"
// PROTOTYPE variant D "Board of slot matrices": each icon is a card showing a form × tone grid previewed on the real backgrounds; custom forms are extra rows that can be split into their own icon; submission sidebar holds shared metadata, payload drawer and submit.
import { MoreHorizontal, Plus, Scissors, Trash2, UploadCloud } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
	addFiles,
	addIcon,
	type Draft,
	type DraftIcon,
	effectiveMeta,
	emptyDraft,
	formLabel,
	formsOf,
	lookupExisting,
	moveVariant,
	nudges,
	removeIcon,
	removeVariant,
	renameIcon,
	SUGGESTED_CUSTOM_FORMS,
	sanitizeSlug,
	setIconMeta,
	setShared,
	setSlotFile,
	splitForm,
	TONES,
	type Tone,
	targetFilename,
	variantToNewIcon,
} from "./mock"
import {
	bgFor,
	DemoButtons,
	demoDraft,
	dragVariant,
	MetaEditor,
	NudgeList,
	PayloadTree,
	ProtoNotice,
	pickFiles,
	SubmitButton,
	useDraft,
	useDrop,
} from "./shared"

type Apply = (fn: (d: Draft) => Draft) => void

const TONE_HEAD: Record<Tone, { title: string; sub: string }> = {
	colour: { title: "Colour", sub: "any background" },
	light: { title: "Light", sub: "for dark backgrounds" },
	dark: { title: "Dark", sub: "for light backgrounds" },
}

export function VariantD() {
	const { draft, apply, setDraft } = useDraft()
	const [payloadOpen, setPayloadOpen] = useState(false)
	const pageDrop = useDrop(
		() => {},
		(files) => apply((d) => addFiles(d, files, true)),
	)
	const issues = nudges(draft)
	const files = draft.icons.reduce((n, i) => n + i.variants.length, 0)
	return (
		<div {...pageDrop.props} className="relative mx-auto max-w-[1500px] px-4 py-6 sm:py-8">
			{pageDrop.active && (
				<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]">
					<div className="rounded-xl border-2 border-dashed border-primary bg-background px-8 py-6 text-center">
						<UploadCloud className="mx-auto mb-2 size-8" />
						<p className="font-medium">Drop to sort files into icons</p>
					</div>
				</div>
			)}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
				<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
					<div>
						<h1 className="text-2xl font-bold">Your submission</h1>
						<ProtoNotice />
					</div>
					<div className="grid grid-cols-3 gap-2 text-center">
						{[
							["icons", draft.icons.length],
							["files", files],
							["to fix", issues.filter((n) => n.level === "error").length],
						].map(([k, n]) => (
							<div key={k} className="rounded-lg border bg-background py-2">
								<div className="text-lg font-semibold">{n}</div>
								<div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
							</div>
						))}
					</div>
					<section className="rounded-xl border bg-background p-3">
						<h2 className="mb-1 text-sm font-semibold">Shared details</h2>
						<p className="mb-2 text-[11px] text-muted-foreground">Inherited by every card (dashed chips). Cards can add their own.</p>
						<MetaEditor meta={draft.shared} onChange={(patch) => apply((d) => setShared(d, patch))} />
					</section>
					<div className="flex flex-col gap-2">
						<SubmitButton draft={draft} className="w-full" label="Submit board" />
						<Button variant="outline" onClick={() => setPayloadOpen(true)}>
							View payload
						</Button>
					</div>
					<DemoButtons onLoad={(k) => setDraft(demoDraft(k, true))} onReset={() => setDraft(emptyDraft())} />
				</aside>

				<main className="min-w-0">
					<p className="mb-3 text-sm text-muted-foreground">
						Drop files anywhere on the page. Each card is one icon; each square is one file, shown on the background it's made for.
					</p>
					<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{draft.icons.map((icon) => (
							<IconCard key={icon.id} icon={icon} draft={draft} apply={apply} />
						))}
						<NewCard apply={apply} />
					</div>
				</main>
			</div>
			<Sheet open={payloadOpen} onOpenChange={setPayloadOpen}>
				<SheetContent className="w-full overflow-auto sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Payload</SheetTitle>
						<SheetDescription>Submission → Icons → Variants, live.</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-6">
						<PayloadTree draft={draft} />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

function IconCard({ icon, draft, apply }: { icon: DraftIcon; draft: Draft; apply: Apply }) {
	const [extraForms, setExtraForms] = useState<string[]>([])
	const [menu, setMenu] = useState(false)
	const [editMeta, setEditMeta] = useState(false)
	const forms = [...new Set([...formsOf(icon), "wordmark", ...extraForms])].sort((a, b) => rank(a) - rank(b))
	const existing = lookupExisting(icon.slug)
	const meta = effectiveMeta(draft, icon)
	const addForm = (f: string) => {
		if (f) setExtraForms((x) => [...x, f])
		setMenu(false)
	}
	return (
		<article className="min-w-0 rounded-xl border bg-background p-3 shadow-sm">
			<header className="mb-2 flex items-center gap-2">
				<input
					value={icon.slug}
					onChange={(e) => apply((d) => renameIcon(d, icon.id, e.target.value))}
					placeholder="icon-slug"
					aria-label="Icon slug"
					className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-1 font-mono text-lg font-semibold outline-none focus:ring-1 focus:ring-primary"
				/>
				{!existing && (
					<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">New</span>
				)}
				{existing?.kind === "collection" && (
					<span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">Update</span>
				)}
				{existing?.kind === "pending" && (
					<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">Pending elsewhere</span>
				)}
				<Button
					size="icon"
					variant="ghost"
					className="size-8"
					aria-label="Remove icon"
					onClick={() => apply((d) => removeIcon(d, icon.id))}
				>
					<Trash2 className="size-4" />
				</Button>
			</header>
			<NudgeList draft={draft} apply={apply} iconId={icon.id} compact />
			<div className="mt-2 grid grid-cols-[minmax(64px,auto)_repeat(3,minmax(0,1fr))] gap-1.5">
				<span />
				{TONES.map((t) => (
					<div key={t} className="text-center leading-tight">
						<div className="text-[11px] font-medium">{TONE_HEAD[t].title}</div>
						<div className="text-[9px] text-muted-foreground">{TONE_HEAD[t].sub}</div>
					</div>
				))}
				{forms.map((f) => (
					<FormRow key={f} icon={icon} form={f} apply={apply} onDrop={() => setExtraForms((x) => x.filter((y) => y !== f))} />
				))}
			</div>
			<div className="relative mt-2">
				<button
					type="button"
					onClick={() => setMenu(!menu)}
					className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Plus className="size-3.5" /> Add variant row
				</button>
				{menu && (
					<div className="absolute left-0 z-10 mt-1 flex flex-wrap gap-1 rounded-lg border bg-popover p-2 shadow-md">
						{SUGGESTED_CUSTOM_FORMS.filter((f) => !forms.includes(f)).map((f) => (
							<button key={f} type="button" onClick={() => addForm(f)} className="rounded bg-muted px-2 py-1 text-xs hover:bg-muted/70">
								{formLabel(f)}
							</button>
						))}
						<button
							type="button"
							onClick={() => addForm(sanitizeSlug(window.prompt("Variant name (lowercase, e.g. glyph)") || ""))}
							className="rounded border px-2 py-1 text-xs"
						>
							Other…
						</button>
					</div>
				)}
			</div>
			<footer className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
				<button
					type="button"
					onClick={() => setEditMeta(!editMeta)}
					className="flex w-full items-center gap-1 text-left hover:text-foreground"
				>
					<span className="truncate">
						{meta.categories.length ? meta.categories.join(" · ") : "no categories"} · {meta.aliases.length} alias(es)
						{icon.inheritMeta ? " · inherits shared" : ""}
					</span>
					<MoreHorizontal className="ml-auto size-3.5 shrink-0" />
				</button>
				{editMeta && (
					<div className="mt-2 space-y-2">
						<label className="inline-flex items-center gap-1.5">
							<input
								type="checkbox"
								checked={icon.inheritMeta}
								onChange={(e) => apply((d) => setIconMeta(d, icon.id, {}, e.target.checked))}
							/>
							Inherit shared details
						</label>
						<MetaEditor
							meta={icon.meta}
							onChange={(patch) => apply((d) => setIconMeta(d, icon.id, patch))}
							inherited={icon.inheritMeta ? draft.shared : undefined}
						/>
					</div>
				)}
			</footer>
		</article>
	)
}

function rank(f: string) {
	if (f === "icon") return 0
	if (f === "wordmark") return 1
	return 2
}

function FormRow({ icon, form, apply, onDrop }: { icon: DraftIcon; form: string; apply: Apply; onDrop: () => void }) {
	const custom = form !== "icon" && form !== "wordmark"
	const filled = icon.variants.some((v) => v.form === form)
	return (
		<>
			<div className="flex flex-col justify-center gap-0.5 pr-1">
				<span className="text-xs font-medium">{form === "icon" ? "Icon" : formLabel(form)}</span>
				{custom && (
					<div className="flex gap-1">
						{filled && (
							<button
								type="button"
								title={`Split into its own icon: ${icon.slug}-${form}`}
								onClick={() => apply((d) => splitForm(d, icon.id, form))}
								className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
							>
								<Scissors className="size-3" /> own icon
							</button>
						)}
						{!filled && (
							<button type="button" onClick={onDrop} className="text-[10px] text-muted-foreground hover:text-destructive">
								remove
							</button>
						)}
					</div>
				)}
			</div>
			{TONES.map((t) => (
				<Cell key={t} icon={icon} form={form} tone={t} apply={apply} />
			))}
		</>
	)
}

function Cell({ icon, form, tone, apply }: { icon: DraftIcon; form: string; tone: Tone; apply: Apply }) {
	const matches = icon.variants.filter((v) => v.form === form && v.tone === tone)
	const v = matches[0]
	const required = form === "icon" && tone === "colour"
	const drop = useDrop(
		(vid) => apply((d) => moveVariant(d, vid, icon.id, form, tone)),
		(files) => files[0] && apply((d) => setSlotFile(d, icon.id, form, tone, files[0])),
	)
	const target = targetFilename(icon.slug, v ?? { form, tone, file: new File([], "x.svg") })
	return (
		<div
			{...drop.props}
			{...(v ? dragVariant(v.id) : {})}
			className={cn(
				"group/cell relative flex aspect-[4/3] min-h-16 flex-col items-center justify-center overflow-hidden rounded-md border",
				bgFor(tone),
				!v && "border-dashed",
				!v && required && "border-red-500/60",
				drop.active && "ring-2 ring-primary",
				v && "cursor-grab",
			)}
			title={v ? `${v.file.name} → ${target}` : target}
		>
			{v ? (
				<>
					{/* biome-ignore lint/performance/noImgElement: prototype blob previews */}
					<img src={v.url} alt={v.file.name} className="h-3/5 w-3/5 object-contain" />
					<span
						className={cn(
							"absolute inset-x-0 bottom-0 truncate px-1 text-center font-mono text-[9px]",
							tone === "light" ? "text-zinc-300" : "text-zinc-600",
							tone === "colour" && "bg-background/70 text-foreground",
						)}
					>
						{target}
					</span>
					{matches.length > 1 && (
						<span className="absolute top-1 left-1 rounded-full bg-red-600 px-1.5 text-[9px] text-white">{matches.length} files</span>
					)}
					<button
						type="button"
						aria-label="Remove file"
						onClick={() => apply((d) => removeVariant(d, v.id))}
						className="absolute top-1 right-1 hidden rounded bg-background/90 p-0.5 shadow group-hover/cell:block"
					>
						<Trash2 className="size-3" />
					</button>
				</>
			) : (
				<button
					type="button"
					onClick={() => pickFiles((files) => files[0] && apply((d) => setSlotFile(d, icon.id, form, tone, files[0])))}
					className={cn(
						"flex size-full flex-col items-center justify-center gap-0.5 px-1 font-mono text-[9px]",
						tone === "light" ? "text-zinc-500" : "text-zinc-400",
						tone === "colour" && "text-muted-foreground",
					)}
				>
					<Plus className="size-3.5" />
					<span className={cn("max-w-full truncate rounded px-0.5", tone === "colour" && "bg-background/80")}>{target}</span>
					{required && <span className="rounded bg-red-600 px-1 font-sans text-[9px] text-white">required</span>}
				</button>
			)}
		</div>
	)
}

function NewCard({ apply }: { apply: Apply }) {
	const drop = useDrop(
		(vid) => apply((d) => variantToNewIcon(d, vid)),
		(files) => apply((d) => addFiles(d, files, true)),
	)
	return (
		<button
			type="button"
			{...drop.props}
			onClick={() => apply((d) => addIcon(d))}
			className={cn(
				"flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground",
				drop.active && "border-primary bg-primary/5",
			)}
		>
			<Plus className="size-5" />
			Add another icon to this submission
			<span className="text-xs">or drop a square here to split it out</span>
		</button>
	)
}
