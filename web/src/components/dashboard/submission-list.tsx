"use client"
import { ArrowUpRight, SlidersHorizontal } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DashboardFilters } from "@/lib/dashboard/types"
import { statusLabels } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Empty, Status, Thumbnail, Time } from "./primitives"
export function FilterInput({
	value,
	onChange,
	label,
	type = "text",
	placeholder,
}: {
	value: string
	onChange: (value: string) => void
	label: string
	type?: string
	placeholder?: string
}) {
	const inputId = useId()
	const [draft, setDraft] = useState(value)
	const callback = useRef(onChange)
	callback.current = onChange
	useEffect(() => setDraft(value), [value])
	useEffect(() => {
		if (draft === value) return
		const timer = setTimeout(() => callback.current(draft), 300)
		return () => clearTimeout(timer)
	}, [draft, value])
	return (
		<label htmlFor={inputId} className="block min-w-0 space-y-1.5 text-xs text-muted-foreground">
			<span>{label}</span>
			<Input
				id={inputId}
				type={type}
				value={draft}
				placeholder={placeholder}
				onChange={(e) => setDraft(e.target.value)}
				className="h-9 min-w-0 bg-background text-sm text-foreground"
			/>
		</label>
	)
}
export function ListFilters({
	filters,
	onChange,
	isAdmin,
}: {
	filters: DashboardFilters
	onChange: (patch: Record<string, string>) => void
	isAdmin: boolean
}) {
	return (
		<div className="space-y-3 border-b bg-background p-4">
			<div className="flex flex-wrap items-end gap-2">
				<div className="min-w-[160px] flex-1">
					<FilterInput
						label="Search submissions"
						placeholder="Icon name or submitter…"
						value={filters.search}
						onChange={(search) => onChange({ search })}
					/>
				</div>
				<label className="space-y-1.5 text-xs text-muted-foreground">
					<span className="block">Sort</span>
					<select
						className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
						aria-label="Sort submissions"
						value={filters.sort}
						onChange={(e) => onChange({ sort: e.target.value })}
					>
						<option value="recent">Recently updated</option>
						<option value="oldest">Oldest update</option>
						<option value="name">Name A–Z</option>
					</select>
				</label>
			</div>
			<div className="flex flex-wrap gap-1.5">
				{filters.view === "submissions" &&
					Object.entries(statusLabels).map(([status, label]) => (
						<Button
							key={status}
							variant="outline"
							size="sm"
							className="h-7 px-2 text-xs aria-pressed:border-primary aria-pressed:text-primary"
							aria-pressed={filters.status === status}
							onClick={() => {
								let value = status
								if (filters.status === status) value = ""
								onChange({ status: value })
							}}
						>
							{label}
						</Button>
					))}
			</div>
			<details>
				<summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground">
					<SlidersHorizontal className="size-3" />
					More filters
					{(filters.submitter || filters.reviewer || filters.from || filters.to) && <span className="size-1.5 rounded-full bg-primary" />}
				</summary>
				<div className="mt-3 grid grid-cols-2 gap-3">
					{isAdmin && <FilterInput label="Submitter" value={filters.submitter} onChange={(submitter) => onChange({ submitter })} />}{" "}
					{isAdmin && <FilterInput label="Reviewer" value={filters.reviewer} onChange={(reviewer) => onChange({ reviewer })} />}
					<FilterInput label="Updated from (UTC)" type="date" value={filters.from} onChange={(from) => onChange({ from })} />
					<FilterInput label="Updated through (UTC)" type="date" value={filters.to} onChange={(to) => onChange({ to })} />
				</div>
			</details>
			{(filters.search || filters.status || filters.submitter || filters.reviewer || filters.from || filters.to) && (
				<Button
					size="sm"
					variant="ghost"
					className="h-6 px-0 text-xs"
					onClick={() => onChange({ search: "", status: "", submitter: "", reviewer: "", from: "", to: "" })}
				>
					Clear filters
				</Button>
			)}
		</div>
	)
}
export function SubmissionList({
	records,
	selected,
	onSelection,
	onOpen,
	activeId,
	isAdmin,
	disabled,
	view,
}: {
	records: Submission[]
	selected: string[]
	onSelection: (ids: string[]) => void
	onOpen: (id: string) => void
	activeId: string
	isAdmin: boolean
	disabled: boolean
	view: DashboardFilters["view"]
}) {
	const eligible = records.filter((row) => ["pending", "approved"].includes(row.status))
	const allSelected = eligible.length > 0 && eligible.every((row) => selected.includes(row.id))
	function toggle(id: string) {
		if (selected.includes(id)) onSelection(selected.filter((value) => value !== id))
		else onSelection([...selected, id])
	}
	if (!records.length)
		return <Empty title="No submissions here">Try another filter, or return to Overview to see recent team activity.</Empty>
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="sticky top-0 z-10 border-b bg-muted/95 text-[11px] text-muted-foreground">
					<tr>
						{isAdmin && (
							<th className="w-10 py-3 pl-4">
								<input
									type="checkbox"
									aria-label="Select eligible submissions on this page"
									checked={allSelected}
									disabled={disabled || !eligible.length}
									onChange={() => {
										if (allSelected) onSelection([])
										else onSelection(eligible.map((row) => row.id))
									}}
									className="size-4 accent-[var(--primary)]"
								/>
							</th>
						)}
						<th className="w-full px-3 py-3 font-medium">Icon</th>
						{view === "review" && <th className="hidden px-3 font-medium sm:table-cell">Assets</th>}
						<th className="hidden px-3 font-medium lg:table-cell">Submitter</th>
						{view === "submissions" && <th className="px-2 font-medium sm:px-3">Status</th>}
						{view !== "review" && <th className="hidden px-3 font-medium lg:table-cell">Reviewer</th>}
						<th className="px-3 text-right font-medium">Updated</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{records.map((record) => {
						const selectable = isAdmin && ["pending", "approved"].includes(record.status)
						const assets = record.assets || []
						const formats = [...new Set(assets.map((asset) => asset.split(".").pop()?.toUpperCase()).filter(Boolean))].join(" / ")
						let assetCount = `${assets.length} file`
						if (assets.length !== 1) assetCount += "s"
						const variants = []
						if (assets.includes(record.extras?.colors?.light || "")) variants.push("Light")
						if (assets.includes(record.extras?.colors?.dark || "")) variants.push("Dark")
						if (assets.includes(record.extras?.wordmark?.light || "") || assets.includes(record.extras?.wordmark?.dark || ""))
							variants.push("Wordmark")
						return (
							<tr key={record.id} className={cn("h-14 transition-colors hover:bg-muted/30", activeId === record.id && "bg-primary/5")}>
								{isAdmin && (
									<td className="pl-4">
										{selectable && (
											<input
												type="checkbox"
												className="size-4 accent-[var(--primary)]"
												aria-label={`Select ${record.name}`}
												checked={selected.includes(record.id)}
												disabled={disabled}
												onChange={() => toggle(record.id)}
											/>
										)}
									</td>
								)}
								<td className="max-w-0 px-3 py-2">
									<button
										type="button"
										onClick={() => onOpen(record.id)}
										data-submission={record.id}
										className="flex w-full min-w-0 items-center gap-2.5 text-left outline-offset-4"
									>
										<Thumbnail submission={record} />
										<span className="min-w-0">
											<span className="block truncate font-medium">{record.name}</span>
											{view === "review" && (
												<span className="block truncate text-[11px] text-muted-foreground sm:hidden">
													{formats || "No assets"} · {assetCount}
												</span>
											)}
											{view === "review" && record.description && (
												<span className="hidden truncate text-xs text-muted-foreground sm:block" title={record.description}>
													{record.description}
												</span>
											)}
											<span className="mt-0.5 block truncate text-[11px] text-muted-foreground lg:hidden">
												{record.expand?.created_by?.username || "Contributor"}
											</span>
										</span>
									</button>
								</td>
								{view === "review" && (
									<td className="hidden whitespace-nowrap px-3 sm:table-cell">
										<span className="text-xs font-medium">{formats || "No assets"}</span>
										<span className="mt-0.5 block text-[11px] text-muted-foreground">
											{assetCount}
											{variants.length > 0 && ` · ${variants.join(" / ")}`}
										</span>
									</td>
								)}
								<td className="hidden max-w-28 truncate px-3 text-xs text-muted-foreground lg:table-cell">
									{record.expand?.created_by?.username || "Contributor"}
								</td>
								{view === "submissions" && (
									<td className="px-2 sm:px-3">
										<Status status={record.status} />
									</td>
								)}
								{view !== "review" && (
									<td className="hidden max-w-28 truncate px-3 text-xs text-muted-foreground lg:table-cell">
										{record.expand?.approved_by?.username || "—"}
									</td>
								)}
								<td className="px-3 text-right">
									<Time value={record.updated} />
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
export function QueuePreview({ records, onOpen }: { records: Submission[]; onOpen: (id: string) => void }) {
	if (!records.length) return <div className="p-5 text-xs text-muted-foreground">All caught up. Nothing waiting here.</div>
	return (
		<div className="divide-y">
			{records.map((record) => (
				<button
					key={record.id}
					type="button"
					onClick={() => onOpen(record.id)}
					className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30"
				>
					<Thumbnail submission={record} />
					<span className="min-w-0 flex-1 truncate text-sm font-medium">{record.name}</span>
					<Time value={record.updated} />
					<ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
				</button>
			))}
		</div>
	)
}
