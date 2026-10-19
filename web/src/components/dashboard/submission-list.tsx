"use client"
import { type ColumnDef, flexRender, getCoreRowModel, type SortingState, useReactTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Rocket, Search, SlidersHorizontal, X } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DashboardFilters } from "@/lib/dashboard/types"
import { statusLabels } from "@/lib/dashboard/types"
import type { Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"
import { Avatar, Empty, Kind, Round, Status, statusStyles, Thumbnail, Time } from "./primitives"
export function FilterInput({
	value,
	onChange,
	label,
	type = "text",
	placeholder,
	compact = false,
	icon,
}: {
	value: string
	onChange: (value: string) => void
	label: string
	type?: string
	placeholder?: string
	compact?: boolean
	icon?: ReactNode
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
			<span className={cn("block font-medium", compact && "sr-only")}>{label}</span>
			<span className="relative block">
				{icon && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">{icon}</span>}
				<Input
					id={inputId}
					type={type}
					value={draft}
					placeholder={placeholder}
					onChange={(e) => setDraft(e.target.value)}
					className={cn("min-w-0 text-sm text-foreground max-lg:min-h-11", icon && "pl-9")}
				/>
			</span>
		</label>
	)
}
export function ListFilters({
	filters,
	onChange,
	counts,
}: {
	filters: DashboardFilters
	onChange: (patch: Record<string, string>) => void
	counts?: Record<Submission["status"], number>
}) {
	const advanced = [filters.submitter, filters.reviewer, filters.from, filters.to].filter(Boolean).length
	let total: number | undefined
	if (counts) total = Object.values(counts).reduce((sum, count) => sum + count, 0)
	return (
		<div className="space-y-3 border-b p-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="min-w-48 flex-1">
					<FilterInput
						compact
						label="Search submissions"
						placeholder="Search icons or submitters…"
						value={filters.search}
						onChange={(search) => onChange({ search })}
						icon={<Search />}
					/>
				</div>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm" className="max-lg:min-h-11">
							<SlidersHorizontal />
							Filters
							{!!advanced && (
								<span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
									{advanced}
								</span>
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="grid w-80 grid-cols-2 gap-3">
						<FilterInput label="Submitter" value={filters.submitter} onChange={(submitter) => onChange({ submitter })} />
						<FilterInput label="Reviewer" value={filters.reviewer} onChange={(reviewer) => onChange({ reviewer })} />
						<FilterInput label="Updated from (UTC)" type="date" value={filters.from} onChange={(from) => onChange({ from })} />
						<FilterInput label="Updated through (UTC)" type="date" value={filters.to} onChange={(to) => onChange({ to })} />
					</PopoverContent>
				</Popover>
				{(filters.search || filters.status || advanced > 0) && (
					<Button
						variant="ghost"
						size="sm"
						className="max-lg:min-h-11"
						onClick={() => onChange({ search: "", status: "", submitter: "", reviewer: "", from: "", to: "" })}
					>
						<X />
						Clear
					</Button>
				)}
			</div>
			{filters.view === "submissions" && (
				<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						aria-label="Filter status"
						value={filters.status || "all"}
						onValueChange={(value) => {
							if (value === "all") onChange({ status: "" })
							else if (value) onChange({ status: value })
						}}
					>
						{[["all", "All"], ...Object.entries(statusLabels)].map(([value, label]) => {
							let count = total
							if (value !== "all") count = counts?.[value as Submission["status"]]
							return (
								<ToggleGroupItem key={value} value={value} className="flex-none gap-2 px-3 max-lg:min-h-11">
									{value !== "all" && <span className={cn("size-2 rounded-full", statusStyles[value as Submission["status"]].dot)} />}
									{label}
									{count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
								</ToggleGroupItem>
							)
						})}
					</ToggleGroup>
				</div>
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
	disabled,
	view,
	sort,
	onSort,
}: {
	records: Submission[]
	selected: string[]
	onSelection: (ids: string[]) => void
	onOpen: (id: string) => void
	activeId: string
	disabled: boolean
	view: DashboardFilters["view"]
	sort: string
	onSort: (sort: string) => void
}) {
	const eligible = records.filter((row) => ["pending", "approved"].includes(row.status))
	const allSelected = eligible.length > 0 && eligible.every((row) => selected.includes(row.id))
	let headerChecked: boolean | "indeterminate" = allSelected
	if (!allSelected && selected.length) headerChecked = "indeterminate"
	let normalizedSort = sort
	if (sort === "recent") normalizedSort = "updated-desc"
	if (sort === "oldest") normalizedSort = "updated-asc"
	if (sort === "name") normalizedSort = "name-asc"
	let [sortId, direction] = normalizedSort.split("-")
	if (!["name", "status", "updated", "reviewer", "submitter"].includes(sortId) || !["asc", "desc"].includes(direction)) {
		sortId = "updated"
		direction = "desc"
	}
	const sorting: SortingState = [{ id: sortId, desc: direction === "desc" }]
	const columns: ColumnDef<Submission>[] = [
		{
			id: "select",
			enableSorting: false,
			header: () => (
				<Checkbox
					aria-label="Select all eligible submissions"
					className="size-[18px]"
					checked={headerChecked}
					disabled={disabled || !eligible.length}
					onCheckedChange={() => {
						if (allSelected) onSelection([])
						else onSelection(eligible.map((row) => row.id))
					}}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					aria-label={`Select ${row.original.name}`}
					className="size-[18px]"
					checked={selected.includes(row.id)}
					disabled={disabled || !["pending", "approved"].includes(row.original.status)}
					onCheckedChange={() => {
						if (selected.includes(row.id)) onSelection(selected.filter((id) => id !== row.id))
						else onSelection([...selected, row.id])
					}}
				/>
			),
		},
		{
			id: "name",
			accessorKey: "name",
			header: "Icon",
			cell: ({ row }) => (
				<button
					type="button"
					onClick={() => onOpen(row.id)}
					data-submission={row.id}
					className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>
					<Thumbnail submission={row.original} />
					<span className="min-w-0">
						<span className="block truncate font-mono text-sm font-medium transition-colors group-hover/row:text-primary">
							{row.original.name}
						</span>
						<span className="mt-1 flex gap-1">
							<Kind record={row.original} />
							<Round round={row.original.round} />
						</span>
					</span>
				</button>
			),
		},
		{
			id: "submitter",
			accessorFn: (record) => record.expand?.created_by?.username || "Contributor",
			header: "Submitter",
			cell: ({ getValue }) => (
				<span className="flex min-w-0 items-center gap-2">
					<Avatar name={String(getValue())} />
					<span className="truncate">{String(getValue())}</span>
				</span>
			),
		},
	]
	if (view === "submissions")
		columns.push({ id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <Status status={row.original.status} /> })
	columns.push({ id: "reviewer", accessorFn: (record) => record.expand?.approved_by?.username || "—", header: "Reviewer" })
	columns.push({ id: "updated", accessorKey: "updated", header: "Updated", cell: ({ row }) => <Time value={row.original.updated} /> })
	const table = useReactTable({
		data: records,
		columns,
		getRowId: (record) => record.id,
		getCoreRowModel: getCoreRowModel(),
		manualSorting: true,
		enableSortingRemoval: false,
		state: { sorting },
		onSortingChange: (updater) => {
			const next = typeof updater === "function" ? updater(sorting) : updater
			const entry = next[0]
			if (entry) onSort(`${entry.id}-${entry.desc ? "desc" : "asc"}`)
		},
	})
	if (!records.length && view === "publish")
		return (
			<Empty title="Nothing to publish" icon={Rocket}>
				Approved icons wait here until you publish them to the collection.
			</Empty>
		)
	if (!records.length) return <Empty title="No submissions found">Try another status or clear your filters.</Empty>
	function columnClass(id: string) {
		if (id === "name") return "w-full min-w-56 max-w-80"
		if (id === "select") return "w-12 pl-4"
		return "max-w-44"
	}
	return (
		<Table>
			<TableHeader className="sticky top-0 z-10 bg-background">
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id} className="hover:bg-transparent">
						{group.headers.map((header) => {
							const order = header.column.getIsSorted()
							let ariaSort: "ascending" | "descending" | "none" = "none"
							let SortIcon = ArrowUpDown
							if (order === "asc") {
								ariaSort = "ascending"
								SortIcon = ArrowUp
							}
							if (order === "desc") {
								ariaSort = "descending"
								SortIcon = ArrowDown
							}
							return (
								<TableHead key={header.id} className={columnClass(header.id)} aria-sort={header.column.getCanSort() ? ariaSort : undefined}>
									{header.column.getCanSort() ? (
										<button
											type="button"
											disabled={disabled}
											onClick={header.column.getToggleSortingHandler()}
											className={cn(
												"flex items-center gap-1.5 rounded-sm py-2 text-xs font-semibold transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none",
												order && "text-foreground",
											)}
											aria-label={`Sort by ${header.column.columnDef.header}`}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											<SortIcon className={cn("size-3.5", !order && "opacity-40")} />
										</button>
									) : (
										flexRender(header.column.columnDef.header, header.getContext())
									)}
								</TableHead>
							)
						})}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow
						key={row.id}
						data-state={row.id === activeId || selected.includes(row.id) ? "selected" : undefined}
						onClick={(event) => {
							if (event.target instanceof Element && event.target.closest("button,input,a")) return
							onOpen(row.id)
						}}
						className={cn("group/row h-16 cursor-pointer", row.id === activeId && "shadow-[inset_2px_0_0_var(--primary)]")}
					>
						{row.getVisibleCells().map((cell) => (
							<TableCell key={cell.id} className={cn("truncate text-sm", columnClass(cell.column.id))}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
