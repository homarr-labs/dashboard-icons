"use client"
// PROTOTYPE reference design (variant C): Submit = stack of icon cards (one card = one submission) with a persistent background preview; Edit = inline diff list on an existing icon, in place for your own pending or rejected submission.
import { Check, ChevronDown, FlaskConical, History, Pencil, Plus, Trash2, Undo2, Upload, UploadCloud } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFilesAuto,
	addFilesTo,
	applyResubmit,
	type Bg,
	bgForKey,
	type DraftSubmission,
	diffLines,
	type EditDraft,
	editNudges,
	editPayload,
	editRows,
	findExisting,
	isInPlace,
	moveFile,
	myRejected,
	type Nudge,
	newPayload,
	newSubmission,
	putVariant,
	removeFile,
	removeSub,
	removeVariantOp,
	renameSub,
	SLOTS,
	setMeta,
	setRemovalNote,
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
	ExistingPicker,
	focusRing,
	NudgeList,
	PayloadJson,
	Preview,
	type Proto,
	pickFiles,
	pillFor,
	SlotTile,
	StatusPill,
	useDrop,
	usePrototype,
} from "./shared"

type Shown = { key: string; url: string; label: string }

export function SubmitFormPrototype() {
	const p = usePrototype()
	return (
		<div className="container mx-auto max-w-6xl px-4 pt-6 pb-36 sm:pt-10 lg:pb-16">
			<Header p={p} />
			<ProtoControls p={p} />
			{p.result && <ResultView p={p} />}
			{!p.result && p.mode === "submit" && <SubmitMode p={p} />}
			{!p.result && p.mode === "edit" && <EditMode p={p} />}
		</div>
	)
}

function Header({ p }: { p: Proto }) {
	const rejected = myRejected()
	const tabs = [
		{ id: "submit" as const, label: "Submit new icons", short: "Submit", Icon: Plus },
		{ id: "edit" as const, label: "Edit an existing icon", short: "Edit", Icon: Pencil },
	]
	return (
		<header className="mb-5 space-y-4">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Submit icons</h1>
				<p className="mt-1 max-w-prose text-sm text-muted-foreground">
					Each icon is its own submission, with all of its variants. Reviewers check them one at a time.
				</p>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div role="tablist" aria-label="What do you want to do?" className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto">
					{tabs.map(({ id, label, short, Icon }) => {
						const on = p.mode === id && !p.result
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={on}
								onClick={() => {
									p.setResult(null)
									p.setMode(id)
								}}
								className={cn(
									"flex flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors motion-reduce:transition-none sm:flex-none",
									"min-h-9 max-sm:min-h-11",
									focusRing,
									on && "bg-background text-foreground shadow-sm",
									!on && "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="size-4" aria-hidden />
								<span className="sm:hidden">{short}</span>
								<span className="max-sm:hidden">{label}</span>
							</button>
						)
					})}
				</div>
				{rejected.length > 0 && (
					<Button variant="outline" size="sm" className="max-sm:h-11 max-sm:w-full" onClick={() => p.openEdit(rejected[0].slug)}>
						<History /> Fix a rejected submission
						<span className="rounded bg-destructive/10 px-1.5 text-xs text-destructive">{rejected.length}</span>
					</Button>
				)}
			</div>
		</header>
	)
}

function ProtoControls({ p }: { p: Proto }) {
	return (
		<details open className="mb-6 rounded-lg border border-dashed border-muted-foreground/40 px-3 py-2 text-sm">
			<summary className={cn("flex cursor-pointer items-center gap-2 rounded py-1 text-muted-foreground hover:text-foreground", focusRing)}>
				<FlaskConical className="size-4" aria-hidden /> Prototype controls (not part of the design)
			</summary>
			<p className="mt-1 text-xs text-muted-foreground">
				Signed in as <span className="font-mono">prototype-user</span> (stub). Nothing is saved or uploaded.
			</p>
			<div className="mt-2 flex flex-wrap gap-2 pb-1">
				<Button size="sm" variant="secondary" onClick={p.demos.selfHost}>
					Load self-host example
				</Button>
				<Button size="sm" variant="secondary" onClick={p.demos.fileTypes}>
					Load file-types example
				</Button>
				<Button size="sm" variant="secondary" onClick={p.demos.plexAmp}>
					Try plex-amp as new
				</Button>
				<Button size="sm" variant="secondary" onClick={p.demos.sonarr4k}>
					Edit: add 4k to sonarr
				</Button>
				<Button size="sm" variant="secondary" onClick={p.demos.fixKiosk}>
					Prefill the immich-kiosk fix
				</Button>
				<Button size="sm" variant="ghost" onClick={p.demos.reset}>
					Reset everything
				</Button>
			</div>
		</details>
	)
}

function countErrors(nudges: Nudge[]) {
	return nudges.filter((n) => n.level === "error").length
}
function plural(n: number, word: string, many = `${word}s`) {
	if (n === 1) return `${n} ${word}`
	return `${n} ${many}`
}

function SubmitMode({ p }: { p: Proto }) {
	const nudges = submissionNudges(p.subs)
	const openId = p.selected ?? p.subs[0]?.id
	const current = p.subs.find((s) => s.id === openId) ?? p.subs[0]
	const drop = useDrop((files) => p.setSubs((s) => addFilesAuto(s, files)))
	const errors = countErrors(nudges)
	const files = p.subs.reduce((n, s) => n + s.files.length, 0)
	const filled = p.subs.filter((s) => s.slug || s.files.length)
	const send = () => p.setResult({ kind: "new", payload: newPayload(filled) })
	const addCard = () => {
		const s = newSubmission()
		p.setSubs((x) => [...x, s])
		p.setSelected(s.id)
	}
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
			<main {...drop.props} className="relative min-w-0 space-y-3">
				{drop.active && (
					<div className="pointer-events-none absolute -inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5">
						<span className="rounded-md bg-background px-3 py-2 text-sm font-medium shadow-sm">Drop to sort the files into icons</span>
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					Drop SVG or PNG files anywhere here (5 MB max each). They're sorted into icons by name:{" "}
					<code className="whitespace-nowrap font-mono text-foreground">-light</code>,{" "}
					<code className="whitespace-nowrap font-mono text-foreground">-dark</code>,{" "}
					<code className="whitespace-nowrap font-mono text-foreground">-wordmark</code> and so on.
				</p>
				{p.subs.map((sub, i) => (
					<SubCard
						key={sub.id}
						sub={sub}
						index={i + 1}
						open={sub.id === openId}
						onToggle={() => p.setSelected(sub.id === openId ? "none" : sub.id)}
						p={p}
						nudges={nudges.filter((n) => n.subId === sub.id)}
						removable={p.subs.length > 1}
					/>
				))}
				<Button variant="outline" className="h-12 w-full border-dashed text-muted-foreground hover:text-foreground" onClick={addCard}>
					<Plus /> Add new submission
				</Button>
			</main>
			<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
				<PreviewPanel
					slug={current?.slug ?? ""}
					items={(current?.files ?? []).map((f) => ({ key: f.key, url: f.url, label: f.file.name }))}
					empty="Add a Base file to see it on light, dark and transparent backgrounds."
				/>
				<section className="space-y-3 rounded-xl border bg-background p-4">
					<h2 className="text-sm font-semibold">Ready to send</h2>
					<ul className="space-y-1.5">
						{p.subs.map((s) => {
							const e = countErrors(nudges.filter((n) => n.subId === s.id))
							return (
								<li key={s.id} className="flex items-center justify-between gap-2 text-sm">
									<button
										type="button"
										onClick={() => p.setSelected(s.id)}
										className={cn("min-w-0 truncate rounded text-left font-mono hover:underline", focusRing)}
									>
										{s.slug || "Untitled icon"}
									</button>
									{e > 0 && <StatusPill tone="rejected">{plural(e, "fix", "fixes")} needed</StatusPill>}
									{e === 0 && <StatusPill tone="new">{plural(s.files.length, "file")}</StatusPill>}
								</li>
							)
						})}
					</ul>
					<SendBlock errors={errors} files={files} count={filled.length} onSend={send} />
					<PayloadJson payload={newPayload(filled)} />
				</section>
			</aside>
			<MobileBar>
				<SendBlock errors={errors} files={files} count={filled.length} onSend={send} compact />
			</MobileBar>
		</div>
	)
}

function SendBlock({
	errors,
	files,
	count,
	onSend,
	compact,
}: {
	errors: number
	files: number
	count: number
	onSend: () => void
	compact?: boolean
}) {
	let hint = `Each icon goes to review as its own submission.`
	if (files === 0) hint = "Add files to at least one icon."
	if (errors > 0) hint = `Fix ${plural(errors, "issue")} first. They're listed on the cards.`
	return (
		<div className={cn("space-y-2", compact && "flex items-center gap-3 space-y-0")}>
			<p className={cn("text-xs", errors > 0 ? "text-destructive" : "text-muted-foreground", compact && "min-w-0 flex-1")}>{hint}</p>
			<Button className={cn("w-full max-sm:h-11", compact && "w-auto shrink-0")} disabled={errors > 0 || files === 0} onClick={onSend}>
				{count > 0 ? `Send ${plural(count, "submission")} for review` : "Send for review"}
			</Button>
		</div>
	)
}

function MobileBar({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
			{children}
		</div>
	)
}

function SubCard({
	sub,
	index,
	open,
	onToggle,
	p,
	nudges,
	removable,
}: {
	sub: DraftSubmission
	index: number
	open: boolean
	onToggle: () => void
	p: Proto
	nudges: Nudge[]
	removable: boolean
}) {
	const set = p.setSubs
	const errors = countErrors(nudges)
	const hints = nudges.length - errors
	const base = sub.files.find((f) => f.key === "base")
	const customs = sub.files.filter((f) => f.custom)
	const bodyId = `card-${sub.id}`
	return (
		<article className={cn("rounded-xl border bg-background", open && "border-foreground/30 shadow-sm")}>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				aria-controls={bodyId}
				className={cn("flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-left", focusRing)}
			>
				{base && <Preview src={base.url} bg="checker" className="size-11" />}
				{!base && (
					<span
						className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground"
						aria-hidden
					>
						<UploadCloud className="size-4" />
					</span>
				)}
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">#{index}</span>
						<span className={cn("truncate font-mono font-semibold", !sub.slug && "font-sans font-normal text-muted-foreground")}>
							{sub.slug || "Untitled icon"}
						</span>
					</span>
					<span className="mt-0.5 block truncate text-xs text-muted-foreground">
						{sub.files.length === 0 && "No files yet"}
						{sub.files.length > 0 && [...new Set(sub.files.map((f) => slotTitle(f.key)))].join(" · ")}
					</span>
				</span>
				{errors > 0 && <StatusPill tone="rejected">{plural(errors, "fix", "fixes")}</StatusPill>}
				{errors === 0 && hints > 0 && <StatusPill tone="awaiting">{plural(hints, "suggestion")}</StatusPill>}
				{errors === 0 && hints === 0 && sub.files.length > 0 && <Check className="size-4 text-emerald-600" aria-label="Ready" />}
				<ChevronDown
					className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
					aria-hidden
				/>
			</button>
			{open && (
				<div id={bodyId} className="space-y-5 border-t px-3 pt-4 pb-4 sm:px-4">
					<div className="flex flex-wrap items-end gap-2">
						<div className="min-w-0 flex-1 space-y-1.5">
							<label htmlFor={`slug-${sub.id}`} className="text-sm font-medium">
								Slug
							</label>
							<input
								id={`slug-${sub.id}`}
								value={sub.slug}
								onChange={(e) => set((s) => renameSub(s, sub.id, e.target.value))}
								placeholder="my-app"
								autoComplete="off"
								className={cn("h-10 w-full rounded-md border bg-transparent px-3 font-mono text-sm max-sm:h-11", focusRing)}
							/>
						</div>
						<Button
							variant="outline"
							className="h-10 max-sm:h-11"
							onClick={() => pickFiles((files) => set((s) => addFilesTo(s, sub.id, files)))}
						>
							<Upload /> Add files
						</Button>
						{removable && (
							<Button
								variant="ghost"
								className="h-10 text-muted-foreground hover:text-destructive max-sm:h-11"
								onClick={() => set((s) => removeSub(s, sub.id))}
							>
								<Trash2 /> <span className="max-sm:sr-only">Remove icon</span>
							</Button>
						)}
					</div>
					<NudgeList nudges={nudges} onAction={p.run} />
					{sub.files.length === 0 && (
						<button
							type="button"
							onClick={() => pickFiles((files) => set((s) => addFilesTo(s, sub.id, files)))}
							className={cn(
								"flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground",
								focusRing,
							)}
						>
							<UploadCloud className="size-6" aria-hidden />
							<span className="font-medium text-foreground">Drop all files for this icon, or choose them</span>
							<span className="text-xs">my-app.svg, my-app-light.svg, my-app-dark.svg… are placed in the right slots.</span>
						</button>
					)}
					<section className="space-y-2">
						<h3 className="text-sm font-semibold">Variants</h3>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{SLOTS.map((slot) => {
								const f = sub.files.find((x) => x.key === slot.key)
								return (
									<SlotTile
										key={slot.key}
										slug={sub.slug}
										slotKey={slot.key}
										title={slot.title}
										src={f?.url}
										sourceName={f?.file.name}
										note={f?.mappedFrom && `from ${f.file.name}`}
										dragId={f?.id}
										onFile={(file) => set((s) => setSlot(s, sub.id, slot.key, file))}
										onClear={f && (() => set((s) => removeFile(s, f.id)))}
										onFileId={(id) => set((s) => moveFile(s, id, sub.id, slot.key))}
									/>
								)
							})}
							{customs.map((f) => (
								<SlotTile
									key={f.id}
									slug={sub.slug}
									slotKey={f.key}
									title={`${f.key} (custom)`}
									src={f.url}
									sourceName={f.file.name}
									dragId={f.id}
									onFile={(file) => set((s) => setSlot(s, sub.id, f.key, file, true))}
									onClear={() => set((s) => removeFile(s, f.id))}
								/>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Light is light-coloured artwork for dark backgrounds. Dark is dark artwork for light backgrounds.
						</p>
						<CustomVariantAdder
							slug={sub.slug}
							taken={sub.files.map((f) => f.key)}
							onAdd={(name, file) => set((s) => setSlot(s, sub.id, name, file, true))}
						/>
					</section>
					<section className="space-y-4">
						<AliasInput id={`alias-${sub.id}`} value={sub.aliases} onChange={(aliases) => set((s) => setMeta(s, sub.id, { aliases }))} />
						<CategoryChips
							idPrefix={sub.id}
							value={sub.categories}
							onChange={(categories) => set((s) => setMeta(s, sub.id, { categories }))}
						/>
					</section>
				</div>
			)}
		</article>
	)
}

function PreviewPanel({ slug, items, empty }: { slug: string; items: Shown[]; empty: string }) {
	const base = items.find((i) => i.key === "base")
	const bgs: { bg: Bg; label: string }[] = [
		{ bg: "light", label: "Light page" },
		{ bg: "dark", label: "Dark page" },
		{ bg: "checker", label: "Transparent" },
	]
	return (
		<section className="space-y-4 rounded-xl border bg-background p-4" aria-label="Preview">
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="text-sm font-semibold">Preview</h2>
				<span className="truncate font-mono text-xs text-muted-foreground">{slug}</span>
			</div>
			{base && (
				<div className="grid grid-cols-3 gap-2">
					{bgs.map(({ bg, label }) => (
						<figure key={bg} className="space-y-1 text-center">
							<Preview src={base.url} bg={bg} className="aspect-square size-auto w-full p-3" alt={`${slug} base on ${label}`} />
							<figcaption className="text-xs text-muted-foreground">{label}</figcaption>
						</figure>
					))}
				</div>
			)}
			{!base && <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">{empty}</p>}
			{items.length > 1 && (
				<div>
					<h3 className="mb-2 text-xs font-medium text-muted-foreground">Each variant on the background it's made for</h3>
					<ul className="grid grid-cols-3 gap-2">
						{items.map((i) => (
							<li key={i.key + i.url} className="min-w-0 text-center">
								<Preview src={i.url} bg={bgForKey(i.key)} className="aspect-square size-auto w-full p-2" alt={i.label} />
								<div className="mt-1 truncate text-xs" title={targetFilename(slug, i.key)}>
									{slotTitle(i.key)}
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	)
}

function proposedItems(md: EditDraft) {
	const items: Shown[] = []
	for (const r of editRows(md)) {
		if (r.op?.type === "remove") continue
		if (r.op) items.push({ key: r.key, url: r.op.url, label: r.op.file.name })
		else if (r.current) items.push({ key: r.key, url: r.current.url, label: r.current.filename })
	}
	return items
}

function EditMode({ p }: { p: Proto }) {
	const md = p.edit
	const e = findExisting(md.slug ?? "")
	const set = (fn: (m: EditDraft) => EditDraft) => p.setEdit(fn)
	if (!e)
		return (
			<section className="space-y-3 rounded-xl border bg-background p-4 sm:p-6">
				<div>
					<h2 className="font-semibold">Which icon do you want to change?</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Pick an icon from the collection or a submission awaiting review. A reviewer checks your changes before they go live.
					</p>
				</div>
				<ExistingPicker onPick={p.openEdit} />
			</section>
		)
	const inPlace = isInPlace(e)
	const nudges = editNudges(md)
	const errors = countErrors(nudges)
	const lines = diffLines(md)
	const rows = editRows(md)
	const missing = SLOTS.filter((s) => !rows.some((r) => r.key === s.key))
	const pill = pillFor(e)
	let action = "Send update proposal"
	if (inPlace) action = "Save changes"
	if (e.status === "rejected") action = "Resubmit for review"
	const canSend = errors === 0 && (lines.length > 0 || Boolean(md.note))
	const send = () => {
		const payload = editPayload(md)
		if (!payload) return
		if (inPlace) applyResubmit(e.slug)
		p.setResult({ kind: "edit", payload, existing: e })
	}
	let hint = "Make a change to send it."
	if (canSend) hint = inPlace ? "Your submission is updated in place, same id." : "Sent as one update proposal."
	if (errors > 0) hint = `Fix ${plural(errors, "issue")} first.`
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
			<main className="min-w-0 space-y-4">
				<section className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3 sm:p-4">
					<Preview src={e.variants[0].url} bg="checker" className="size-12" />
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-mono text-lg font-semibold">{e.slug}</span>
							<StatusPill tone={pill.tone}>{pill.label}</StatusPill>
						</div>
						<div className="text-xs text-muted-foreground">
							{e.source === "collection" && "Published icon"}
							{e.source === "submission" && `Submitted by ${e.mine ? "you" : e.by}`}
							{e.submissionId && <span className="font-mono"> · #{e.submissionId}</span>}
						</div>
					</div>
					<Button variant="ghost" size="sm" className="max-sm:h-11 max-sm:w-full" onClick={() => p.setEdit({ ...md, slug: null, ops: {} })}>
						Choose another icon
					</Button>
				</section>
				{e.status === "rejected" && (
					<section className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
						<h2 className="text-sm font-semibold">Rejected in round {e.round ?? 1}. Here is what the reviewer asked for:</h2>
						<blockquote className="rounded-md bg-background/70 px-3 py-2 text-sm text-pretty">{e.rejection}</blockquote>
						<p className="text-sm text-muted-foreground">Rejections aren't final. Fix it and resubmit; it goes back to the review queue.</p>
					</section>
				)}
				{inPlace && e.status === "pending" && (
					<p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
						This is your own submission. Changes are saved into it directly and it stays in the review queue.
					</p>
				)}
				{!inPlace && (
					<p className="text-sm text-muted-foreground">
						Your changes are sent as an update proposal. Removals are flagged for the reviewer.
					</p>
				)}
				<NudgeList nudges={nudges} onAction={p.run} />
				<section className="space-y-2">
					<h3 className="text-sm font-semibold">Variants</h3>
					<ul className="divide-y rounded-xl border bg-background">
						{rows.map((r) => (
							<EditRow key={r.key} slug={e.slug} row={r} inPlace={inPlace} set={set} />
						))}
						<li className="space-y-3 p-3">
							<div className="text-sm font-medium">Add a variant</div>
							{missing.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{missing.map((m) => (
										<Button
											key={m.key}
											variant="outline"
											size="sm"
											className="border-dashed max-sm:h-11"
											onClick={() => pickFiles((f) => f[0] && set((x) => putVariant(x, m.key, f[0])), false)}
										>
											<Plus /> {m.title}
										</Button>
									))}
								</div>
							)}
							<CustomVariantAdder
								slug={e.slug}
								taken={rows.map((r) => r.key)}
								onAdd={(name, file) => set((x) => putVariant(x, name, file))}
							/>
						</li>
					</ul>
				</section>
				<section className="space-y-4 rounded-xl border bg-background p-4">
					<AliasInput id="edit-aliases" value={md.aliases} onChange={(aliases) => set((x) => ({ ...x, aliases }))} />
					<CategoryChips idPrefix="edit" value={md.categories} onChange={(categories) => set((x) => ({ ...x, categories }))} />
					<div className="space-y-1.5">
						<label htmlFor="edit-note" className="text-sm font-medium">
							Note for the reviewer <span className="font-normal text-muted-foreground">(optional)</span>
						</label>
						<textarea
							id="edit-note"
							value={md.note}
							onChange={(ev) => set((x) => ({ ...x, note: ev.target.value }))}
							placeholder="What changed and why"
							rows={2}
							className={cn("w-full rounded-md border bg-background p-2 text-sm placeholder:text-muted-foreground", focusRing)}
						/>
					</div>
				</section>
			</main>
			<aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
				<PreviewPanel slug={e.slug} items={proposedItems(md)} empty="This icon has no Base after your changes." />
				<section className="space-y-3 rounded-xl border bg-background p-4">
					<h2 className="text-sm font-semibold">{inPlace ? "Changes to your submission" : "Changes in this proposal"}</h2>
					{lines.length === 0 && (
						<p className="text-sm text-muted-foreground">No changes yet. Add, replace or remove a variant, or edit the details.</p>
					)}
					<DiffLines lines={lines} />
					<div className="space-y-2">
						<p className={cn("text-xs", errors > 0 ? "text-destructive" : "text-muted-foreground")}>{hint}</p>
						<Button className="w-full max-sm:h-11" disabled={!canSend} onClick={send}>
							{action}
						</Button>
					</div>
					<PayloadJson payload={editPayload(md)} />
				</section>
			</aside>
			<MobileBar>
				<div className="flex items-center gap-3">
					<p className={cn("min-w-0 flex-1 text-xs", errors > 0 ? "text-destructive" : "text-muted-foreground")}>
						{lines.length > 0 ? plural(lines.length, "change") : hint}
					</p>
					<Button className="h-11 shrink-0" disabled={!canSend} onClick={send}>
						{action}
					</Button>
				</div>
			</MobileBar>
		</div>
	)
}

function DiffLines({ lines }: { lines: ReturnType<typeof diffLines> }) {
	if (!lines.length) return null
	return (
		<ul className="space-y-1 font-mono text-xs">
			{lines.map((l, i) => (
				<li
					key={i}
					className={cn("rounded px-2 py-1 break-all", {
						"bg-emerald-500/10 text-emerald-800 dark:text-emerald-200": l.sign === "+",
						"bg-amber-500/10 text-amber-800 dark:text-amber-200": l.sign === "~",
						"bg-destructive/10 text-destructive": l.sign === "−",
					})}
				>
					{l.sign} {l.text}
				</li>
			))}
		</ul>
	)
}

function EditRow({
	slug,
	row,
	inPlace,
	set,
}: {
	slug: string
	row: ReturnType<typeof editRows>[number]
	inPlace: boolean
	set: (fn: (m: EditDraft) => EditDraft) => void
}) {
	const { key, current, op } = row
	let sign = "="
	let state = "Unchanged"
	let tone = ""
	if (op?.type === "add") {
		sign = "+"
		state = "New"
		tone = "bg-emerald-500/5"
	}
	if (op?.type === "replace") {
		sign = "~"
		state = "Replaced"
		tone = "bg-amber-500/5"
	}
	if (op?.type === "remove") {
		sign = "−"
		state = inPlace ? "Removed" : "Removed · flagged for review"
		tone = "bg-destructive/5"
	}
	const title = isWellKnownTitle(key)
	return (
		<li className={cn("space-y-2 p-3", tone)}>
			<div className="flex flex-wrap items-center gap-3">
				<span className="w-4 text-center font-mono font-semibold" aria-hidden>
					{sign}
				</span>
				<div className="flex items-center gap-1.5">
					{current && (
						<Preview src={current.url} bg={bgForKey(key)} className={cn("size-11", op && "opacity-40")} alt={`Current ${title}`} />
					)}
					{op && op.type !== "remove" && (
						<>
							{current && (
								<span className="text-muted-foreground" aria-hidden>
									→
								</span>
							)}
							<Preview src={op.url} bg={bgForKey(key)} className="size-11" alt={`New ${title}`} />
						</>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium">
						{title} <span className="font-normal text-muted-foreground">· {state}</span>
					</div>
					<div className={cn("truncate font-mono text-xs text-muted-foreground", op?.type === "remove" && "line-through")}>
						{targetFilename(slug, key)}
					</div>
				</div>
				<div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
					{op?.type !== "remove" && (
						<Button
							size="sm"
							variant="ghost"
							className="max-sm:h-11"
							onClick={() => pickFiles((f) => f[0] && set((m) => putVariant(m, key, f[0])), false)}
						>
							<Upload /> {current ? "Replace" : "Choose another file"}
						</Button>
					)}
					{current && !op && key !== "base" && (
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive max-sm:h-11"
							onClick={() => set((m) => removeVariantOp(m, key))}
						>
							<Trash2 /> Remove
						</Button>
					)}
					{op && (
						<Button size="sm" variant="ghost" className="max-sm:h-11" onClick={() => set((m) => undoOp(m, key))}>
							<Undo2 /> Undo
						</Button>
					)}
				</div>
			</div>
			{op?.type === "remove" && (
				<div className="pl-7">
					<label htmlFor={`rm-${key}`} className="sr-only">
						Reason for removing {title} (optional)
					</label>
					<input
						id={`rm-${key}`}
						value={op.note}
						onChange={(ev) => set((m) => setRemovalNote(m, key, ev.target.value))}
						placeholder="Why remove it? (optional)"
						className={cn(
							"h-9 w-full rounded-md border bg-background px-2 text-sm placeholder:text-muted-foreground max-sm:h-11",
							focusRing,
						)}
					/>
				</div>
			)}
		</li>
	)
}

function isWellKnownTitle(key: string) {
	const slot = SLOTS.find((s) => s.key === key)
	if (slot) return slot.title
	return `${key} (custom)`
}

function ResultView({ p }: { p: Proto }) {
	const r = p.result
	if (!r) return null
	const backToForm = () => {
		p.setResult(null)
		p.setSubs([newSubmission()])
		p.setSelected(null)
		p.setMode("submit")
	}
	if (r.kind === "new")
		return (
			<section className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-background p-5 sm:p-6" aria-live="polite">
				<div className="flex items-center gap-3">
					<span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
						<Check className="size-5" aria-hidden />
					</span>
					<div>
						<h2 className="text-lg font-semibold">Sent for review</h2>
						<p className="text-sm text-muted-foreground">
							{plural(r.payload.length, "submission")} added to the review queue. You'll be notified when a reviewer responds.
						</p>
					</div>
				</div>
				<ul className="divide-y rounded-lg border">
					{r.payload.map((s) => (
						<li key={s.slug} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
							<span className="font-mono text-sm font-semibold">{s.slug}</span>
							<span className="flex items-center gap-2 text-xs text-muted-foreground">
								{plural(s.variants.length, "file")}
								<StatusPill tone="awaiting">Awaiting review</StatusPill>
							</span>
						</li>
					))}
				</ul>
				<div className="flex flex-wrap gap-2">
					<Button className="max-sm:h-11 max-sm:w-full" onClick={backToForm}>
						Submit more icons
					</Button>
				</div>
				<PayloadJson payload={r.payload} open />
			</section>
		)
	const payload = r.payload
	const e = r.existing
	let title = "Update proposal sent"
	let body = `Your changes to ${e.slug} are awaiting review. Nothing changes in the collection until a reviewer approves them.`
	if (payload.kind === "edit-in-place") {
		title = "Changes saved"
		body = `${e.slug} (#${e.submissionId}) was updated in place and stays in the review queue.`
	}
	if (payload.kind === "resubmit") {
		title = "Resubmitted for review"
		body = `${e.slug} (#${e.submissionId}) is back in the review queue. Rejections aren't final: if the reviewer asks for more changes, fix them and resubmit again.`
	}
	let round = 1
	if ("round" in payload) round = payload.round ?? 1
	return (
		<section className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-background p-5 sm:p-6" aria-live="polite">
			<div className="flex items-start gap-3">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
					<Check className="size-5" aria-hidden />
				</span>
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">{title}</h2>
					<p className="text-sm text-pretty text-muted-foreground">{body}</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
				<span className="font-mono text-sm font-semibold">
					{e.slug}
					{e.submissionId && <span className="font-normal text-muted-foreground"> #{e.submissionId}</span>}
				</span>
				<StatusPill tone="awaiting">{round > 1 ? `Awaiting review · round ${round}` : "Awaiting review"}</StatusPill>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button className="max-sm:h-11 max-sm:w-full" onClick={backToForm}>
					Submit new icons
				</Button>
				<Button variant="outline" className="max-sm:h-11 max-sm:w-full" onClick={() => p.openEdit(e.slug)}>
					Edit {e.slug} again
				</Button>
			</div>
			<PayloadJson payload={payload} open />
		</section>
	)
}
