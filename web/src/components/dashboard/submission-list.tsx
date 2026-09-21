"use client"
import { type ColumnDef, flexRender, getCoreRowModel, type SortingState, useReactTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, SlidersHorizontal } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
	compact = false,
}: {
	value: string
	onChange: (value: string) => void
	label: string
	type?: string
	placeholder?: string
	compact?: boolean
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
			<span className={cn(compact && "sr-only")}>{label}</span>
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
		<div className="border-b bg-background p-2">
			<div className="flex flex-wrap items-center gap-2">
				<div className="min-w-36 flex-1">
					<FilterInput
						compact
						label="Search submissions"
						placeholder="Search icons or submitters…"
						value={filters.search}
						onChange={(search) => onChange({ search })}
					/>
				</div>
				{filters.view === "submissions" && (
					<select
						aria-label="Filter status"
						className="h-9 max-w-full rounded-md border bg-background px-2 text-sm"
						value={filters.status}
						onChange={(event) => onChange({ status: event.target.value })}
					>
						<option value="">All statuses</option>
						{Object.entries(statusLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				)}
				<details className="group">
					<summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border px-3 text-xs font-medium">
						<SlidersHorizontal className="size-3.5" />
						Filters
						{(filters.submitter || filters.reviewer || filters.from || filters.to) && <span className="size-1.5 rounded-full bg-primary" />}
					</summary>
					<div className="mt-2 grid grid-cols-2 gap-2">
						<FilterInput label="Submitter" value={filters.submitter} onChange={(submitter) => onChange({ submitter })} />
						{isAdmin && <FilterInput label="Reviewer" value={filters.reviewer} onChange={(reviewer) => onChange({ reviewer })} />}
						<FilterInput label="Updated from (UTC)" type="date" value={filters.from} onChange={(from) => onChange({ from })} />
						<FilterInput label="Updated through (UTC)" type="date" value={filters.to} onChange={(to) => onChange({ to })} />
					</div>
				</details>
				{(filters.search || filters.status || filters.submitter || filters.reviewer || filters.from || filters.to) && (
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onChange({ search: "", status: "", submitter: "", reviewer: "", from: "", to: "" })}
					>
						Clear
					</Button>
				)}
			</div>
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
	sort,
	onSort,
}: {
	records: Submission[]
	selected: string[]
	onSelection: (ids: string[]) => void
	onOpen: (id: string) => void
	activeId: string
	isAdmin: boolean
	disabled: boolean
	view: DashboardFilters["view"]
	sort: string
	onSort: (sort: string) => void
}) {
	const eligible = records.filter((row) => ["pending", "approved"].includes(row.status))
	const allSelected = eligible.length > 0 && eligible.every((row) => selected.includes(row.id))
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
	const columns: ColumnDef<Submission>[] = []
	if (isAdmin)
		columns.push({
			id: "select",
			enableSorting: false,
			header: () => (
				<input
					type="checkbox"
					aria-label="Select eligible submissions on this page"
					className="size-4 accent-[var(--primary)]"
					checked={allSelected}
					disabled={disabled || !eligible.length}
					onChange={() => {
						if (allSelected) onSelection([])
						else onSelection(eligible.map((row) => row.id))
					}}
				/>
			),
			cell: ({ row }) => (
				<input
					type="checkbox"
					aria-label={`Select ${row.original.name}`}
					className="size-4 accent-[var(--primary)]"
					checked={selected.includes(row.id)}
					disabled={disabled || !["pending", "approved"].includes(row.original.status)}
					onChange={() => {
						if (selected.includes(row.id)) onSelection(selected.filter((id) => id !== row.id))
						else onSelection([...selected, row.id])
					}}
				/>
			),
		})
	columns.push({
		id: "name",
		accessorKey: "name",
		header: "Icon",
		cell: ({ row }) => (
			<button
				type="button"
				onClick={() => onOpen(row.id)}
				data-submission={row.id}
				className="flex w-full min-w-0 items-center gap-2 text-left outline-offset-4"
			>
				<Thumbnail submission={row.original} />
				<span className="truncate font-medium">{row.original.name}</span>
			</button>
		),
	})
	columns.push({ id: "submitter", accessorFn: (record) => record.expand?.created_by?.username || "Contributor", header: "Submitter" })
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
	if (!records.length) return <Empty title="No submissions found" />
	function columnClass(id: string) {
		if (id === "name") return "w-full min-w-40 max-w-64"
		if (id === "select") return "w-10"
		return "max-w-40"
	}
	return (
		<Table>
			<TableHeader className="sticky top-0 z-10 bg-muted">
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id}>
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
											className="flex items-center gap-1.5 rounded py-2 text-xs hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
											aria-label={`Sort by ${header.column.columnDef.header}`}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											<SortIcon className="size-3.5" />
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
					<TableRow key={row.id} data-state={row.id === activeId || selected.includes(row.id) ? "selected" : undefined} className="h-12">
						{row.getVisibleCells().map((cell) => (
							<TableCell key={cell.id} className={cn("truncate text-xs", columnClass(cell.column.id))}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
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
