"use client"
// PROTOTYPE variant A "Drop & sort": file-first triage — one bulk drop zone auto-groups files into icon lanes; drag chips between lanes, retag kinds, shared metadata by default.
import { GripVertical, Plus, Trash2, UploadCloud, Wand2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFiles,
	addFilesToIcon,
	addIcon,
	type Draft,
	type DraftIcon,
	type DraftVariant,
	effectiveMeta,
	emptyDraft,
	formsOf,
	lookupExisting,
	moveVariant,
	removeIcon,
	removeVariant,
	renameIcon,
	setIconMeta,
	setShared,
	setVariantKind,
	targetFilename,
	toneLabel,
	variantToNewIcon,
} from "./mock"
import {
	DemoButtons,
	demoDraft,
	dragVariant,
	KindSelect,
	MetaEditor,
	NudgeList,
	PayloadTree,
	ProtoNotice,
	pickFiles,
	SubmitButton,
	useDraft,
	useDrop,
	VariantThumb,
} from "./shared"

type Apply = (fn: (d: Draft) => Draft) => void

export function VariantA() {
	const { draft, apply, setDraft } = useDraft()
	const [group, setGroup] = useState(true)
	const [lastDrop, setLastDrop] = useState<{ files: number; icons: number } | null>(null)
	const ingest = (files: File[]) => {
		const next = addFiles(draft, files, group)
		setDraft(next)
		setLastDrop({ files: files.length, icons: next.icons.length - draft.icons.length })
	}
	const drop = useDrop(
		(vid) => apply((d) => variantToNewIcon(d, vid)),
		(files) => ingest(files),
	)
	const regroup = (on: boolean) => {
		setGroup(on)
		const files = draft.icons.flatMap((i) => i.variants.map((v) => v.file))
		setDraft({ ...addFiles(emptyDraft(), files, on), shared: draft.shared })
	}
	return (
		<div className="container mx-auto max-w-7xl px-4 py-6 sm:py-10">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Submit icons</h1>
					<p className="text-sm text-muted-foreground">Drop everything at once: every icon and every variant goes into one submission.</p>
					<ProtoNotice />
				</div>
				<DemoButtons
					onLoad={(k) => {
						setDraft(demoDraft(k, group))
						setLastDrop(null)
					}}
					onReset={() => {
						setDraft(emptyDraft())
						setLastDrop(null)
					}}
				/>
			</div>

			<button
				type="button"
				{...drop.props}
				onClick={() => pickFiles(ingest)}
				className={cn(
					"flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background/70 px-4 text-center transition-colors",
					draft.icons.length ? "py-6" : "py-16",
					drop.active ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
				)}
			>
				<UploadCloud className="size-8 text-muted-foreground" />
				<span className="text-base font-medium">Drop all your SVG / PNG files here</span>
				<span className="max-w-xl text-xs text-muted-foreground">
					Files are grouped into icons by name: <code>-light</code>/<code>-white</code> → light, <code>-dark</code>/<code>-black</code> →
					dark, <code>-wordmark</code>/<code>-text</code>/<code>-logo</code> → wordmark, <code>-animated</code>/<code>-mono</code>/
					<code>-outline</code>/<code>-3d</code> → custom variant. Anything else becomes its own icon.
				</span>
			</button>

			<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<label className="inline-flex items-center gap-1.5">
					<input type="checkbox" checked={group} onChange={(e) => regroup(e.target.checked)} />
					Group by filename suffix
				</label>
				{lastDrop && (
					<span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">
						<Wand2 className="size-3" /> {lastDrop.files} file(s) → {lastDrop.icons} new icon(s)
					</span>
				)}
			</div>

			<div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
				<div className="min-w-0 space-y-3">
					{draft.icons.map((icon) => (
						<IconLane key={icon.id} icon={icon} draft={draft} apply={apply} />
					))}
					{draft.icons.length > 0 && <NewIconTarget apply={apply} />}
				</div>
				<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
					<section className="rounded-xl border bg-background p-4">
						<h2 className="mb-1 text-sm font-semibold">Shared by every icon</h2>
						<p className="mb-3 text-[11px] text-muted-foreground">
							Categories and description apply to all icons unless an icon overrides them.
						</p>
						<MetaEditor meta={draft.shared} onChange={(patch) => apply((d) => setShared(d, patch))} />
					</section>
					<section className="rounded-xl border bg-background p-4">
						<PayloadTree draft={draft} />
						<SubmitButton
							draft={draft}
							className="mt-4 w-full"
							label={`Submit ${draft.icons.length || ""} icon${draft.icons.length === 1 ? "" : "s"} together`}
						/>
					</section>
				</aside>
			</div>
		</div>
	)
}

function IconLane({ icon, draft, apply }: { icon: DraftIcon; draft: Draft; apply: Apply }) {
	const [editMeta, setEditMeta] = useState(false)
	const drop = useDrop(
		(vid) => apply((d) => moveVariant(d, vid, icon.id)),
		(files) => apply((d) => addFilesToIcon(d, icon.id, files)),
	)
	const existing = lookupExisting(icon.slug)
	const meta = effectiveMeta(draft, icon)
	return (
		<section
			{...drop.props}
			className={cn("rounded-xl border bg-background p-3 transition-colors", drop.active && "border-primary ring-2 ring-primary/30")}
		>
			<div className="flex flex-wrap items-center gap-2">
				<input
					value={icon.slug}
					onChange={(e) => apply((d) => renameIcon(d, icon.id, e.target.value))}
					placeholder="icon-slug"
					aria-label="Icon slug"
					className="h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono text-sm font-semibold sm:max-w-64"
				/>
				{!existing && (
					<span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">new icon</span>
				)}
				{existing?.kind === "collection" && (
					<span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">update proposal</span>
				)}
				{existing?.kind === "pending" && (
					<span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
						update to pending #{existing.submissionId}
					</span>
				)}
				<span className="text-[11px] text-muted-foreground">{icon.variants.length} file(s)</span>
				<span className="flex-1" />
				<button
					type="button"
					onClick={() => setEditMeta(!editMeta)}
					className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
				>
					{icon.inheritMeta ? `shared metadata${meta.categories.length ? ` · ${meta.categories.join(", ")}` : ""}` : "own metadata"}
				</button>
				<Button
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label="Remove icon"
					onClick={() => apply((d) => removeIcon(d, icon.id))}
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>
			<div className="mt-2">
				<NudgeList draft={draft} apply={apply} iconId={icon.id} compact />
			</div>
			<div className="mt-2 flex flex-wrap gap-2">
				{icon.variants.map((v) => (
					<FileChip key={v.id} icon={icon} v={v} apply={apply} />
				))}
				{icon.variants.length === 0 && <p className="px-1 py-4 text-xs text-muted-foreground">Drag files here.</p>}
			</div>
			{editMeta && (
				<div className="mt-3 rounded-lg bg-muted/40 p-3">
					<label className="mb-2 inline-flex items-center gap-1.5 text-xs">
						<input
							type="checkbox"
							checked={icon.inheritMeta}
							onChange={(e) => apply((d) => setIconMeta(d, icon.id, {}, e.target.checked))}
						/>
						Also use the shared categories/description
					</label>
					<MetaEditor
						meta={icon.meta}
						onChange={(patch) => apply((d) => setIconMeta(d, icon.id, patch))}
						inherited={icon.inheritMeta ? draft.shared : undefined}
					/>
				</div>
			)}
		</section>
	)
}

function FileChip({ icon, v, apply }: { icon: DraftIcon; v: DraftVariant; apply: Apply }) {
	return (
		<div
			{...dragVariant(v.id)}
			className="flex w-full cursor-grab items-center gap-2 rounded-lg border bg-muted/30 p-1.5 pr-2 active:cursor-grabbing sm:w-auto"
			title={toneLabel(v.tone)}
		>
			<GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
			<VariantThumb variant={v} className="size-10" />
			<div className="min-w-0 space-y-0.5">
				<KindSelect forms={formsOf(icon)} value={v} onChange={(f, t) => apply((d) => setVariantKind(d, v.id, f, t))} />
				<div className="truncate font-mono text-[10px] text-muted-foreground">
					{v.file.name} → <span className="text-foreground">{targetFilename(icon.slug, v)}</span>
				</div>
			</div>
			<button
				type="button"
				aria-label="Remove file"
				onClick={() => apply((d) => removeVariant(d, v.id))}
				className="ml-auto text-muted-foreground hover:text-destructive"
			>
				<Trash2 className="size-3.5" />
			</button>
		</div>
	)
}

function NewIconTarget({ apply }: { apply: Apply }) {
	const drop = useDrop(
		(vid) => apply((d) => variantToNewIcon(d, vid)),
		(files) => apply((d) => addFiles(d, files, false)),
	)
	return (
		<button
			type="button"
			{...drop.props}
			onClick={() => apply((d) => addIcon(d))}
			className={cn(
				"flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-xs text-muted-foreground",
				drop.active && "border-primary bg-primary/5 text-foreground",
			)}
		>
			<Plus className="size-3.5" /> Drop a file here to make it a separate icon, or click to add an empty one
		</button>
	)
}
