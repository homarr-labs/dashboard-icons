"use client"
import { Check, Layers, LayoutGrid, List, Search, Wand2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { MagicCard } from "@/components/magicui/magic-card"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Avatar, fileCount, Kind, Round, selectedRing, statusStyles, Thumbnail, Time, updateBadge } from "./primitives"
import type { ReviewDraft } from "./review-presentation"
import { FilterInput } from "./submission-list"

type Group = { key: string; rows: Submission[] }

export function StagedMark({ draft, className }: { draft?: ReviewDraft; className?: string }) {
	return (
		<AnimatePresence>
			{draft?.status && (
				<motion.span
					key={draft.status}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className={cn(
						"flex size-5 shrink-0 items-center justify-center rounded-sm border",
						draft.status === "approved" && statusStyles.approved.badge,
						draft.status === "rejected" && statusStyles.rejected.badge,
						className,
					)}
				>
					{draft.status === "approved" && <Check aria-label="Approval staged" className="size-3.5" strokeWidth={3} />}
					{draft.status === "rejected" && <X aria-label="Rejection staged" className="size-3.5" strokeWidth={3} />}
				</motion.span>
			)}
		</AnimatePresence>
	)
}

export function ReviewQueue({
	groups,
	total,
	currentId,
	drafts,
	disabled,
	search,
	gallery,
	onSearch,
	onGallery,
	onSelect,
}: {
	groups: Group[]
	total: number
	currentId?: string
	drafts: Record<string, ReviewDraft>
	disabled: boolean
	search: string
	gallery: boolean
	onSearch: (search: string) => void
	onGallery: (gallery: boolean) => void
	onSelect: (id: string, target: HTMLElement) => void
}) {
	const staged = Object.values(drafts).filter(
		(draft) => draft.status && groups.some((group) => group.rows.some((row) => row.id === draft.id)),
	)
	const approved = staged.filter((draft) => draft.status === "approved").length
	let progress = 0
	let approvedShare = 0
	let rejectedShare = 0
	if (total) {
		progress = Math.round((staged.length / total) * 100)
		approvedShare = (approved / total) * 100
		rejectedShare = ((staged.length - approved) / total) * 100
	}
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="space-y-3 border-b p-3">
				<div className="flex items-center justify-between gap-2">
					<p className="flex items-baseline gap-1.5">
						<span className="text-xl font-semibold tabular-nums">{total}</span>
						<span className="text-sm text-muted-foreground">waiting</span>
					</p>
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={gallery ? "gallery" : "list"}
						onValueChange={(value) => {
							if (value) onGallery(value === "gallery")
						}}
						aria-label="Queue layout"
					>
						<ToggleGroupItem value="list" aria-label="Review one at a time" className="max-lg:min-h-11 max-lg:min-w-11">
							<List />
						</ToggleGroupItem>
						<ToggleGroupItem value="gallery" aria-label="Show the queue as a gallery" className="max-lg:min-h-11 max-lg:min-w-11">
							<LayoutGrid />
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<div className="space-y-1.5">
					<div className="flex h-1.5 overflow-hidden rounded-sm bg-muted">
						<motion.span className={cn("h-full", statusStyles.approved.dot)} animate={{ width: `${approvedShare}%` }} />
						<motion.span className={cn("h-full", statusStyles.rejected.dot)} animate={{ width: `${rejectedShare}%` }} />
					</div>
					<p className="flex justify-between text-xs text-muted-foreground">
						<span>{staged.length} staged</span>
						<span className="tabular-nums">{progress}%</span>
					</p>
				</div>
				<FilterInput compact label="Find in queue" placeholder="Icon or submitter…" value={search} onChange={onSearch} icon={<Search />} />
			</div>
			<div className="relative min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 max-lg:max-h-[50dvh]">
				{!groups.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing matches this search.</p>}
				{groups.map((group) => (
					<div key={group.key} className={cn("min-w-0", group.rows.length > 1 && "rounded-md border border-dashed p-1")}>
						{group.rows.length > 1 && (
							<p className="flex min-w-0 items-center gap-1.5 px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
								<Layers className="size-3 shrink-0" />
								<span className="font-medium text-foreground">Sent together · {group.rows.length}</span>
								<span className="truncate">@{group.rows[0].expand?.created_by?.username || "Contributor"}</span>
							</p>
						)}
						<ul className="space-y-0.5">
							<AnimatePresence initial={false}>
								{group.rows.map((row) => {
									const draft = drafts[row.id]
									const current = currentId === row.id
									const dropped = draft?.fixups?.variants?.filter((change) => change.action === "drop").length || 0
									return (
										<motion.li
											key={row.id}
											layout="position"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
										>
											<button
												type="button"
												data-submission={row.id}
												disabled={disabled}
												onClick={(event) => onSelect(row.id, event.currentTarget)}
												aria-current={current || undefined}
												className={cn(
													"group relative flex min-h-14 w-full min-w-0 items-center gap-2.5 rounded-md py-2 pr-2 pl-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60",
													current && "bg-accent ring-1 ring-primary/60 hover:bg-accent",
												)}
											>
												{current && (
													<motion.span
														layoutId="review-queue-current"
														className="absolute inset-y-2 left-0 w-0.5 bg-primary"
														transition={{ duration: 0.2, ease: "easeOut" }}
													/>
												)}
												<Thumbnail submission={row} />
												<span className="min-w-0 flex-1">
													<span className="block font-mono text-[13px] font-medium [overflow-wrap:anywhere]">
														{draft?.fixups?.name || row.name}
													</span>
													<span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
														{group.rows.length === 1 && (
															<>
																<Avatar name={row.expand?.created_by?.username || "Contributor"} className="size-3.5 text-[8px]" />
																<span className="truncate">{row.expand?.created_by?.username || "Contributor"}</span>
																<span aria-hidden>·</span>
															</>
														)}
														<span className="shrink-0">{fileCount(row.assets.length - dropped)}</span>
													</span>
													{(row.icon_update || row.target_submission || (row.round || 1) > 1 || !!draft?.fixupSummary?.length) && (
														<span className="mt-1 flex flex-wrap gap-1">
															{(row.icon_update || row.target_submission) && (
																<span className={cn("rounded-sm border px-1 text-[10px] font-medium leading-4", updateBadge)}>Update</span>
															)}
															{(row.round || 1) > 1 && (
																<span className="rounded-sm border px-1 text-[10px] font-medium leading-4">Round {row.round}</span>
															)}
															{!!draft?.fixupSummary?.length && (
																<span className="inline-flex items-center gap-0.5 rounded-sm border px-1 text-[10px] font-medium leading-4 text-muted-foreground">
																	<Wand2 className="size-2.5" />
																	Fix-ups
																</span>
															)}
														</span>
													)}
												</span>
												<StagedMark draft={draft} />
											</button>
										</motion.li>
									)
								})}
							</AnimatePresence>
						</ul>
					</div>
				))}
			</div>
		</div>
	)
}

export function QueueGallery({
	rows,
	currentId,
	drafts,
	disabled,
	onSelect,
}: {
	rows: Submission[]
	currentId?: string
	drafts: Record<string, ReviewDraft>
	disabled: boolean
	onSelect: (id: string) => void
}) {
	return (
		<section aria-label="Queue gallery" className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<h2 className="font-semibold">Queue gallery</h2>
					<p className="text-sm text-muted-foreground">Scan the whole queue at a glance. Click a tile to review it.</p>
				</div>
			</div>
			<MagicCardPointerProvider className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
				{rows.map((row) => {
					const draft = drafts[row.id]
					return (
						<MagicCard key={row.id} className={cn("rounded-md shadow-md", currentId === row.id && selectedRing)}>
							<button
								type="button"
								disabled={disabled}
								onClick={() => onSelect(row.id)}
								className="group relative flex h-full w-full flex-col items-center p-3 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4"
							>
								<StagedMark draft={draft} className="absolute top-2 right-2" />
								<Thumbnail submission={row} large className="mb-2 size-16 rounded-lg p-2" />
								<span className="w-full font-mono text-xs font-medium [overflow-wrap:anywhere] transition-colors group-hover:text-primary sm:text-sm">
									{draft?.fixups?.name || row.name}
								</span>
								<span className="mt-1.5 flex flex-wrap justify-center gap-1">
									<Kind record={row} />
									<Round round={row.round} />
								</span>
								<span className="mt-1.5 flex max-w-full items-center gap-1 text-[10px] text-muted-foreground">
									<span className="truncate">{row.expand?.created_by?.username || "Contributor"}</span>
									<span aria-hidden>·</span>
									<Time value={row.created} className="text-[10px]" />
								</span>
							</button>
						</MagicCard>
					)
				})}
			</MagicCardPointerProvider>
		</section>
	)
}
