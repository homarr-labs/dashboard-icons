"use client"
// PROTOTYPE variant C "Spreadsheet": dense table, one row per icon and one column per variant (custom variants are extra columns), a shared defaults row, payload in a bottom sheet.
import { Columns3, FileUp, ListPlus, PanelBottomOpen, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
	addFiles,
	addIcon,
	CATEGORIES,
	type Draft,
	type DraftIcon,
	emptyDraft,
	lookupExisting,
	moveVariant,
	nudges,
	parseStem,
	removeIcon,
	removeVariant,
	renameIcon,
	sanitizeSlug,
	setIconMeta,
	setShared,
	setSlotFile,
	type Tone,
	targetFilename,
	toneLabel,
	variantKey,
	variantLabel,
} from "./mock"
import {
	bgFor,
	DemoButtons,
	demoDraft,
	dragVariant,
	NudgeItem,
	PayloadTree,
	ProtoNotice,
	pickFiles,
	SubmitButton,
	useDraft,
	useDrop,
} from "./shared"

type Apply = (fn: (d: Draft) => Draft) => void
type Col = { form: string; tone: Tone }

const BASE_COLS: Col[] = [
	{ form: "icon", tone: "colour" },
	{ form: "icon", tone: "light" },
	{ form: "icon", tone: "dark" },
	{ form: "wordmark", tone: "colour" },
	{ form: "wordmark", tone: "light" },
	{ form: "wordmark", tone: "dark" },
]

function splitList(s: string) {
	return s
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)
}

export function VariantC() {
	const { draft, apply, setDraft } = useDraft()
	const [extraCols, setExtraCols] = useState<Col[]>([])
	const [sheet, setSheet] = useState(false)
	const fromDraft = draft.icons.flatMap((i) => i.variants.map((v) => ({ form: v.form, tone: v.tone })))
	const cols = [...BASE_COLS, ...extraCols, ...fromDraft].filter(
		(c, idx, arr) => arr.findIndex((x) => x.form === c.form && x.tone === c.tone) === idx,
	)
	const issues = nudges(draft)
	const tableDrop = useDrop(
		() => {},
		(files) => apply((d) => addFiles(d, files, true)),
	)
	const addColumn = () => {
		const raw = sanitizeSlug(window.prompt("New variant column, e.g. animated, animated-dark, mono, outline-light") || "")
		if (!raw) return
		const p = parseStem(`x-${raw}`)
		const col = p.form === "icon" && p.tone === "colour" ? { form: raw, tone: "colour" as Tone } : { form: p.form, tone: p.tone }
		setExtraCols((c) => [...c, col])
	}
	const pasteNames = () => {
		const raw = window.prompt("Icon names, comma separated (e.g. exe, msi, txt)") || ""
		apply((d) =>
			splitList(raw)
				.map(sanitizeSlug)
				.filter(Boolean)
				.reduce((acc, n) => addIcon(acc, n), d),
		)
	}
	return (
		<div className="mx-auto max-w-[1600px] px-4 py-6 sm:py-8">
			<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold">Submission sheet</h1>
					<p className="text-sm text-muted-foreground">
						One row per icon, one column per variant. Drop files anywhere on the table to auto-fill cells.
					</p>
					<ProtoNotice />
				</div>
				<DemoButtons
					onLoad={(k) => setDraft(demoDraft(k, true))}
					onReset={() => {
						setDraft(emptyDraft())
						setExtraCols([])
					}}
				/>
			</div>

			<div className="sticky top-14 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur">
				<Button size="sm" variant="outline" onClick={() => apply((d) => addIcon(d))}>
					<Plus /> Row
				</Button>
				<Button size="sm" variant="outline" onClick={pasteNames}>
					<ListPlus /> Paste names
				</Button>
				<Button size="sm" variant="outline" onClick={() => pickFiles((files) => apply((d) => addFiles(d, files, true)))}>
					<FileUp /> Fill from files
				</Button>
				<Button size="sm" variant="outline" onClick={addColumn}>
					<Columns3 /> Variant column
				</Button>
				<span className="text-xs text-muted-foreground">
					{draft.icons.length} icons · {draft.icons.reduce((n, i) => n + i.variants.length, 0)} files ·{" "}
					<span className={cn(issues.some((n) => n.level === "error") && "text-red-600")}>
						{issues.filter((n) => n.level === "error").length} blocking
					</span>
				</span>
				<span className="flex-1" />
				<Button size="sm" variant="ghost" onClick={() => setSheet(true)}>
					<PanelBottomOpen /> Payload
				</Button>
				<SubmitButton draft={draft} label="Submit sheet" className="h-8" />
			</div>

			<div
				{...tableDrop.props}
				className={cn("overflow-x-auto rounded-lg border bg-background", tableDrop.active && "ring-2 ring-primary")}
			>
				<table className="w-full border-collapse text-xs">
					<thead className="bg-muted/50 text-left">
						<tr>
							<th className="sticky left-0 z-10 min-w-44 border-b border-r bg-muted px-2 py-2 font-medium">Icon (slug)</th>
							<th className="border-b border-r px-2 py-2 font-medium">Status</th>
							{cols.map((c) => (
								<th
									key={variantKey(c.form, c.tone)}
									className="border-b border-r px-1 py-1 text-center font-medium"
									title={toneLabel(c.tone)}
								>
									<div>{variantLabel(c)}</div>
									<div className="font-mono text-[9px] font-normal text-muted-foreground">
										slug{variantKey(c.form, c.tone) === "base" ? "" : `-${variantKey(c.form, c.tone)}`}
									</div>
									{c.tone !== "colour" && (
										<div className="text-[9px] font-normal text-muted-foreground">
											{c.tone === "light" ? "for dark bg" : "for light bg"}
										</div>
									)}
								</th>
							))}
							<th className="min-w-40 border-b border-r px-2 py-2 font-medium">Aliases</th>
							<th className="min-w-48 border-b border-r px-2 py-2 font-medium">Categories</th>
							<th className="min-w-48 border-b px-2 py-2 font-medium">Description</th>
							<th className="border-b" />
						</tr>
					</thead>
					<tbody>
						<tr className="bg-emerald-500/5">
							<td className="sticky left-0 z-10 border-b border-r bg-emerald-50 px-2 py-1.5 font-medium dark:bg-emerald-950">
								All icons (defaults)
							</td>
							<td className="border-b border-r" />
							<td colSpan={cols.length} className="border-b border-r px-2 text-muted-foreground">
								Defaults fill every row's empty categories / description.
							</td>
							<td className="border-b border-r px-2 text-muted-foreground">per icon</td>
							<td className="border-b border-r p-1">
								<CommitInput
									value={draft.shared.categories.join(", ")}
									onCommit={(v) => apply((d) => setShared(d, { categories: splitList(v) }))}
									list="proto-c-cats"
								/>
							</td>
							<td className="border-b p-1">
								<CommitInput value={draft.shared.description} onCommit={(v) => apply((d) => setShared(d, { description: v }))} />
							</td>
							<td className="border-b" />
						</tr>
						{draft.icons.map((icon) => (
							<Row key={icon.id} icon={icon} draft={draft} apply={apply} cols={cols} />
						))}
						{draft.icons.length === 0 && (
							<tr>
								<td colSpan={cols.length + 6} className="px-4 py-12 text-center text-muted-foreground">
									Empty sheet. Drop files here, paste names, or load an example.
								</td>
							</tr>
						)}
					</tbody>
				</table>
				<datalist id="proto-c-cats">
					{CATEGORIES.map((c) => (
						<option key={c} value={c} />
					))}
				</datalist>
			</div>

			<Sheet open={sheet} onOpenChange={setSheet}>
				<SheetContent side="bottom" className="max-h-[70vh] overflow-auto">
					<SheetHeader>
						<SheetTitle>Payload</SheetTitle>
						<SheetDescription>Live state of this submission.</SheetDescription>
					</SheetHeader>
					<div className="px-4 pb-6">
						<PayloadTree draft={draft} />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

function Row({ icon, draft, apply, cols }: { icon: DraftIcon; draft: Draft; apply: Apply; cols: Col[] }) {
	const existing = lookupExisting(icon.slug)
	const rowIssues = nudges(draft).filter((n) => n.iconId === icon.id)
	let status = <span className="text-emerald-700 dark:text-emerald-300">new</span>
	if (existing?.kind === "collection") status = <span className="text-blue-700 dark:text-blue-300">update</span>
	if (existing?.kind === "pending") status = <span className="text-amber-700 dark:text-amber-300">pending elsewhere</span>
	const inherited = icon.inheritMeta ? draft.shared : undefined
	return (
		<>
			<tr className="group hover:bg-muted/30">
				<td className="sticky left-0 z-10 border-b border-r bg-background p-1 group-hover:bg-muted">
					<input
						value={icon.slug}
						onChange={(e) => apply((d) => renameIcon(d, icon.id, e.target.value))}
						placeholder="slug"
						aria-label="Icon slug"
						className="h-8 w-full rounded bg-transparent px-1.5 font-mono font-semibold outline-none focus:ring-1 focus:ring-primary"
					/>
				</td>
				<td className="whitespace-nowrap border-b border-r px-2">{status}</td>
				{cols.map((c) => (
					<FileCell key={variantKey(c.form, c.tone)} icon={icon} col={c} apply={apply} />
				))}
				<td className="border-b border-r p-1">
					<CommitInput
						value={icon.meta.aliases.join(", ")}
						onCommit={(v) => apply((d) => setIconMeta(d, icon.id, { aliases: splitList(v) }))}
					/>
				</td>
				<td className="border-b border-r p-1">
					<CommitInput
						value={icon.meta.categories.join(", ")}
						placeholder={inherited?.categories.join(", ")}
						onCommit={(v) => apply((d) => setIconMeta(d, icon.id, { categories: splitList(v) }))}
						list="proto-c-cats"
					/>
				</td>
				<td className="border-b p-1">
					<CommitInput
						value={icon.meta.description}
						placeholder={inherited?.description}
						onCommit={(v) => apply((d) => setIconMeta(d, icon.id, { description: v }))}
					/>
				</td>
				<td className="border-b px-1">
					<button
						type="button"
						aria-label="Delete row"
						onClick={() => apply((d) => removeIcon(d, icon.id))}
						className="text-muted-foreground hover:text-destructive"
					>
						<Trash2 className="size-3.5" />
					</button>
				</td>
			</tr>
			{rowIssues.length > 0 && (
				<tr>
					<td className="sticky left-0 border-b border-r bg-background" />
					<td colSpan={cols.length + 5} className="border-b px-2 py-1">
						<ul className="flex flex-col gap-1">
							{rowIssues.map((n) => (
								<NudgeItem key={n.id} nudge={n} apply={apply} compact />
							))}
						</ul>
					</td>
				</tr>
			)}
		</>
	)
}

function FileCell({ icon, col, apply }: { icon: DraftIcon; col: Col; apply: Apply }) {
	const matches = icon.variants.filter((v) => v.form === col.form && v.tone === col.tone)
	const v = matches[0]
	const drop = useDrop(
		(vid) => apply((d) => moveVariant(d, vid, icon.id, col.form, col.tone)),
		(files) => files[0] && apply((d) => setSlotFile(d, icon.id, col.form, col.tone, files[0])),
	)
	return (
		<td {...drop.props} className={cn("border-b border-r p-1 text-center", drop.active && "bg-primary/10")}>
			{v ? (
				<div
					className="group/cell relative mx-auto w-fit"
					{...dragVariant(v.id)}
					title={`${v.file.name} → ${targetFilename(icon.slug, v)}`}
				>
					<span className={cn("flex size-10 cursor-grab items-center justify-center rounded border p-1", bgFor(col.tone))}>
						{/* biome-ignore lint/performance/noImgElement: prototype blob previews */}
						<img src={v.url} alt="" className="size-full object-contain" />
					</span>
					{matches.length > 1 && (
						<span className="absolute -top-1 -left-1 rounded-full bg-red-600 px-1 text-[9px] text-white">{matches.length}</span>
					)}
					<button
						type="button"
						aria-label="Clear cell"
						onClick={() => apply((d) => removeVariant(d, v.id))}
						className="absolute -top-1.5 -right-1.5 hidden rounded-full bg-background p-0.5 shadow group-hover/cell:block"
					>
						<X className="size-3" />
					</button>
				</div>
			) : (
				<button
					type="button"
					aria-label={`Add ${variantLabel(col)} file`}
					onClick={() => pickFiles((files) => files[0] && apply((d) => setSlotFile(d, icon.id, col.form, col.tone, files[0])))}
					className={cn(
						"mx-auto flex size-10 items-center justify-center rounded border border-dashed text-muted-foreground/60 opacity-60 hover:opacity-100",
						bgFor(col.tone),
					)}
				>
					<Plus className="size-3.5" />
				</button>
			)}
		</td>
	)
}

function CommitInput({
	value,
	onCommit,
	placeholder,
	list,
}: {
	value: string
	onCommit: (v: string) => void
	placeholder?: string
	list?: string
}) {
	const [text, setText] = useState<string | null>(null)
	return (
		<input
			value={text ?? value}
			list={list}
			placeholder={placeholder}
			onFocus={() => setText(value)}
			onChange={(e) => setText(e.target.value)}
			onBlur={() => {
				if (text !== null) onCommit(text)
				setText(null)
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") (e.target as HTMLInputElement).blur()
			}}
			className="h-8 w-full rounded bg-transparent px-1.5 outline-none placeholder:text-muted-foreground/60 placeholder:italic focus:ring-1 focus:ring-primary"
		/>
	)
}
