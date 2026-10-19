"use client"
// PROTOTYPE variant B "One icon at a time": guided stepper — shared details first, then one step per icon with fixed labelled slots plus named extras, then a review; no silent grouping, explicit merge nudges instead.
import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	addFiles,
	addIcon,
	type Draft,
	type DraftIcon,
	effectiveMeta,
	emptyDraft,
	existingSlugs,
	makeVariant,
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
	setVariantKind,
	stemOf,
	TONES,
	type Tone,
	targetFilename,
	toneShort,
} from "./mock"
import {
	bgFor,
	DemoButtons,
	demoDraft,
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

const SLOTS: { form: string; tone: Tone; title: string; hint: string }[] = [
	{ form: "icon", tone: "colour", title: "Base", hint: "Full-colour icon. Required." },
	{ form: "icon", tone: "light", title: "Light", hint: "Light-coloured icon for dark backgrounds" },
	{ form: "icon", tone: "dark", title: "Dark", hint: "Dark-coloured icon for light backgrounds" },
	{ form: "wordmark", tone: "colour", title: "Wordmark", hint: "Colour logo with the name" },
	{ form: "wordmark", tone: "light", title: "Wordmark light", hint: "Light wordmark for dark backgrounds" },
	{ form: "wordmark", tone: "dark", title: "Wordmark dark", hint: "Dark wordmark for light backgrounds" },
]

export function VariantB() {
	const { draft, apply, setDraft } = useDraft()
	const [current, setCurrent] = useState("shared")
	const steps = ["shared", ...draft.icons.map((i) => i.id), "review"]
	const active = steps.includes(current) ? current : (draft.icons[0]?.id ?? "shared")
	const index = steps.indexOf(active)
	const icon = draft.icons.find((i) => i.id === active)
	const all = nudges(draft)
	const go = (delta: number) => setCurrent(steps[Math.min(steps.length - 1, Math.max(0, index + delta))])
	const addAnother = () => {
		const next = addIcon(draft)
		setDraft(next)
		setCurrent(next.icons[next.icons.length - 1].id)
	}
	return (
		<div className="container mx-auto max-w-6xl px-4 py-6 sm:py-10">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">New submission</h1>
					<p className="text-sm text-muted-foreground">One submission, as many icons as you like. We walk through them one by one.</p>
					<ProtoNotice />
				</div>
				<DemoButtons
					onLoad={(k) => {
						setDraft(demoDraft(k, false))
						setCurrent("shared")
					}}
					onReset={() => {
						setDraft(emptyDraft())
						setCurrent("shared")
					}}
				/>
			</div>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
				<div className="min-w-0 space-y-4">
					<nav className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
						{steps.map((s, i) => {
							const ic = draft.icons.find((x) => x.id === s)
							const issues = all.filter((n) => n.iconId === s)
							let dot = "bg-emerald-500"
							if (issues.some((n) => n.level === "warn")) dot = "bg-amber-500"
							if (issues.some((n) => n.level === "error")) dot = "bg-red-500"
							let label = "Review & submit"
							if (s === "shared") label = "About this submission"
							if (ic) label = ic.slug || "unnamed icon"
							return (
								<button
									key={s}
									type="button"
									onClick={() => setCurrent(s)}
									className={cn(
										"flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
										s === active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
									)}
								>
									<span className="w-4 text-right font-mono text-[10px] opacity-60">{i}</span>
									{ic && <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
									<span className={cn("truncate", ic && "font-mono")}>{label}</span>
									{ic && <span className="ml-auto text-[10px] opacity-60">{ic.variants.length}</span>}
								</button>
							)
						})}
						<button
							type="button"
							onClick={addAnother}
							className="flex shrink-0 items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
						>
							<Plus className="size-3.5" /> Add icon
						</button>
					</nav>
					<details className="rounded-lg border bg-background p-2 text-xs">
						<summary className="cursor-pointer font-medium">Live payload</summary>
						<PayloadTree draft={draft} className="mt-2" />
					</details>
				</div>

				<main className="min-w-0 rounded-xl border bg-background p-4 sm:p-6">
					{active === "shared" && <SharedStep draft={draft} apply={apply} setDraft={setDraft} onStart={(id) => setCurrent(id)} />}
					{icon && <IconStep icon={icon} draft={draft} apply={apply} />}
					{active === "review" && <ReviewStep draft={draft} apply={apply} onEdit={setCurrent} />}
					<div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-4">
						<Button variant="outline" onClick={() => go(-1)} disabled={index === 0}>
							<ArrowLeft /> Back
						</Button>
						{icon && (
							<Button variant="secondary" onClick={addAnother}>
								<Plus /> Add another icon to this submission
							</Button>
						)}
						<span className="flex-1" />
						{active !== "review" && (
							<Button onClick={() => go(1)}>
								{index + 1 === steps.length - 1 ? "Review" : `Next: ${draft.icons.find((i) => i.id === steps[index + 1])?.slug || "icon"}`}
								<ArrowRight />
							</Button>
						)}
						{active === "review" && <SubmitButton draft={draft} label="Submit all" />}
					</div>
				</main>
			</div>
		</div>
	)
}

function SharedStep({
	draft,
	apply,
	setDraft,
	onStart,
}: {
	draft: Draft
	apply: Apply
	setDraft: (d: Draft) => void
	onStart: (id: string) => void
}) {
	const [names, setNames] = useState("")
	const merges = nudges(draft).filter((n) => n.id.endsWith("-merge"))
	const createFromNames = () => {
		let next = draft
		for (const n of names.split(/[\n,]/).map(sanitizeSlug).filter(Boolean)) next = addIcon(next, n)
		setDraft(next)
		setNames("")
		if (next.icons[draft.icons.length]) onStart(next.icons[draft.icons.length].id)
	}
	return (
		<div className="space-y-6">
			<section>
				<h2 className="text-lg font-semibold">Which icons are in this submission?</h2>
				<p className="mb-3 text-sm text-muted-foreground">
					List every icon, one per line. Variants (light, dark, wordmark, animated…) are added inside each icon — don't list them here.
				</p>
				<textarea
					value={names}
					onChange={(e) => setNames(e.target.value)}
					rows={4}
					placeholder={"self-host\nplex"}
					className="w-full rounded-md border bg-background p-2 font-mono text-sm"
				/>
				<div className="mt-2 flex flex-wrap gap-2">
					<Button size="sm" onClick={createFromNames} disabled={!names.trim()}>
						Add {names.split(/[\n,]/).filter((n) => n.trim()).length || ""} icon(s)
					</Button>
					<Button size="sm" variant="outline" onClick={() => pickFiles((files) => setDraft(addFiles(draft, files, false)))}>
						<ImagePlus /> Or start from files (one icon per file)
					</Button>
				</div>
				{draft.icons.length > 0 && (
					<p className="mt-3 text-xs text-muted-foreground">
						{draft.icons.length} icon(s) so far: <span className="font-mono">{draft.icons.map((i) => i.slug || "unnamed").join(", ")}</span>
					</p>
				)}
				<div className="mt-3 space-y-2">
					{merges.length > 1 && (
						<Button size="sm" variant="secondary" onClick={() => apply((d) => merges.reduce((acc, n) => n.actions[0].apply(acc), d))}>
							Apply all {merges.length} merge suggestions
						</Button>
					)}
					<NudgeList draft={draft} apply={apply} />
				</div>
			</section>
			<section>
				<h2 className="text-lg font-semibold">Details shared by all icons</h2>
				<p className="mb-3 text-sm text-muted-foreground">Each icon starts with these. You can change them per icon later.</p>
				<MetaEditor meta={draft.shared} onChange={(patch) => apply((d) => setShared(d, patch))} />
			</section>
		</div>
	)
}

function IconStep({ icon, draft, apply }: { icon: DraftIcon; draft: Draft; apply: Apply }) {
	const extras = icon.variants.filter((v) => v.form !== "icon" && v.form !== "wordmark")
	return (
		<div className="space-y-6">
			<section>
				<label htmlFor={`slug-${icon.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Icon name
				</label>
				<div className="mt-1 flex items-center gap-2">
					<input
						id={`slug-${icon.id}`}
						list="proto-b-existing"
						value={icon.slug}
						onChange={(e) => apply((d) => renameIcon(d, icon.id, e.target.value))}
						placeholder="my-app"
						className="h-10 w-full max-w-md rounded-md border bg-transparent px-3 font-mono text-lg font-semibold"
					/>
					<datalist id="proto-b-existing">
						{existingSlugs().map((s) => (
							<option key={s} value={s} />
						))}
					</datalist>
					<Button size="icon" variant="ghost" aria-label="Remove icon" onClick={() => apply((d) => removeIcon(d, icon.id))}>
						<Trash2 />
					</Button>
				</div>
				<div className="mt-3">
					<NudgeList draft={draft} apply={apply} iconId={icon.id} />
				</div>
			</section>

			<section>
				<h3 className="mb-2 text-sm font-semibold">Files</h3>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
					{SLOTS.map((s) => (
						<Slot key={`${s.form}-${s.tone}`} icon={icon} apply={apply} {...s} />
					))}
				</div>
			</section>

			<section>
				<div className="mb-2 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Extra variants</h3>
					<Button
						size="sm"
						variant="outline"
						onClick={() =>
							pickFiles((files) =>
								apply((d) => ({
									...d,
									icons: d.icons.map((i) => {
										if (i.id !== icon.id) return i
										const added = files.map((f) => {
											const p = parseStem(stemOf(f.name))
											return makeVariant(f, p.form === "icon" ? "custom" : p.form, p.tone)
										})
										return { ...i, variants: [...i.variants, ...added] }
									}),
								})),
							)
						}
					>
						<Plus /> Add extra variant
					</Button>
				</div>
				<p className="mb-2 text-xs text-muted-foreground">
					For animated, mono, outline, 3D… versions of this same icon. Give each a short name.
				</p>
				<ul className="space-y-2">
					{extras.map((v) => (
						<li key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
							<VariantThumb variant={v} />
							<input
								aria-label="Extra variant name"
								value={v.form}
								onChange={(e) => apply((d) => setVariantKind(d, v.id, sanitizeSlug(e.target.value) || "custom", v.tone))}
								className="h-8 w-32 rounded border bg-transparent px-2 font-mono text-sm"
							/>
							<select
								aria-label="Tone"
								value={v.tone}
								onChange={(e) => apply((d) => setVariantKind(d, v.id, v.form, e.target.value as Tone))}
								className="h-8 rounded border bg-background px-1 text-xs"
							>
								{TONES.map((t) => (
									<option key={t} value={t}>
										{t} ({toneShort(t)})
									</option>
								))}
							</select>
							<span className="font-mono text-xs text-muted-foreground">
								{v.file.name} → <span className="text-foreground">{targetFilename(icon.slug, v)}</span>
							</span>
							<button
								type="button"
								aria-label="Remove"
								onClick={() => apply((d) => removeVariant(d, v.id))}
								className="ml-auto text-muted-foreground hover:text-destructive"
							>
								<Trash2 className="size-4" />
							</button>
						</li>
					))}
					{extras.length === 0 && <li className="text-xs text-muted-foreground">None.</li>}
				</ul>
			</section>

			<section>
				<h3 className="mb-2 text-sm font-semibold">Aliases & categories</h3>
				<label className="mb-2 inline-flex items-center gap-1.5 text-xs">
					<input type="checkbox" checked={icon.inheritMeta} onChange={(e) => apply((d) => setIconMeta(d, icon.id, {}, e.target.checked))} />
					Start from the submission's shared details ({effectiveMeta(draft, icon).categories.join(", ") || "none"})
				</label>
				<MetaEditor
					meta={icon.meta}
					onChange={(patch) => apply((d) => setIconMeta(d, icon.id, patch))}
					inherited={icon.inheritMeta ? draft.shared : undefined}
				/>
			</section>
		</div>
	)
}

function Slot({
	icon,
	apply,
	form,
	tone,
	title,
	hint,
}: {
	icon: DraftIcon
	apply: Apply
	form: string
	tone: Tone
	title: string
	hint: string
}) {
	const v = icon.variants.find((x) => x.form === form && x.tone === tone)
	const drop = useDrop(
		(vid) => apply((d) => moveVariant(d, vid, icon.id, form, tone)),
		(files) => files[0] && apply((d) => setSlotFile(d, icon.id, form, tone, files[0])),
	)
	return (
		<div className={cn("overflow-hidden rounded-lg border", drop.active && "ring-2 ring-primary")}>
			<button
				type="button"
				{...drop.props}
				onClick={() => pickFiles((files) => files[0] && apply((d) => setSlotFile(d, icon.id, form, tone, files[0])))}
				className={cn("flex h-24 w-full items-center justify-center", bgFor(tone))}
			>
				{v ? (
					// biome-ignore lint/performance/noImgElement: prototype blob previews
					<img src={v.url} alt={v.file.name} className="h-16 w-16 object-contain" />
				) : (
					<span
						className={cn(
							"rounded px-2 py-1 text-[11px]",
							tone === "light" ? "text-zinc-400" : "text-zinc-500",
							tone === "colour" && "bg-background/80",
						)}
					>
						Drop or click
					</span>
				)}
			</button>
			<div className="space-y-0.5 p-2">
				<div className="flex items-center gap-1 text-sm font-medium">
					{v && <Check className="size-3.5 text-emerald-600" />}
					{title}
					{v && (
						<button
							type="button"
							aria-label="Clear"
							onClick={() => apply((d) => removeVariant(d, v.id))}
							className="ml-auto text-muted-foreground hover:text-destructive"
						>
							<Trash2 className="size-3.5" />
						</button>
					)}
				</div>
				<p className="text-[11px] leading-4 text-muted-foreground">{hint}</p>
				<p className="truncate font-mono text-[10px] text-muted-foreground">
					{v ? `${v.file.name} → ` : ""}
					<span className="text-foreground">{targetFilename(icon.slug, v ?? { form, tone, file: new File([], "x.svg") })}</span>
				</p>
			</div>
		</div>
	)
}

function ReviewStep({ draft, apply, onEdit }: { draft: Draft; apply: Apply; onEdit: (id: string) => void }) {
	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Review</h2>
			<NudgeList draft={draft} apply={apply} />
			<ul className="divide-y rounded-lg border">
				{draft.icons.map((i) => (
					<li key={i.id} className="flex flex-wrap items-center gap-3 p-3">
						<button
							type="button"
							onClick={() => onEdit(i.id)}
							className="w-40 truncate text-left font-mono text-sm font-semibold hover:underline"
						>
							{i.slug || "unnamed"}
						</button>
						<div className="flex flex-wrap gap-1">
							{i.variants.map((v) => (
								<VariantThumb key={v.id} variant={v} className="size-9" />
							))}
						</div>
					</li>
				))}
			</ul>
			<PayloadTree draft={draft} />
		</div>
	)
}
