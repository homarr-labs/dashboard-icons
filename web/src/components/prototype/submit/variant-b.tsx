"use client"
// PROTOTYPE pass 2 variant B "Adaptive page": one column with a segmented control; Submit one = vertical slot list, Submit many = compact spreadsheet (flat import + merge suggestions), Modify one = current/proposed table.
import { FileUp, History, ListPlus, Plus, Trash2, Undo2, Upload, Wand2, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFilesFlat,
	addFilesTo,
	bgForKey,
	bgLabel,
	CATEGORIES,
	type DraftSubmission,
	EXISTING,
	existingLabel,
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
	sanitizeSlug,
	setMeta,
	setSlot,
	submissionNudges,
	targetFilename,
	undoOp,
} from "./mock"
import {
	AliasInput,
	bgClass,
	CategoryChips,
	CustomVariantAdder,
	DemoButtons,
	DiffView,
	dragFile,
	errorsOf,
	MODES,
	NewPayloadView,
	NudgeList,
	Preview,
	type Proto,
	ProtoNotice,
	pickFiles,
	SubmitButton,
	useDrop,
	usePrototype,
} from "./shared"

export function VariantB() {
	const p = usePrototype()
	return (
		<div className="mx-auto max-w-[1400px] px-4 py-6 sm:py-10">
			<div className="mx-auto mb-6 max-w-4xl space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-bold">Submit</h1>
					<div role="tablist" className="inline-flex rounded-lg bg-muted p-1">
						{MODES.map((m) => (
							<button
								key={m.id}
								type="button"
								role="tab"
								aria-selected={p.mode === m.id}
								onClick={() => p.setMode(m.id)}
								className={cn(
									"rounded-md px-3 py-1.5 text-sm font-medium",
									p.mode === m.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{m.title}
							</button>
						))}
					</div>
				</div>
				<p className="text-sm text-muted-foreground">{MODES.find((m) => m.id === p.mode)?.desc}</p>
				<ProtoNotice />
				<DemoButtons p={p} flatSelfHost />
			</div>
			{p.mode === "one" && <OneMode p={p} />}
			{p.mode === "many" && <ManyMode p={p} />}
			{p.mode === "modify" && <ModifyMode p={p} />}
		</div>
	)
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
	return (
		<section className={cn("mx-auto max-w-4xl rounded-xl border bg-background p-4 sm:p-6", className)}>
			<h2 className="mb-3 text-sm font-semibold">{title}</h2>
			{children}
		</section>
	)
}

function SlotRow({
	slug,
	k,
	title,
	hint,
	src,
	source,
	onFile,
	onClear,
	extra,
}: {
	slug: string
	k: string
	title: string
	hint?: string
	src?: string
	source?: string
	onFile: (f: File) => void
	onClear?: () => void
	extra?: ReactNode
}) {
	const drop = useDrop((files) => files[0] && onFile(files[0]))
	return (
		<li {...drop.props} className={cn("flex items-center gap-3 py-2", drop.active && "bg-primary/5")}>
			{src && <Preview src={src} bg={bgForKey(k)} className="size-14" />}
			{!src && (
				<span
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed opacity-60",
						bgClass(bgForKey(k)),
					)}
				/>
			)}
			<div className="min-w-0 flex-1">
				<div className="text-sm font-medium">
					{title} <span className="text-[11px] font-normal text-muted-foreground">· {bgLabel(bgForKey(k))}</span>
				</div>
				{hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
				<div className="truncate font-mono text-[11px]">
					{source && <span className="text-muted-foreground">{source} → </span>}
					{targetFilename(slug, k)}
				</div>
				{extra}
			</div>
			<Button size="sm" variant="outline" onClick={() => pickFiles((f) => f[0] && onFile(f[0]), false)}>
				<Upload /> {src ? "Replace" : "Upload"}
			</Button>
			{onClear && (
				<Button size="icon" variant="ghost" className="size-8" aria-label={`Clear ${title}`} onClick={onClear}>
					<X />
				</Button>
			)}
		</li>
	)
}

function OneMode({ p }: { p: Proto }) {
	const sub = p.one[0]
	const nudges = submissionNudges(p.one)
	const set = p.setOne
	const drop = useDrop((files) => set((s) => addFilesTo(s, sub.id, files)))
	const rejected = EXISTING.filter((e) => e.mine && e.status === "rejected")
	return (
		<div className="space-y-4">
			{rejected.length > 0 && (
				<div className="mx-auto flex max-w-4xl items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
					<History className="size-3.5" />
					You have {rejected.length} rejected submission: <span className="font-mono">{rejected.map((r) => r.slug).join(", ")}</span>
					<button type="button" onClick={p.demos.fixRejected} className="ml-auto font-medium underline-offset-2 hover:underline">
						Fix & resubmit
					</button>
				</div>
			)}
			<Section title="Icon">
				<input
					value={sub.slug}
					onChange={(e) => set((s) => renameSub(s, sub.id, e.target.value))}
					placeholder="my-app"
					aria-label="Icon slug"
					className="h-10 w-full rounded-md border bg-transparent px-3 font-mono text-lg font-semibold"
				/>
				<div className="mt-3">
					<NudgeList nudges={nudges} onAction={(a) => p.run(a, "one")} />
				</div>
			</Section>
			<Section title="Files">
				<button
					type="button"
					{...drop.props}
					onClick={() => pickFiles((files) => set((s) => addFilesTo(s, sub.id, files)))}
					className={cn(
						"mb-2 w-full rounded-lg border-2 border-dashed px-3 py-3 text-xs text-muted-foreground",
						drop.active && "border-primary bg-primary/5",
					)}
				>
					Drop several files here and they're placed by name (-light, -dark, -white, -black, -wordmark…)
				</button>
				<ul className="divide-y">
					{SLOTS.map((slot) => {
						const f = sub.files.find((x) => x.key === slot.key)
						const twins = sub.files.filter((x) => x.key === slot.key)
						return (
							<SlotRow
								key={slot.key}
								slug={sub.slug}
								k={slot.key}
								title={slot.title}
								hint={slot.hint}
								src={f?.url}
								source={twins.map((t) => `${t.file.name}${t.mappedFrom ? ` (${t.mappedFrom}→${slot.key})` : ""}`).join(" + ")}
								onFile={(file) => set((s) => setSlot(s, sub.id, slot.key, file))}
								onClear={f && (() => set((s) => removeFile(s, f.id)))}
							/>
						)
					})}
					{sub.files
						.filter((f) => f.custom)
						.map((f) => (
							<SlotRow
								key={f.id}
								slug={sub.slug}
								k={f.key}
								title={`${f.key} (custom)`}
								src={f.url}
								source={f.file.name}
								onFile={(file) => set((s) => setSlot(s, sub.id, f.key, file, true))}
								onClear={() => set((s) => removeFile(s, f.id))}
							/>
						))}
				</ul>
				<div className="mt-3">
					<CustomVariantAdder
						slug={sub.slug}
						taken={sub.files.map((f) => f.key)}
						onAdd={(name, file) => set((s) => setSlot(s, sub.id, name, file, true))}
					/>
				</div>
			</Section>
			<Section title="Aliases & categories">
				<div className="space-y-2">
					<AliasInput value={sub.aliases} onChange={(aliases) => set((s) => setMeta(s, sub.id, { aliases }))} />
					<CategoryChips value={sub.categories} onChange={(categories) => set((s) => setMeta(s, sub.id, { categories }))} />
				</div>
			</Section>
			<Section title="What will be sent">
				<NewPayloadView subs={p.one} />
				<SubmitButton className="mt-4" payload={newPayload(p.one)[0]} label="Submit icon" blocking={errorsOf(nudges)} />
			</Section>
		</div>
	)
}

function splitList(s: string) {
	return s
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)
}

function ManyMode({ p }: { p: Proto }) {
	const nudges = submissionNudges(p.many)
	const suggestions = nudges.filter(
		(n) => (n.id.endsWith("-variantof") || n.id.endsWith("-prefix")) && n.actions[0]?.action.kind === "subs",
	)
	const tableDrop = useDrop((files) => p.setMany((s) => addFilesFlat(s, files)))
	const [cat, setCat] = useState("")
	const applyAll = () =>
		p.setMany((s) =>
			suggestions.reduce((acc, n) => {
				const a = n.actions[0].action
				if (a.kind === "subs") return a.fn(acc)
				return acc
			}, s),
		)
	return (
		<div className="space-y-3">
			<div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur">
				<Button size="sm" variant="outline" onClick={() => p.setMany((s) => [...s, newSubmission()])}>
					<Plus /> Add new
				</Button>
				<Button size="sm" variant="outline" onClick={() => pickFiles((files) => p.setMany((s) => addFilesFlat(s, files)))}>
					<FileUp /> Import files (one row each)
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() =>
						p.setMany((s) => [
							...s,
							...splitList(window.prompt("Icon slugs, comma separated") || "")
								.map(sanitizeSlug)
								.filter(Boolean)
								.map((n) => newSubmission(n)),
						])
					}
				>
					<ListPlus /> Paste names
				</Button>
				{suggestions.length > 0 && (
					<Button size="sm" variant="secondary" onClick={applyAll}>
						<Wand2 /> Apply {suggestions.length} “variant of” suggestion{suggestions.length === 1 ? "" : "s"}
					</Button>
				)}
				<select
					aria-label="Add category to every row"
					value={cat}
					onChange={(e) => {
						const c = e.target.value
						setCat("")
						if (c) p.setMany((s) => s.map((x) => ({ ...x, categories: [...new Set([...x.categories, c])] })))
					}}
					className="h-8 rounded-md border bg-background px-2 text-xs"
				>
					<option value="">+ category on all rows…</option>
					{CATEGORIES.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
				<span className="text-xs text-muted-foreground">
					{p.many.length} submissions · <span className={cn(errorsOf(nudges) > 0 && "text-red-600")}>{errorsOf(nudges)} blocking</span>
				</span>
			</div>
			<div
				{...tableDrop.props}
				className={cn("overflow-x-auto rounded-lg border bg-background", tableDrop.active && "ring-2 ring-primary")}
			>
				<table className="w-full border-collapse text-xs">
					<thead className="bg-muted/50 text-left">
						<tr>
							<th className="border-b px-2 py-2 font-medium">#</th>
							<th className="sticky left-0 z-10 min-w-40 border-b border-r bg-muted px-2 py-2 font-medium">Icon slug</th>
							{SLOTS.map((s) => (
								<th key={s.key} className="border-b border-r px-1 py-1 text-center font-medium" title={s.hint}>
									<div>{s.title}</div>
									<div className="text-[9px] font-normal text-muted-foreground">{bgLabel(s.bg).replace("on ", "")}</div>
								</th>
							))}
							<th className="min-w-56 border-b border-r px-2 py-2 font-medium">Custom variants</th>
							<th className="min-w-40 border-b border-r px-2 py-2 font-medium">Categories</th>
							<th className="min-w-32 border-b border-r px-2 py-2 font-medium">Aliases</th>
							<th className="border-b" />
						</tr>
					</thead>
					<tbody>
						{p.many.map((sub, i) => (
							<Row key={sub.id} i={i + 1} sub={sub} p={p} nudges={nudges} />
						))}
						{p.many.length === 0 && (
							<tr>
								<td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
									Drop files here (one row per file), paste names, or load an example.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<Section title="What will be sent" className="max-w-none">
				<NewPayloadView subs={p.many} />
				<SubmitButton
					className="mt-4"
					payload={p.many.length ? newPayload(p.many) : null}
					label={`Send ${p.many.length} submissions`}
					blocking={errorsOf(nudges)}
				/>
			</Section>
		</div>
	)
}

function Row({ i, sub, p, nudges }: { i: number; sub: DraftSubmission; p: Proto; nudges: ReturnType<typeof submissionNudges> }) {
	const mine = nudges.filter((n) => n.subId === sub.id)
	const set = p.setMany
	return (
		<>
			<tr className="group hover:bg-muted/30">
				<td className="border-b px-2 text-muted-foreground">{i}</td>
				<td className="sticky left-0 z-10 border-b border-r bg-background p-1 group-hover:bg-muted">
					<input
						value={sub.slug}
						onChange={(e) => set((s) => renameSub(s, sub.id, e.target.value))}
						placeholder="slug"
						aria-label="Icon slug"
						className="h-8 w-full rounded bg-transparent px-1.5 font-mono font-semibold outline-none focus:ring-1 focus:ring-primary"
					/>
				</td>
				{SLOTS.map((slot) => (
					<Cell key={slot.key} sub={sub} k={slot.key} set={set} />
				))}
				<td className="border-b border-r p-1">
					<div className="flex flex-wrap items-center gap-1">
						{sub.files
							.filter((f) => f.custom)
							.map((f) => (
								<span
									key={f.id}
									{...dragFile(f.id)}
									className="inline-flex cursor-grab items-center gap-1 rounded border bg-muted/40 py-0.5 pr-1 pl-0.5"
									title={targetFilename(sub.slug, f.key)}
								>
									<Preview src={f.url} bg={bgForKey(f.key)} className="size-6 p-0.5" />
									<span className="font-mono text-[10px]">{f.key}</span>
									<button type="button" aria-label={`Remove ${f.key}`} onClick={() => set((s) => removeFile(s, f.id))}>
										<X className="size-3" />
									</button>
								</span>
							))}
						<CustomVariantAdder
							compact
							slug={sub.slug}
							taken={sub.files.map((f) => f.key)}
							onAdd={(name, file) => set((s) => setSlot(s, sub.id, name, file, true))}
						/>
					</div>
				</td>
				<td className="border-b border-r p-1">
					<CommitInput value={sub.categories.join(", ")} onCommit={(v) => set((s) => setMeta(s, sub.id, { categories: splitList(v) }))} />
				</td>
				<td className="border-b border-r p-1">
					<CommitInput value={sub.aliases.join(", ")} onCommit={(v) => set((s) => setMeta(s, sub.id, { aliases: splitList(v) }))} />
				</td>
				<td className="border-b px-1">
					<button
						type="button"
						aria-label="Delete row"
						onClick={() => set((s) => removeSub(s, sub.id))}
						className="text-muted-foreground hover:text-destructive"
					>
						<Trash2 className="size-3.5" />
					</button>
				</td>
			</tr>
			{mine.length > 0 && (
				<tr>
					<td className="border-b" />
					<td colSpan={11} className="border-b px-2 py-1">
						<NudgeList compact nudges={mine} onAction={(a) => p.run(a, "many")} />
					</td>
				</tr>
			)}
		</>
	)
}

function Cell({ sub, k, set }: { sub: DraftSubmission; k: string; set: (fn: (s: Subs) => Subs) => void }) {
	const files = sub.files.filter((f) => f.key === k)
	const f = files[0]
	const drop = useDrop(
		(fs) => fs[0] && set((s) => setSlot(s, sub.id, k, fs[0])),
		(id) => set((s) => moveFile(s, id, sub.id, k)),
	)
	return (
		<td {...drop.props} className={cn("border-b border-r p-1 text-center", drop.active && "bg-primary/10")}>
			{f && (
				<div className="group/cell relative mx-auto size-10" {...dragFile(f.id)} title={`${f.file.name} → ${targetFilename(sub.slug, k)}`}>
					<Preview src={f.url} bg={bgForKey(k)} className="size-10 cursor-grab p-1" />
					{files.length > 1 && (
						<span className="absolute -top-1 -left-1 rounded-full bg-red-600 px-1 text-[9px] text-white">{files.length}</span>
					)}
					{f.mappedFrom && (
						<span className="absolute -bottom-1 left-0 rounded bg-sky-600 px-0.5 text-[8px] text-white">{f.mappedFrom}</span>
					)}
					<button
						type="button"
						aria-label="Clear cell"
						onClick={() => set((s) => removeFile(s, f.id))}
						className="absolute -top-1.5 -right-1.5 hidden rounded-full bg-background p-0.5 shadow group-hover/cell:block"
					>
						<X className="size-3" />
					</button>
				</div>
			)}
			{!f && (
				<button
					type="button"
					aria-label={`Upload ${k}`}
					onClick={() => pickFiles((fs) => fs[0] && set((s) => setSlot(s, sub.id, k, fs[0])), false)}
					className={cn(
						"mx-auto flex size-10 items-center justify-center rounded border border-dashed opacity-50 hover:opacity-100",
						bgClass(bgForKey(k)),
					)}
				>
					<Plus className="size-3.5 text-zinc-500" />
				</button>
			)}
		</td>
	)
}

function CommitInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
	const [text, setText] = useState<string | null>(null)
	return (
		<input
			value={text ?? value}
			onFocus={() => setText(value)}
			onChange={(e) => setText(e.target.value)}
			onBlur={() => {
				if (text !== null) onCommit(text)
				setText(null)
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") (e.target as HTMLInputElement).blur()
			}}
			className="h-8 w-full rounded bg-transparent px-1.5 outline-none focus:ring-1 focus:ring-primary"
		/>
	)
}

function ModifyMode({ p }: { p: Proto }) {
	const md = p.modify
	const e = findExisting(md.slug ?? "")
	const nudges = modifyNudges(md)
	const set = (fn: (m: ModifyDraft) => ModifyDraft) => p.setModify(fn)
	const [q, setQ] = useState("")
	const matches = EXISTING.filter((x) => q && x.slug.includes(sanitizeSlug(q)))
	const keys = e
		? [...SLOTS.map((s) => s.key as string), ...e.variants.map((v) => v.key), ...Object.keys(md.ops)].filter(
				(k, i, a) => a.indexOf(k) === i,
			)
		: []
	return (
		<div className="space-y-4">
			<Section title="Icon to modify">
				<div className="relative">
					<input
						value={q || md.slug || ""}
						onChange={(ev) => setQ(ev.target.value)}
						onFocus={() => setQ(md.slug ?? "")}
						placeholder="Type an icon name: sonarr, plex, self-host…"
						aria-label="Icon to modify"
						className="h-10 w-full rounded-md border bg-transparent px-3 font-mono"
					/>
					{matches.length > 0 && q !== md.slug && (
						<ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
							{matches.map((x) => (
								<li key={x.slug}>
									<button
										type="button"
										onClick={() => {
											p.run({ kind: "modify", slug: x.slug, carry: [] }, "one")
											setQ("")
										}}
										className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted"
									>
										<Preview src={x.variants[0].url} bg="checker" className="size-7 p-0.5" />
										<span className="font-mono text-sm">{x.slug}</span>
										<span className="ml-auto text-[11px] text-muted-foreground">{existingLabel(x)}</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="mt-3">
					<NudgeList nudges={nudges} onAction={(a) => p.run(a, "one")} />
				</div>
			</Section>
			{e && (
				<Section title="Variants">
					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead className="text-left text-muted-foreground">
								<tr>
									<th className="py-1 font-medium">Variant</th>
									<th className="py-1 font-medium">Current</th>
									<th className="py-1 font-medium">Proposed</th>
									<th className="py-1 font-medium">Change</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{keys.map((k) => {
									const cur = e.variants.find((v) => v.key === k)
									const op = md.ops[k]
									const slot = SLOTS.find((s) => s.key === k)
									return (
										<tr key={k}>
											<td className="py-2 pr-2">
												<div className="font-medium">{slot?.title ?? `${k} (custom)`}</div>
												<div className="font-mono text-[10px] text-muted-foreground">{targetFilename(e.slug, k)}</div>
											</td>
											<td className="py-2 pr-2">
												{cur ? <Preview src={cur.url} bg={bgForKey(k)} /> : <span className="text-muted-foreground">—</span>}
											</td>
											<td className="py-2 pr-2">
												{op && op.type !== "remove" && <Preview src={op.url} bg={bgForKey(k)} className="ring-2 ring-emerald-500/60" />}
												{op?.type === "remove" && <span className="font-medium text-red-600">removed</span>}
												{!op && <span className="text-muted-foreground">{cur ? "unchanged" : "—"}</span>}
											</td>
											<td className="py-2">
												<div className="flex flex-wrap gap-1">
													<Button
														size="sm"
														variant="outline"
														className="h-7"
														onClick={() => pickFiles((f) => f[0] && set((m) => putVariant(m, k, f[0])), false)}
													>
														<Upload /> {cur ? "Replace" : "Add"}
													</Button>
													{cur && !op && k !== "base" && (
														<Button
															size="sm"
															variant="ghost"
															className="h-7 text-red-600"
															onClick={() => set((m) => removeVariantOp(m, k))}
														>
															Remove
														</Button>
													)}
													{op && (
														<Button size="sm" variant="ghost" className="h-7" onClick={() => set((m) => undoOp(m, k))}>
															<Undo2 /> Undo
														</Button>
													)}
												</div>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
					<div className="mt-3">
						<CustomVariantAdder slug={e.slug} taken={keys} onAdd={(name, file) => set((m) => putVariant(m, name, file))} />
					</div>
				</Section>
			)}
			{e && (
				<Section title="Metadata">
					<div className="space-y-2">
						<AliasInput value={md.aliases} onChange={(aliases) => set((m) => ({ ...m, aliases }))} />
						<CategoryChips value={md.categories} onChange={(categories) => set((m) => ({ ...m, categories }))} />
						<textarea
							value={md.note}
							onChange={(ev) => set((m) => ({ ...m, note: ev.target.value }))}
							placeholder="Note for the reviewer"
							rows={2}
							className="w-full rounded-md border bg-background p-2 text-xs"
						/>
					</div>
				</Section>
			)}
			<Section title="What will be sent">
				<DiffView md={md} />
				<SubmitButton className="mt-4" payload={modifyPayload(md)} label="Propose update" blocking={errorsOf(nudges)} />
			</Section>
		</div>
	)
}
