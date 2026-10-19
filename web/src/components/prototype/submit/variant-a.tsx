"use client"
// PROTOTYPE pass 2 variant A "Mode cards": three big mode cards up front; Submit one = labelled slot grid, Submit many = bulk drop + auto-sort rows (one row = one submission), Modify one = current vs proposed side by side.
import { ArrowRight, History, Layers, Pencil, Plus, Trash2, Undo2, UploadCloud } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFilesAuto,
	addFilesTo,
	type DraftSubmission,
	EXISTING,
	fileToNewSubmission,
	findExisting,
	type ModifyDraft,
	modifyNudges,
	modifyPayload,
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
	submissionNudges,
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
	type Proto,
	ProtoNotice,
	pickFiles,
	SlotTile,
	SubmitButton,
	useDrop,
	usePrototype,
} from "./shared"

const MODE_ICONS = { one: Plus, modify: Pencil, many: Layers }

export function VariantA() {
	const p = usePrototype()
	const rejected = EXISTING.filter((e) => e.mine && e.status === "rejected")
	return (
		<div className="container mx-auto max-w-7xl px-4 py-6 sm:py-10">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Submit icons</h1>
					<p className="text-sm text-muted-foreground">One submission = one icon, with all its variants.</p>
					<ProtoNotice />
				</div>
				<DemoButtons p={p} />
			</div>
			<div className="mb-2 grid gap-3 sm:grid-cols-3">
				{MODES.map((m) => {
					const Icon = MODE_ICONS[m.id]
					const on = p.mode === m.id
					return (
						<button
							key={m.id}
							type="button"
							onClick={() => p.setMode(m.id)}
							aria-pressed={on}
							className={cn(
								"flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors",
								on && "border-primary ring-2 ring-primary/30",
								!on && "hover:border-primary/40",
							)}
						>
							<span
								className={cn(
									"flex size-10 shrink-0 items-center justify-center rounded-lg",
									on ? "bg-primary text-primary-foreground" : "bg-muted",
								)}
							>
								<Icon className="size-5" />
							</span>
							<span>
								<span className="block font-semibold">{m.title}</span>
								<span className="block text-xs text-muted-foreground">{m.desc}</span>
							</span>
						</button>
					)
				})}
			</div>
			{rejected.length > 0 && (
				<button
					type="button"
					onClick={p.demos.fixRejected}
					className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
				>
					<History className="size-3.5" /> Fix a rejected submission ({rejected.length})
				</button>
			)}
			{p.mode === "one" && <OneMode p={p} />}
			{p.mode === "many" && <ManyMode p={p} />}
			{p.mode === "modify" && <ModifyMode p={p} />}
		</div>
	)
}

function Layout({ main, side }: { main: ReactNode; side: ReactNode }) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
			<div className="min-w-0 space-y-4">{main}</div>
			<aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">{side}</aside>
		</div>
	)
}

function OneMode({ p }: { p: Proto }) {
	const sub = p.one[0]
	const nudges = submissionNudges(p.one)
	return (
		<Layout
			main={<SubEditor sub={sub} set={p.setOne} nudges={nudges} onAction={(a) => p.run(a, "one")} />}
			side={
				<section className="rounded-xl border bg-background p-4">
					<NewPayloadView subs={p.one} />
					<SubmitButton className="mt-4 w-full" payload={newPayload(p.one)[0]} label="Submit icon" blocking={errorsOf(nudges)} />
				</section>
			}
		/>
	)
}

function SubEditor({
	sub,
	set,
	nudges,
	onAction,
}: {
	sub: DraftSubmission
	set: (fn: (s: Subs) => Subs) => void
	nudges: ReturnType<typeof submissionNudges>
	onAction: Parameters<typeof NudgeList>[0]["onAction"]
}) {
	const customs = sub.files.filter((f) => f.custom)
	return (
		<section className="space-y-5 rounded-xl border bg-background p-4 sm:p-6">
			<div>
				<label htmlFor={`slug-${sub.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Icon slug
				</label>
				<input
					id={`slug-${sub.id}`}
					value={sub.slug}
					onChange={(e) => set((s) => renameSub(s, sub.id, e.target.value))}
					placeholder="my-app"
					className="mt-1 h-10 w-full max-w-md rounded-md border bg-transparent px-3 font-mono text-lg font-semibold"
				/>
			</div>
			<NudgeList nudges={nudges.filter((n) => n.subId === sub.id)} onAction={onAction} />
			<div>
				<div className="mb-2 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Variants</h3>
					<Button size="sm" variant="ghost" onClick={() => pickFiles((files) => set((s) => addFilesTo(s, sub.id, files)))}>
						<UploadCloud /> Add several files (auto-sorted by name)
					</Button>
				</div>
				<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
					{SLOTS.map((slot) => {
						const f = sub.files.find((x) => x.key === slot.key)
						return (
							<SlotTile
								key={slot.key}
								slug={sub.slug}
								slotKey={slot.key}
								title={slot.title}
								hint={slot.hint}
								src={f?.url}
								sourceName={f?.file.name}
								onFile={(file) => set((s) => setSlot(s, sub.id, slot.key, file))}
								onClear={f && (() => set((s) => removeFile(s, f.id)))}
								onFileId={(id) => set((s) => moveFile(s, id, sub.id, slot.key))}
							/>
						)
					})}
				</div>
			</div>
			<div>
				<h3 className="mb-2 text-sm font-semibold">Custom variants</h3>
				<div className="mb-2 grid grid-cols-2 gap-3 md:grid-cols-4">
					{customs.map((f) => (
						<SlotTile
							key={f.id}
							slug={sub.slug}
							slotKey={f.key}
							title={f.key}
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
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Aliases</h3>
					<AliasInput value={sub.aliases} onChange={(aliases) => set((s) => setMeta(s, sub.id, { aliases }))} />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Categories</h3>
					<CategoryChips value={sub.categories} onChange={(categories) => set((s) => setMeta(s, sub.id, { categories }))} />
				</div>
			</div>
		</section>
	)
}

function ManyMode({ p }: { p: Proto }) {
	const nudges = submissionNudges(p.many)
	const drop = useDrop((files) => p.setMany((s) => addFilesAuto(s, files)))
	return (
		<Layout
			main={
				<>
					<button
						type="button"
						{...drop.props}
						onClick={() => pickFiles((files) => p.setMany((s) => addFilesAuto(s, files)))}
						className={cn(
							"flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed bg-background/70 px-4 text-center",
							p.many.length ? "py-5" : "py-14",
							drop.active ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
						)}
					>
						<UploadCloud className="size-7 text-muted-foreground" />
						<span className="font-medium">Drop all your files — each icon becomes its own submission</span>
						<span className="max-w-xl text-xs text-muted-foreground">
							Sorted by name: <code>-light</code>/<code>-white</code>, <code>-dark</code>/<code>-black</code>, <code>-wordmark…</code> fill
							slots; known custom names (<code>-animated</code>, <code>-4k</code>…) become custom variants; everything else is a new icon.
						</span>
					</button>
					{p.many.map((sub, i) => (
						<ManyRow key={sub.id} index={i + 1} sub={sub} p={p} nudges={nudges} />
					))}
					{p.many.length > 0 && <NewRowTarget p={p} />}
				</>
			}
			side={
				<section className="rounded-xl border bg-background p-4">
					<NewPayloadView subs={p.many} />
					<SubmitButton
						className="mt-4 w-full"
						payload={p.many.length ? newPayload(p.many) : null}
						label={`Send ${p.many.length} submission${p.many.length === 1 ? "" : "s"}`}
						blocking={errorsOf(nudges)}
					/>
				</section>
			}
		/>
	)
}

function ManyRow({
	index,
	sub,
	p,
	nudges,
}: {
	index: number
	sub: DraftSubmission
	p: Proto
	nudges: ReturnType<typeof submissionNudges>
}) {
	const drop = useDrop(
		(files) => p.setMany((s) => addFilesTo(s, sub.id, files)),
		(id) => p.setMany((s) => moveFile(s, id, sub.id)),
	)
	const customs = sub.files.filter((f) => f.custom)
	return (
		<section {...drop.props} className={cn("space-y-2 rounded-xl border bg-background p-3", drop.active && "ring-2 ring-primary")}>
			<div className="flex items-center gap-2">
				<span className="font-mono text-[11px] text-muted-foreground">#{index}</span>
				<input
					value={sub.slug}
					onChange={(e) => p.setMany((s) => renameSub(s, sub.id, e.target.value))}
					aria-label="Icon slug"
					placeholder="icon-slug"
					className="h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono text-sm font-semibold sm:max-w-64"
				/>
				<span className="text-[11px] text-muted-foreground">{sub.files.length} file(s)</span>
				<span className="flex-1" />
				<Button
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label="Remove submission"
					onClick={() => p.setMany((s) => removeSub(s, sub.id))}
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>
			<NudgeList compact nudges={nudges.filter((n) => n.subId === sub.id)} onAction={(a) => p.run(a, "many")} />
			<div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
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
							onFile={(file) => p.setMany((s) => setSlot(s, sub.id, slot.key, file))}
							onClear={f && (() => p.setMany((s) => removeFile(s, f.id)))}
							onFileId={(id) => p.setMany((s) => moveFile(s, id, sub.id, slot.key))}
						/>
					)
				})}
			</div>
			<div className="flex flex-wrap items-start gap-1.5">
				{customs.map((f) => (
					<div key={f.id} className="w-24">
						<SlotTile
							compact
							slug={sub.slug}
							slotKey={f.key}
							title={f.key}
							src={f.url}
							sourceName={f.file.name}
							dragId={f.id}
							onClear={() => p.setMany((s) => removeFile(s, f.id))}
						/>
					</div>
				))}
				<CustomVariantAdder
					compact
					slug={sub.slug}
					taken={sub.files.map((f) => f.key)}
					onAdd={(name, file) => p.setMany((s) => setSlot(s, sub.id, name, file, true))}
				/>
			</div>
			<details className="text-xs">
				<summary className="cursor-pointer text-muted-foreground">
					Aliases & categories {sub.categories.length > 0 && `· ${sub.categories.join(", ")}`}
				</summary>
				<div className="mt-2 space-y-2">
					<AliasInput value={sub.aliases} onChange={(aliases) => p.setMany((s) => setMeta(s, sub.id, { aliases }))} />
					<CategoryChips compact value={sub.categories} onChange={(categories) => p.setMany((s) => setMeta(s, sub.id, { categories }))} />
				</div>
			</details>
		</section>
	)
}

function NewRowTarget({ p }: { p: Proto }) {
	const drop = useDrop(
		(files) => p.setMany((s) => addFilesAuto(s, files)),
		(id) => p.setMany((s) => fileToNewSubmission(s, id)),
	)
	return (
		<button
			type="button"
			{...drop.props}
			onClick={() => p.setMany((s) => [...s, newSubmission()])}
			className={cn(
				"flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-xs text-muted-foreground",
				drop.active && "border-primary bg-primary/5",
			)}
		>
			<Plus className="size-3.5" /> Add new submission (or drop a tile here to split it into its own icon)
		</button>
	)
}

function ModifyMode({ p }: { p: Proto }) {
	const md = p.modify
	const e = findExisting(md.slug ?? "")
	const nudges = modifyNudges(md)
	const set = (fn: (m: ModifyDraft) => ModifyDraft) => p.setModify(fn)
	if (!e)
		return (
			<section className="rounded-xl border bg-background p-4 sm:p-6">
				<h2 className="mb-3 font-semibold">Which icon do you want to change?</h2>
				<ExistingPicker value={null} onPick={(slug) => p.run({ kind: "modify", slug, carry: [] }, "one")} />
			</section>
		)
	const proposed = [
		...SLOTS.map((s) => s.key),
		...e.variants.filter((v) => !SLOTS.some((s) => s.key === v.key)).map((v) => v.key),
		...Object.keys(md.ops),
	].filter((k, i, a) => a.indexOf(k) === i)
	return (
		<Layout
			main={
				<>
					<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
						<ExistingHeader e={e} />
						<Button size="sm" variant="outline" onClick={() => p.setModify({ ...md, slug: null, ops: {} })}>
							Pick another icon
						</Button>
					</section>
					<NudgeList nudges={nudges} onAction={(a) => p.run(a, "one")} />
					<div className="grid grid-cols-[minmax(0,200px)_auto_minmax(0,200px)] items-start gap-2 sm:gap-4">
						<h3 className="text-sm font-semibold">Current</h3>
						<span />
						<h3 className="text-sm font-semibold">Proposed</h3>
						{proposed.map((key) => {
							const cur = e.variants.find((v) => v.key === key)
							const op = md.ops[key]
							const slot = SLOTS.find((s) => s.key === key)
							const title = slot?.title ?? key
							let src = cur?.url
							if (op && op.type !== "remove") src = op.url
							let state: "add" | "replace" | "remove" | null = null
							if (op) state = op.type
							return (
								<div key={key} className="contents">
									{cur && <SlotTile compact slug={e.slug} slotKey={key} title={title} src={cur.url} />}
									{!cur && (
										<div className="flex h-full min-h-14 items-center justify-center rounded-lg border border-dashed text-[11px] text-muted-foreground">
											no {title.toLowerCase()}
										</div>
									)}
									<ArrowRight className="mt-6 size-4 text-muted-foreground" />
									<div className="space-y-1">
										<SlotTile
											compact
											slug={e.slug}
											slotKey={key}
											title={title}
											src={src}
											state={state}
											onFile={(file) => set((m) => putVariant(m, key, file))}
										/>
										<div className="flex gap-1">
											{cur && !op && key !== "base" && (
												<button
													type="button"
													onClick={() => set((m) => removeVariantOp(m, key))}
													className="text-[11px] text-red-600 hover:underline"
												>
													Remove
												</button>
											)}
											{op && (
												<button
													type="button"
													onClick={() => set((m) => undoOp(m, key))}
													className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
												>
													<Undo2 className="size-3" /> Undo
												</button>
											)}
										</div>
									</div>
								</div>
							)
						})}
					</div>
					<CustomVariantAdder slug={e.slug} taken={proposed} onAdd={(name, file) => set((m) => putVariant(m, name, file))} />
					<section className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Aliases</h3>
							<AliasInput value={md.aliases} onChange={(aliases) => set((m) => ({ ...m, aliases }))} />
						</div>
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Categories</h3>
							<CategoryChips value={md.categories} onChange={(categories) => set((m) => ({ ...m, categories }))} />
						</div>
						<textarea
							value={md.note}
							onChange={(ev) => set((m) => ({ ...m, note: ev.target.value }))}
							placeholder="Note for the reviewer (why these changes?)"
							className="rounded-md border bg-background p-2 text-xs md:col-span-2"
							rows={2}
						/>
					</section>
				</>
			}
			side={
				<section className="rounded-xl border bg-background p-4">
					<DiffView md={md} />
					<SubmitButton className="mt-4 w-full" payload={modifyPayload(md)} label="Propose update" blocking={errorsOf(nudges)} />
				</section>
			}
		/>
	)
}
