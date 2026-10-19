"use client"
// PROTOTYPE pass 2 variant C "Card stack + preview": mode rail on the left, a stack of submission cards (expand one at a time, "+ add new"), and a persistent panel previewing the selected icon on light/dark/checker; Modify one is an inline diff list.
import { ChevronDown, History, Layers, Pencil, Plus, Trash2, Undo2, Upload } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFilesAuto,
	addFilesTo,
	type Bg,
	bgForKey,
	type DraftSubmission,
	EXISTING,
	findExisting,
	type ModifyDraft,
	modifyNudges,
	modifyPayload,
	modifyRows,
	moveFile,
	newPayload,
	newSubmission,
	putVariant,
	removeFile,
	removeSub,
	removeVariantOp,
	renameSub,
	SLOTS,
	type Subs,
	setMeta,
	setSlot,
	slotTitle,
	submissionNudges,
	targetFilename,
	undoOp,
} from "./mock"
import {
	AliasInput,
	CategoryChips,
	CustomVariantAdder,
	DemoButtons,
	DiffView,
	ExistingHeader,
	ExistingPicker,
	errorsOf,
	MODES,
	NewPayloadView,
	NudgeList,
	Preview,
	type Proto,
	ProtoNotice,
	pickFiles,
	SlotTile,
	SubmitButton,
	useDrop,
	usePrototype,
} from "./shared"

const MODE_ICONS = { one: Plus, modify: Pencil, many: Layers }
type Shown = { key: string; url: string; label: string }

export function VariantC() {
	const p = usePrototype()
	const [selected, setSelected] = useState<string | null>(null)
	const rejected = EXISTING.filter((e) => e.mine && e.status === "rejected")
	let subs: Subs = p.many
	let set = p.setMany
	if (p.mode === "one") {
		subs = p.one
		set = p.setOne
	}
	const current = subs.find((s) => s.id === selected) ?? subs[0]
	const nudges = submissionNudges(subs)
	let shown: { slug: string; items: Shown[] } = {
		slug: current?.slug ?? "",
		items: (current?.files ?? []).map((f) => ({ key: f.key, url: f.url, label: f.file.name })),
	}
	if (p.mode === "modify") shown = modifyShown(p.modify)
	const pageDrop = useDrop((files) => {
		if (p.mode === "many") p.setMany((s) => addFilesAuto(s, files))
		if (p.mode === "one") p.setOne((s) => addFilesTo(s, s[0].id, files))
	})
	return (
		<div className="mx-auto max-w-[1500px] px-4 py-6 sm:py-8">
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)_340px]">
				<nav className="space-y-4">
					<div>
						<h1 className="text-xl font-bold">Submit</h1>
						<ProtoNotice />
					</div>
					<ul className="flex gap-1 overflow-x-auto lg:flex-col">
						{MODES.map((m) => {
							const Icon = MODE_ICONS[m.id]
							return (
								<li key={m.id} className="shrink-0">
									<button
										type="button"
										onClick={() => p.setMode(m.id)}
										className={cn(
											"flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm",
											p.mode === m.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
										)}
									>
										<Icon className="size-4" /> {m.title}
									</button>
								</li>
							)
						})}
						{rejected.length > 0 && (
							<li className="shrink-0">
								<button
									type="button"
									onClick={p.demos.fixRejected}
									className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
								>
									<History className="size-4" /> Fix rejected ({rejected.length})
								</button>
							</li>
						)}
					</ul>
					<DemoButtons p={p} className="lg:flex-col lg:items-stretch lg:[&>button]:justify-start" />
				</nav>

				<main
					{...pageDrop.props}
					className={cn("min-w-0 space-y-3", pageDrop.active && "rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-background")}
				>
					<p className="text-sm text-muted-foreground">{MODES.find((m) => m.id === p.mode)?.desc}. Drop files anywhere here.</p>
					{p.mode !== "modify" &&
						subs.map((sub, i) => (
							<SubCard
								key={sub.id}
								sub={sub}
								index={i + 1}
								open={sub.id === current?.id}
								onOpen={() => setSelected(sub.id)}
								set={set}
								nudges={nudges.filter((n) => n.subId === sub.id)}
								onAction={(a) => p.run(a, p.mode === "one" ? "one" : "many")}
								removable={p.mode === "many"}
							/>
						))}
					{p.mode === "many" && (
						<button
							type="button"
							onClick={() => {
								const s = newSubmission()
								p.setMany((x) => [...x, s])
								setSelected(s.id)
							}}
							className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
						>
							<Plus className="size-4" /> Add new submission
						</button>
					)}
					{p.mode === "modify" && <ModifyList p={p} />}
				</main>

				<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
					<PreviewPanel slug={shown.slug} items={shown.items} />
					<section className="rounded-xl border bg-background p-4">
						{p.mode !== "modify" && <NewPayloadView subs={subs} />}
						{p.mode === "modify" && <DiffView md={p.modify} />}
						{p.mode === "one" && (
							<SubmitButton className="mt-4 w-full" payload={newPayload(p.one)[0]} label="Submit icon" blocking={errorsOf(nudges)} />
						)}
						{p.mode === "many" && (
							<SubmitButton
								className="mt-4 w-full"
								payload={p.many.length ? newPayload(p.many) : null}
								label={`Send ${p.many.length} submissions`}
								blocking={errorsOf(nudges)}
							/>
						)}
						{p.mode === "modify" && (
							<SubmitButton
								className="mt-4 w-full"
								payload={modifyPayload(p.modify)}
								label="Propose update"
								blocking={errorsOf(modifyNudges(p.modify))}
							/>
						)}
					</section>
				</aside>
			</div>
		</div>
	)
}

function modifyShown(md: ModifyDraft) {
	const items: Shown[] = []
	for (const r of modifyRows(md)) {
		if (r.op?.type === "remove") continue
		if (r.op) items.push({ key: r.key, url: r.op.url, label: r.op.file.name })
		else if (r.current) items.push({ key: r.key, url: r.current.url, label: r.current.filename })
	}
	return { slug: md.slug ?? "", items }
}

function PreviewPanel({ slug, items }: { slug: string; items: Shown[] }) {
	const base = items.find((i) => i.key === "base")
	const bgs: Bg[] = ["light", "dark", "checker"]
	return (
		<section className="space-y-3 rounded-xl border bg-background p-4">
			<h2 className="text-sm font-semibold">
				Preview <span className="font-mono font-normal text-muted-foreground">{slug || ""}</span>
			</h2>
			<div className="grid grid-cols-3 gap-2">
				{bgs.map((bg) => (
					<div key={bg} className="space-y-1 text-center">
						{base && <Preview src={base.url} bg={bg} className="aspect-square size-auto w-full p-3" />}
						{!base && <div className="aspect-square w-full rounded-md border border-dashed" />}
						<span className="text-[10px] text-muted-foreground">base on {bg}</span>
					</div>
				))}
			</div>
			<div>
				<h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">Each variant on the background it's for</h3>
				<div className="grid grid-cols-3 gap-2">
					{items.map((i) => (
						<div key={i.key + i.url} className="min-w-0 text-center">
							<Preview src={i.url} bg={bgForKey(i.key)} className="aspect-square size-auto w-full p-2" alt={i.label} />
							<div className="truncate font-mono text-[9px] text-muted-foreground" title={i.label}>
								{targetFilename(slug, i.key)}
							</div>
						</div>
					))}
				</div>
				{items.length === 0 && <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>}
			</div>
		</section>
	)
}

function SubCard({
	sub,
	index,
	open,
	onOpen,
	set,
	nudges,
	onAction,
	removable,
}: {
	sub: DraftSubmission
	index: number
	open: boolean
	onOpen: () => void
	set: (fn: (s: Subs) => Subs) => void
	nudges: ReturnType<typeof submissionNudges>
	onAction: Parameters<typeof NudgeList>[0]["onAction"]
	removable: boolean
}) {
	const errors = nudges.filter((n) => n.level === "error").length
	const warns = nudges.length - errors
	const base = sub.files.find((f) => f.key === "base")
	return (
		<article className={cn("rounded-xl border bg-background transition-shadow", open && "shadow-md ring-1 ring-primary/30")}>
			<button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left">
				{base && <Preview src={base.url} bg="checker" className="size-10" />}
				{!base && <span className="flex size-10 items-center justify-center rounded-md border border-dashed text-muted-foreground">?</span>}
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="text-[11px] text-muted-foreground">#{index}</span>
						<span className="truncate font-mono font-semibold">{sub.slug || "untitled"}</span>
					</span>
					<span className="flex flex-wrap gap-1 pt-0.5">
						{sub.files
							.filter((f) => f.key !== "base")
							.map((f) => (
								<span
									key={f.id}
									className={cn(
										"rounded px-1 text-[10px]",
										f.custom ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-muted text-muted-foreground",
									)}
								>
									{f.key}
								</span>
							))}
					</span>
				</span>
				{errors > 0 && (
					<span className="rounded-full bg-red-500/15 px-1.5 text-[10px] text-red-700 dark:text-red-300">{errors} to fix</span>
				)}
				{warns > 0 && (
					<span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-300">{warns} hint</span>
				)}
				<ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<div className="space-y-3 border-t p-3">
					<div className="flex items-center gap-2">
						<input
							value={sub.slug}
							onChange={(e) => set((s) => renameSub(s, sub.id, e.target.value))}
							placeholder="icon-slug"
							aria-label="Icon slug"
							className="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono font-semibold"
						/>
						<Button size="sm" variant="outline" onClick={() => pickFiles((files) => set((s) => addFilesTo(s, sub.id, files)))}>
							<Upload /> Files
						</Button>
						{removable && (
							<Button size="icon" variant="ghost" aria-label="Remove submission" onClick={() => set((s) => removeSub(s, sub.id))}>
								<Trash2 />
							</Button>
						)}
					</div>
					<NudgeList compact nudges={nudges} onAction={onAction} />
					<div className="grid grid-cols-3 gap-2">
						{SLOTS.map((slot) => {
							const f = sub.files.find((x) => x.key === slot.key)
							return (
								<SlotTile
									key={slot.key}
									compact
									slug={sub.slug}
									slotKey={slot.key}
									title={slot.title}
									src={f?.url}
									sourceName={f?.file.name}
									dragId={f?.id}
									onFile={(file) => set((s) => setSlot(s, sub.id, slot.key, file))}
									onClear={f && (() => set((s) => removeFile(s, f.id)))}
									onFileId={(id) => set((s) => moveFile(s, id, sub.id, slot.key))}
								/>
							)
						})}
						{sub.files
							.filter((f) => f.custom)
							.map((f) => (
								<SlotTile
									key={f.id}
									compact
									slug={sub.slug}
									slotKey={f.key}
									title={`${f.key} · custom`}
									src={f.url}
									sourceName={f.file.name}
									onClear={() => set((s) => removeFile(s, f.id))}
								/>
							))}
					</div>
					<CustomVariantAdder
						slug={sub.slug}
						taken={sub.files.map((f) => f.key)}
						onAdd={(name, file) => set((s) => setSlot(s, sub.id, name, file, true))}
					/>
					<div className="space-y-2">
						<AliasInput value={sub.aliases} onChange={(aliases) => set((s) => setMeta(s, sub.id, { aliases }))} />
						<CategoryChips compact value={sub.categories} onChange={(categories) => set((s) => setMeta(s, sub.id, { categories }))} />
					</div>
				</div>
			)}
		</article>
	)
}

function ModifyList({ p }: { p: Proto }) {
	const md = p.modify
	const e = findExisting(md.slug ?? "")
	const set = (fn: (m: ModifyDraft) => ModifyDraft) => p.setModify(fn)
	const [addKey, setAddKey] = useState("")
	if (!e)
		return (
			<article className="rounded-xl border bg-background p-4">
				<h2 className="mb-3 font-semibold">Pick the icon to change</h2>
				<ExistingPicker value={null} onPick={(slug) => p.run({ kind: "modify", slug, carry: [] }, "one")} />
			</article>
		)
	const rows = modifyRows(md)
	const missing = SLOTS.filter((s) => !rows.some((r) => r.key === s.key))
	return (
		<article className="space-y-3 rounded-xl border bg-background p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<ExistingHeader e={e} />
				<Button size="sm" variant="ghost" onClick={() => p.setModify({ ...md, slug: null, ops: {} })}>
					Change icon
				</Button>
			</div>
			<NudgeList nudges={modifyNudges(md)} onAction={(a) => p.run(a, "one")} />
			<ul className="divide-y rounded-lg border font-mono text-xs">
				{rows.map((r) => {
					let sign = "="
					let tone = ""
					if (r.op?.type === "add") {
						sign = "+"
						tone = "bg-emerald-500/10"
					}
					if (r.op?.type === "replace") {
						sign = "~"
						tone = "bg-amber-500/10"
					}
					if (r.op?.type === "remove") {
						sign = "−"
						tone = "bg-red-500/10"
					}
					return (
						<li key={r.key} className={cn("flex flex-wrap items-center gap-2 px-2 py-1.5", tone)}>
							<span className="w-3 text-center font-bold">{sign}</span>
							{r.current && <Preview src={r.current.url} bg={bgForKey(r.key)} className={cn("size-9", r.op && "opacity-50")} />}
							{r.op && r.op.type !== "remove" && (
								<>
									{r.current && <span className="text-muted-foreground">→</span>}
									<Preview src={r.op.url} bg={bgForKey(r.key)} className="size-9" />
								</>
							)}
							<span className={cn("min-w-0 flex-1 truncate", r.op?.type === "remove" && "line-through")}>
								{targetFilename(e.slug, r.key)} <span className="font-sans text-[10px] text-muted-foreground">{slotTitle(r.key)}</span>
							</span>
							<span className="flex gap-1 font-sans">
								{r.op?.type !== "remove" && (
									<Button
										size="sm"
										variant="ghost"
										className="h-7 px-2"
										onClick={() => pickFiles((f) => f[0] && set((m) => putVariant(m, r.key, f[0])), false)}
									>
										<Upload /> {r.current ? "Replace" : "Change"}
									</Button>
								)}
								{r.current && !r.op && r.key !== "base" && (
									<Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => set((m) => removeVariantOp(m, r.key))}>
										Remove
									</Button>
								)}
								{r.op && (
									<Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => set((m) => undoOp(m, r.key))}>
										<Undo2 /> Undo
									</Button>
								)}
							</span>
						</li>
					)
				})}
				<li className="flex flex-wrap items-center gap-2 px-2 py-2 font-sans">
					<span className="w-3 text-center font-mono font-bold text-emerald-600">+</span>
					{missing.length > 0 && (
						<select
							aria-label="Add a missing slot"
							value={addKey}
							onChange={(ev) => {
								const k = ev.target.value
								setAddKey("")
								if (k) pickFiles((f) => f[0] && set((m) => putVariant(m, k, f[0])), false)
							}}
							className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs sm:w-auto sm:max-w-xs"
						>
							<option value="">Add {missing.map((m) => m.title.toLowerCase()).join(", ")}…</option>
							{missing.map((m) => (
								<option key={m.key} value={m.key}>
									{m.title} ({targetFilename(e.slug, m.key)})
								</option>
							))}
						</select>
					)}
					<CustomVariantAdder
						compact
						slug={e.slug}
						taken={rows.map((r) => r.key)}
						onAdd={(name, file) => set((m) => putVariant(m, name, file))}
					/>
				</li>
			</ul>
			<div className="space-y-2">
				<AliasInput value={md.aliases} onChange={(aliases) => set((m) => ({ ...m, aliases }))} />
				<CategoryChips compact value={md.categories} onChange={(categories) => set((m) => ({ ...m, categories }))} />
				<textarea
					value={md.note}
					onChange={(ev) => set((m) => ({ ...m, note: ev.target.value }))}
					placeholder="Note for the reviewer"
					rows={2}
					className="w-full rounded-md border bg-background p-2 text-xs"
				/>
			</div>
		</article>
	)
}
