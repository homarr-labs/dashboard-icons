// PROTOTYPE (throwaway): Variant D "Pull-request review" — each Submission reads like a PR (conversation timeline with bot checks/related submissions, files-changed diff per Variant with inline comments and suggested fix-ups) and gets one review verdict.
"use client"
import { Bot, Check, FileImage, GitMerge, GitPullRequest, History, MessageSquare, RotateCcw, Scissors, Send, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { collisions, fileName, type IconVariant, type MockSubmission, reasons, siblingClusters, type Tone, variantKind } from "./mock"
import { describeFixup, KindBadge, minutesAgo, OutcomeBadge, Swatch } from "./shared"
import type { Outcome, Review } from "./state"

function title(sub: MockSubmission) {
	if (sub.icons.some((icon) => icon.mode === "update")) return `Update ${sub.icons.map((icon) => icon.slug).join(", ")}`
	if (sub.icons.length > 3)
		return `Add ${sub.icons.length} icons: ${sub.icons
			.slice(0, 3)
			.map((icon) => icon.slug)
			.join(", ")}…`
	return `Add ${sub.icons.map((icon) => icon.slug).join(", ")}`
}

export function VariantD({ review, onSubmit }: { review: Review; onSubmit: () => void }) {
	const [selectedId, setSelectedId] = useState(review.subs[0]?.id || "")
	const [tab, setTab] = useState<"conversation" | "files">("conversation")
	const sub = review.subs.find((entry) => entry.id === selectedId) || review.subs[0]
	const staged = Object.keys(review.subDecisions).filter((id) => review.subs.some((entry) => entry.id === id)).length
	return (
		<div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
			<aside
				aria-label="Open submissions"
				className="flex max-h-64 min-h-0 flex-col overflow-hidden rounded-xl border bg-background lg:max-h-none"
			>
				<div className="flex items-center justify-between border-b px-3 py-2 text-xs">
					<span className="flex items-center gap-1.5 font-medium">
						<GitPullRequest className="size-3.5" />
						{review.subs.length} open
					</span>
					<Button size="sm" className="h-7 text-xs" disabled={!review.payload.submissions.length} onClick={onSubmit}>
						<Send className="size-3" />
						Submit {staged} reviews
					</Button>
				</div>
				<ul className="min-h-0 flex-1 divide-y overflow-y-auto">
					{review.subs.map((entry) => {
						const verdict = review.subDecisions[entry.id]
						return (
							<li key={entry.id}>
								<button
									type="button"
									onClick={() => setSelectedId(entry.id)}
									className={cn("flex w-full gap-2 px-3 py-2 text-left hover:bg-muted/50", entry.id === sub?.id && "bg-primary/5")}
								>
									<GitPullRequest
										className={cn(
											"mt-0.5 size-4 shrink-0 text-emerald-600",
											verdict?.outcome === "changes" && "text-amber-600",
											verdict?.outcome === "reject" && "text-red-600",
											verdict?.outcome === "approve" && "text-violet-600",
										)}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-xs font-medium">{title(entry)}</span>
										<span className="block truncate text-[11px] text-muted-foreground">
											{entry.id} · {minutesAgo(entry.created)} by @{entry.contributor}
										</span>
										<span className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
											{entry.round > 1 && <span className="rounded-full border px-1.5">round {entry.round}</span>}
											{entry.mergedFrom && <span className="rounded-full border px-1.5">merged ×{entry.mergedFrom.length}</span>}
											{verdict && <OutcomeBadge outcome={verdict.outcome} className="rounded-full px-1.5 py-0 text-[10px]" />}
										</span>
									</span>
								</button>
							</li>
						)
					})}
				</ul>
			</aside>
			{sub && (
				<main className="min-h-0 min-w-0 overflow-y-auto">
					<header className="space-y-2 border-b pb-3">
						<h2 className="text-xl font-semibold">
							{title(sub)} <span className="font-normal text-muted-foreground">{sub.id}</span>
						</h2>
						<p className="text-xs text-muted-foreground">
							@{sub.contributor} wants to add {sub.icons.length} icon{sub.icons.length > 1 && "s"} ·{" "}
							{sub.icons.reduce((sum, icon) => sum + icon.variants.length, 0)} files
						</p>
						<div className="flex gap-1 text-sm">
							{(["conversation", "files"] as const).map((entry) => (
								<button
									type="button"
									key={entry}
									onClick={() => setTab(entry)}
									className={cn(
										"flex items-center gap-1.5 border-b-2 border-transparent px-3 py-1.5",
										tab === entry && "border-primary font-medium",
									)}
								>
									{entry === "conversation" && <MessageSquare className="size-3.5" />}
									{entry === "files" && <FileImage className="size-3.5" />}
									{entry === "conversation" && "Conversation"}
									{entry === "files" && `Files changed (${sub.icons.reduce((sum, icon) => sum + icon.variants.length, 0)})`}
								</button>
							))}
						</div>
					</header>
					{tab === "conversation" && (
						<Conversation key={sub.id} sub={sub} review={review} onSelect={setSelectedId} onFiles={() => setTab("files")} />
					)}
					{tab === "files" && <Files key={sub.id} sub={sub} review={review} />}
				</main>
			)}
		</div>
	)
}

function Event({ icon, who, children, tone }: { icon: React.ReactNode; who: string; children: React.ReactNode; tone?: string }) {
	return (
		<div className="relative flex gap-3 pb-4 before:absolute before:left-[15px] before:top-8 before:h-[calc(100%-2rem)] before:w-px before:bg-border last:before:hidden">
			<span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border bg-background", tone)}>{icon}</span>
			<div className="min-w-0 flex-1 rounded-lg border bg-background">
				<p className="border-b bg-muted/30 px-3 py-1.5 text-xs font-medium">{who}</p>
				<div className="space-y-2 px-3 py-2 text-xs">{children}</div>
			</div>
		</div>
	)
}

function Conversation({
	sub,
	review,
	onSelect,
	onFiles,
}: {
	sub: MockSubmission
	review: Review
	onSelect: (id: string) => void
	onFiles: () => void
}) {
	const [summary, setSummary] = useState(review.subDecisions[sub.id]?.reasons.join("\n") || "")
	const [verdict, setVerdict] = useState<Outcome>(review.subDecisions[sub.id]?.outcome || "approve")
	const cluster = siblingClusters(review.subs).find((entry) => entry.ids.includes(sub.id))
	const clash = collisions(review.subs).filter((entry) => entry.entries.some((item) => item.submissionId === sub.id))
	const failing = sub.icons.flatMap((icon) =>
		icon.variants.flatMap((variant) => variant.asset.checks.map((check) => ({ file: fileName(icon.slug, variant), check }))),
	)
	const variantIds = sub.icons.flatMap((icon) => icon.variants.map((variant) => variant.id))
	const commentCount = variantIds.reduce((sum, id) => sum + (review.comments[id]?.length || 0), 0)
	const suggestions = review.fixups.filter((fix) => (fix.kind === "drop" || fix.kind === "retag") && variantIds.includes(fix.variantId))
	const decided = review.subDecisions[sub.id]
	return (
		<div className="max-w-3xl pt-4">
			<Event icon={<GitPullRequest className="size-4" />} who={`@${sub.contributor} opened ${minutesAgo(sub.created)}`}>
				<p>{sub.note || "No description."}</p>
				{sub.mergedFrom && <p className="text-muted-foreground">Combined from {sub.mergedFrom.join(", ")} by you (staged).</p>}
			</Event>
			{sub.history && (
				<>
					<Event
						icon={<RotateCcw className="size-4 text-amber-600" />}
						who={`@${sub.history.reviewer} requested changes ${minutesAgo(sub.history.at)}`}
					>
						<p>“{sub.history.feedback}”</p>
					</Event>
					<Event icon={<History className="size-4" />} who={`@${sub.contributor} updated this submission (round ${sub.round})`}>
						<ul className="list-inside list-disc">
							{sub.history.changes.map((change) => (
								<li key={change}>{change}</li>
							))}
						</ul>
						<div className="flex flex-wrap items-center gap-2">
							{sub.history.previous.map((variant) => (
								<Swatch key={variant.id} variant={variant} className="size-14 rounded border p-1 opacity-70" />
							))}
							<span className="text-muted-foreground">→</span>
							{sub.icons[0].variants.map((variant) => (
								<Swatch key={variant.id} variant={variant} className="size-14 rounded border p-1" />
							))}
						</div>
					</Event>
				</>
			)}
			<Event icon={<Bot className="size-4" />} who="icons-bot · automated checks">
				{!failing.length && (
					<p className="text-emerald-700 dark:text-emerald-300">✓ All {variantIds.length} files pass: transparent, vector, sized.</p>
				)}
				{failing.map((entry) => (
					<p key={`${entry.file}-${entry.check.id}`} className={cn(entry.check.severity === "block" && "text-red-600")}>
						{entry.check.severity === "block" && "✕ "}
						{entry.check.severity === "warn" && "⚠ "}
						<span className="font-mono">{entry.file}</span>: {entry.check.label}
					</p>
				))}
				{!sub.icons.some((icon) => icon.variants.some((variant) => variant.form === "icon" && variant.tone === "colour")) && (
					<p className="text-red-600">✕ No Base variant</p>
				)}
			</Event>
			{(cluster || !!clash.length) && (
				<Event icon={<GitMerge className="size-4 text-amber-600" />} who="icons-bot · related submissions">
					{cluster && (
						<>
							<p>
								@{cluster.contributor} opened {cluster.ids.length} submissions within {cluster.spanMinutes} minutes sharing the prefix{" "}
								<span className="font-mono">{cluster.root}</span>:
							</p>
							<div className="flex flex-wrap gap-1">
								{cluster.ids.map((id) => (
									<button key={id} type="button" className="rounded border px-1.5 font-mono hover:bg-muted" onClick={() => onSelect(id)}>
										{id}
									</button>
								))}
							</div>
							<Button
								size="sm"
								className="h-7 text-xs"
								onClick={() => {
									const merged = review.merge(cluster.ids)
									if (merged) onSelect(merged)
								}}
							>
								<GitMerge className="size-3.5" />
								Merge all into one submission
							</Button>
						</>
					)}
					{clash.map((entry) => (
						<p key={entry.slug}>
							<span className="font-mono">{entry.slug}</span> is also proposed in{" "}
							{entry.entries
								.filter((item) => item.submissionId !== sub.id)
								.map((item) => (
									<button key={item.submissionId} type="button" className="font-mono underline" onClick={() => onSelect(item.submissionId)}>
										{item.submissionId} by @{item.contributor} ({minutesAgo(item.created)})
									</button>
								))}
						</p>
					))}
				</Event>
			)}
			{(!!suggestions.length || !!commentCount) && (
				<Event icon={<MessageSquare className="size-4" />} who="You · pending (not sent yet)">
					{!!commentCount && (
						<button type="button" className="underline" onClick={onFiles}>
							{commentCount} inline comment{commentCount > 1 && "s"} on files
						</button>
					)}
					{suggestions.map((fix, index) => (
						<p key={index} className="font-mono text-[11px]">
							{describeFixup(fix)}
						</p>
					))}
				</Event>
			)}
			<div className="rounded-xl border bg-background p-3">
				<h3 className="text-sm font-semibold">Finish your review</h3>
				<div className="mt-2 flex flex-wrap gap-1">
					{reasons.map((reason) => (
						<button
							type="button"
							key={reason.text}
							className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted"
							onClick={() => {
								setSummary(summary ? `${summary}\n${reason.text}` : reason.text)
								setVerdict(reason.outcome)
							}}
						>
							{reason.text.split(" ").slice(0, 5).join(" ")}…
						</button>
					))}
				</div>
				<Textarea
					className="mt-2"
					rows={3}
					value={summary}
					onChange={(event) => setSummary(event.target.value)}
					placeholder="Leave a summary for the contributor"
				/>
				<fieldset className="mt-2 space-y-1 text-xs">
					{(
						[
							["approve", "Approve", "All icons go to the publish queue."],
							["changes", "Request changes", `Contributor edits this same submission; it comes back as round ${sub.round + 1}.`],
							["reject", "Reject", "Close the submission."],
						] as [Outcome, string, string][]
					).map(([value, label, hint]) => (
						<label key={value} className="flex items-start gap-2">
							<input
								type="radio"
								name={`verdict-${sub.id}`}
								checked={verdict === value}
								onChange={() => setVerdict(value)}
								className="mt-0.5"
							/>
							<span>
								<span className="font-medium">{label}</span> <span className="text-muted-foreground">{hint}</span>
							</span>
						</label>
					))}
				</fieldset>
				<div className="mt-3 flex items-center gap-2">
					<Button
						size="sm"
						onClick={() => review.decideSubmission(sub.id, verdict, summary.trim() || undefined)}
						className={cn(verdict === "reject" && "bg-red-600 hover:bg-red-600/90")}
					>
						{verdict === "approve" && <Check className="size-3.5" />}
						{verdict === "changes" && <RotateCcw className="size-3.5" />}
						{verdict === "reject" && <X className="size-3.5" />}
						Stage review
					</Button>
					{decided && (
						<Button size="sm" variant="ghost" onClick={() => review.decideSubmission(sub.id, null)}>
							Discard
						</Button>
					)}
					{decided && <OutcomeBadge outcome={decided.outcome} />}
				</div>
				{decided?.outcome === "approve" && (
					<p className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
						Ready to merge → after you submit, its files join the next publish batch (one GitHub run for the whole batch).
					</p>
				)}
			</div>
		</div>
	)
}

const retagOptions: { form: string; tone: Tone }[] = [
	{ form: "icon", tone: "colour" },
	{ form: "icon", tone: "light" },
	{ form: "icon", tone: "dark" },
	{ form: "wordmark", tone: "colour" },
	{ form: "wordmark", tone: "light" },
	{ form: "wordmark", tone: "dark" },
	{ form: "animated", tone: "colour" },
	{ form: "animated", tone: "dark" },
]

function Files({ sub, review }: { sub: MockSubmission; review: Review }) {
	const [viewed, setViewed] = useState<string[]>([])
	const total = sub.icons.reduce((sum, icon) => sum + icon.variants.length, 0)
	return (
		<div className="space-y-4 pt-4">
			<p className="text-xs text-muted-foreground">
				{viewed.length}/{total} viewed
			</p>
			{sub.icons.map((icon) => (
				<section key={icon.id} className="space-y-2">
					<h3 className="flex flex-wrap items-center gap-2 text-sm">
						<span className="font-mono font-semibold">{icon.slug}</span>
						<span className="text-xs text-muted-foreground">
							{icon.mode === "update" && `update of collection/${icon.target?.slug}`}
							{icon.mode === "new" && "new icon"} · {icon.categories.join(", ")}
						</span>
						{sub.icons.length > 1 && (
							<Button size="sm" variant="ghost" className="ml-auto h-6 text-[11px]" onClick={() => review.split(icon.id)}>
								<Scissors className="size-3" />
								Split into its own submission
							</Button>
						)}
					</h3>
					{icon.variants.map((variant) => (
						<FileBlock
							key={variant.id}
							slug={icon.slug}
							variant={variant}
							published={icon.target?.published.find((entry) => entry.form === variant.form && entry.tone === variant.tone)}
							review={review}
							viewed={viewed.includes(variant.id)}
							onViewed={(value) => setViewed(value ? [...viewed, variant.id] : viewed.filter((id) => id !== variant.id))}
						/>
					))}
				</section>
			))}
		</div>
	)
}

function FileBlock({
	slug,
	variant,
	published,
	review,
	viewed,
	onViewed,
}: {
	slug: string
	variant: IconVariant
	published?: IconVariant
	review: Review
	viewed: boolean
	onViewed: (value: boolean) => void
}) {
	const [draft, setDraft] = useState("")
	const [open, setOpen] = useState(false)
	const dropped = review.dropped[variant.id]
	const comments = review.comments[variant.id] || []
	return (
		<article className={cn("overflow-hidden rounded-lg border bg-background", dropped && "opacity-60")}>
			<header className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs">
				<span className={cn("font-mono", dropped && "line-through")}>{fileName(slug, variant)}</span>
				<KindBadge variant={variant} />
				<span className="text-muted-foreground">
					{variant.asset.format.toUpperCase()} · {variant.asset.size}
				</span>
				{variant.asset.checks.map((check) => (
					<span key={check.id} className={cn("rounded px-1", check.severity === "block" && "bg-red-500/10 text-red-600")}>
						{check.label}
					</span>
				))}
				<span className="ml-auto flex items-center gap-2">
					<select
						aria-label="Suggest retag"
						className="h-6 rounded border bg-background text-[11px]"
						value=""
						onChange={(event) => {
							const [form, tone] = event.target.value.split(":")
							review.retag(variant.id, form, tone as Tone)
						}}
					>
						<option value="">Suggest retag…</option>
						{retagOptions.map((option) => (
							<option key={variantKind(option)} value={`${option.form}:${option.tone}`}>
								{variantKind(option)}
							</option>
						))}
					</select>
					<button type="button" className="text-[11px] underline" onClick={() => review.toggleDrop(variant.id, "Removed in review")}>
						{dropped && "Restore"}
						{!dropped && "Suggest drop"}
					</button>
					<label className="flex items-center gap-1">
						<input type="checkbox" checked={viewed} onChange={(event) => onViewed(event.target.checked)} />
						Viewed
					</label>
				</span>
			</header>
			{!viewed && (
				<div className={cn("grid", published && "grid-cols-2")}>
					{published && (
						<div className="border-r">
							<p className="bg-red-500/10 px-3 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">− published</p>
							<div className="grid grid-cols-2">
								<Swatch variant={published} mode="light" className="h-32 p-4" />
								<Swatch variant={published} mode="dark" className="h-32 p-4" />
							</div>
						</div>
					)}
					<div>
						<p className="bg-emerald-500/10 px-3 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
							+ {published && "proposed"}
							{!published && "new file"} · shown on its intended background, then checkerboard
						</p>
						<div className="grid grid-cols-[2fr_1fr]">
							<Swatch variant={variant} className="h-32 p-4" />
							<Swatch variant={variant} mode="checker" className="h-32 p-4" />
						</div>
					</div>
				</div>
			)}
			<div className="border-t px-3 py-1.5 text-xs">
				{comments.map((text, index) => (
					<p key={index} className="py-0.5">
						<span className="font-medium">You</span> <span className="text-muted-foreground">(pending)</span>: {text}
					</p>
				))}
				{!open && (
					<button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>
						+ Comment on this file
					</button>
				)}
				{open && (
					<form
						className="flex gap-2 py-1"
						onSubmit={(event) => {
							event.preventDefault()
							review.comment(variant.id, draft)
							setDraft("")
							setOpen(false)
						}}
					>
						<input
							ref={(element) => element?.focus()}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							placeholder="e.g. the lock is off-centre"
							className="h-7 flex-1 rounded border bg-background px-2"
						/>
						<Button size="sm" className="h-7 text-xs" type="submit">
							Add
						</Button>
					</form>
				)}
			</div>
		</article>
	)
}
