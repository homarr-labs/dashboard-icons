"use client"

import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { ChevronDown, ChevronRight, Filter, Github, ImageIcon, Search, SortDesc, X } from "lucide-react"
import * as React from "react"
import { SubmissionDetails } from "@/components/submission-details"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserDisplay } from "@/components/user-display"
import { pb, type Submission } from "@/lib/pb"
import { cn } from "@/lib/utils"

// Initialize dayjs relative time plugin
dayjs.extend(relativeTime)

// Utility function to get display name with priority: username > email > created_by field
const getDisplayName = (submission: Submission, expandedData?: any): string => {
	// Check if we have expanded user data
	if (expandedData?.created_by) {
		const user = expandedData.created_by

		// Priority: username > email
		if (user.username) {
			return user.username
		}
		if (user.email) {
			return user.email
		}
	}

	// Fallback to created_by field (could be user ID or username)
	return submission.created_by
}

interface SubmissionsDataTableProps {
	data: Submission[]
	isAdmin: boolean
	currentUserId: string
	onApprove: (id: string) => void
	onReject: (id: string) => void
	onTriggerWorkflow?: (id: string) => void
	onBulkTriggerWorkflow?: (ids: string[]) => void
	isApproving?: boolean
	isRejecting?: boolean
	isTriggeringWorkflow?: boolean
	isBulkTriggeringWorkflow?: boolean
	workflowUrl?: string
}

// Group submissions by status with priority order
const groupAndSortSubmissions = (submissions: Submission[]): Submission[] => {
	const statusPriority = { pending: 0, approved: 1, added_to_collection: 2, rejected: 3 }

	return [...submissions].sort((a, b) => {
		// First, sort by status priority
		const statusDiff = statusPriority[a.status] - statusPriority[b.status]
		if (statusDiff !== 0) return statusDiff

		// Within same status, sort by updated time (most recent first)
		return new Date(b.updated).getTime() - new Date(a.updated).getTime()
	})
}

const getStatusColor = (status: Submission["status"]) => {
	switch (status) {
		case "approved":
			return "bg-blue-500/10 text-blue-400 font-bold border-blue-500/20"
		case "rejected":
			return "bg-red-500/10 text-red-500 border-red-500/20"
		case "pending":
			return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
		case "added_to_collection":
			return "bg-green-500/10 text-green-500 border-green-500/20"
		default:
			return "bg-gray-500/10 text-gray-500 border-gray-500/20"
	}
}

const getStatusDisplayName = (status: Submission["status"]) => {
	switch (status) {
		case "pending":
			return "Pending"
		case "approved":
			return "Approved"
		case "rejected":
			return "Rejected"
		case "added_to_collection":
			return "Added to Collection"
		default:
			return status
	}
}

export function SubmissionsDataTable({
	data,
	isAdmin,
	currentUserId,
	onApprove,
	onReject,
	onTriggerWorkflow,
	onBulkTriggerWorkflow,
	isApproving,
	isRejecting,
	isTriggeringWorkflow,
	isBulkTriggeringWorkflow,
	workflowUrl,
}: SubmissionsDataTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = React.useState("")
	const [userFilter, setUserFilter] = React.useState<{ userId: string; displayName: string } | null>(null)
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

	// Handle row expansion - only one row can be expanded at a time
	const handleRowToggle = React.useCallback((rowId: string, isExpanded: boolean) => {
		setExpanded(isExpanded ? {} : { [rowId]: true })
	}, [])

	// Group and sort data by status and updated time
	const groupedData = React.useMemo(() => {
		return groupAndSortSubmissions(data)
	}, [data])

	// Handle user filter - filter by user ID but display username
	const handleUserFilter = React.useCallback(
		(userId: string, displayName: string) => {
			if (userFilter?.userId === userId) {
				setUserFilter(null)
				setColumnFilters((prev) => prev.filter((filter) => filter.id !== "created_by"))
			} else {
				setUserFilter({ userId, displayName })
				setColumnFilters((prev) => [...prev.filter((filter) => filter.id !== "created_by"), { id: "created_by", value: userId }])
			}
		},
		[userFilter],
	)

	const columns: ColumnDef<Submission>[] = React.useMemo(
		() => [
			...(isAdmin
				? [
						{
							id: "select",
							header: ({ table }: { table: any }) => {
								const approvedRows = table.getRowModel().rows.filter((row: any) => row.original.status === "approved")
								const selectedApprovedCount = approvedRows.filter((row: any) => row.getIsSelected()).length
								const allApprovedSelected = approvedRows.length > 0 && selectedApprovedCount === approvedRows.length

								return approvedRows.length > 0 ? (
									<Checkbox
										checked={allApprovedSelected}
										onCheckedChange={(value: boolean) => {
											approvedRows.forEach((row: any) => row.toggleSelected(!!value))
										}}
										aria-label="Select all approved"
										className="translate-y-[2px]"
									/>
								) : null
							},
							cell: ({ row }: { row: any }) => {
								const isApproved = row.original.status === "approved"
								return isApproved ? (
									<Checkbox
										checked={row.getIsSelected()}
										onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
										onClick={(e: React.MouseEvent) => e.stopPropagation()}
										aria-label="Select row"
										className="translate-y-[2px]"
									/>
								) : null
							},
							enableSorting: false,
							enableHiding: false,
						} as ColumnDef<Submission>,
					]
				: []),
			{
				id: "expander",
				header: () => null,
				cell: ({ row }) => {
					return (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								handleRowToggle(row.id, row.getIsExpanded())
							}}
							className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded transition-colors"
						>
							{row.getIsExpanded() ? (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							)}
						</button>
					)
				},
			},
			{
				accessorKey: "name",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className="h-auto p-0 font-semibold hover:bg-transparent"
						>
							Name
							<SortDesc className="ml-2 h-4 w-4" />
						</Button>
					)
				},
				cell: ({ row }) => <div className="font-medium capitalize">{row.getValue("name")}</div>,
			},
			{
				accessorKey: "status",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className="h-auto p-0 font-semibold hover:bg-transparent"
						>
							Status
							<SortDesc className="ml-2 h-4 w-4" />
						</Button>
					)
				},
				cell: ({ row }) => {
					const status = row.getValue("status") as Submission["status"]
					return (
						<Badge variant="outline" className={getStatusColor(status)}>
							{getStatusDisplayName(status)}
						</Badge>
					)
				},
			},
			{
				accessorKey: "created_by",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className="h-auto p-0 font-semibold hover:bg-transparent"
						>
							Submitted By
							<SortDesc className="ml-2 h-4 w-4" />
						</Button>
					)
				},
				cell: ({ row }) => {
					const submission = row.original
					const expandedData = (submission as any).expand
					const displayName = getDisplayName(submission, expandedData)
					const userId = submission.created_by

					return (
						<div className="flex items-center gap-1">
							<UserDisplay
								userId={userId}
								avatar={expandedData.created_by.avatar}
								displayName={displayName}
								onClick={handleUserFilter}
								size="md"
							/>
							{userFilter?.userId === userId && <X className="h-3 w-3 text-muted-foreground" />}
						</div>
					)
				},
			},
			{
				accessorKey: "updated",
				header: ({ column }) => {
					return (
						<Button
							variant="ghost"
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
							className="h-auto p-0 font-semibold hover:bg-transparent"
						>
							Updated
							<SortDesc className="ml-2 h-4 w-4" />
						</Button>
					)
				},
				cell: ({ row }) => {
					const date = row.getValue("updated") as string
					return (
						<div className="text-sm text-muted-foreground" title={dayjs(date).format("MMMM D, YYYY h:mm A")}>
							{dayjs(date).fromNow()}
						</div>
					)
				},
			},
			{
				accessorKey: "assets",
				header: "Preview",
				cell: ({ row }) => {
					const assets = row.getValue("assets") as string[]
					const name = row.getValue("name") as string
					if (assets.length > 0) {
						return (
							<div className="w-12 h-12 rounded border flex items-center justify-center bg-background p-2">
								<img
									src={`${pb.baseUrl}/api/files/submissions/${row.original.id}/${assets[0]}?thumb=100x100` || "/placeholder.svg"}
									alt={name}
									className="w-full h-full object-contain"
								/>
							</div>
						)
					}
					return (
						<div className="w-12 h-12 rounded border flex items-center justify-center bg-muted">
							<ImageIcon className="w-6 h-6 text-muted-foreground" />
						</div>
					)
				},
			},
		],
		[handleRowToggle, handleUserFilter, userFilter, isAdmin],
	)

	const table = useReactTable({
		data: groupedData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		onExpandedChange: setExpanded,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onRowSelectionChange: setRowSelection,
		enableRowSelection: (row) => row.original.status === "approved",
		getRowId: (row) => row.id,
		state: {
			sorting,
			expanded,
			columnFilters,
			globalFilter,
			rowSelection,
		},
		getRowCanExpand: () => true,
		globalFilterFn: (row, _columnId, value) => {
			const searchValue = value.toLowerCase()
			const name = row.getValue("name") as string
			const status = row.getValue("status") as string
			const submission = row.original
			const expandedData = (submission as any).expand
			const displayName = getDisplayName(submission, expandedData)

			return (
				name.toLowerCase().includes(searchValue) ||
				status.toLowerCase().includes(searchValue) ||
				displayName.toLowerCase().includes(searchValue)
			)
		},
	})

	const selectedSubmissionIds = React.useMemo(() => {
		return Object.keys(rowSelection).filter((id) => rowSelection[id])
	}, [rowSelection])

	const handleBulkTrigger = () => {
		if (onBulkTriggerWorkflow && selectedSubmissionIds.length > 0) {
			onBulkTriggerWorkflow(selectedSubmissionIds)
			setRowSelection({})
		}
	}

	return (
		<div className="space-y-4">
			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1  border rounded-md bg-background">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder="Search submissions..."
						autoFocus
						value={globalFilter ?? ""}
						onChange={(event) => setGlobalFilter(String(event.target.value))}
						className="pl-10"
					/>
				</div>

				{userFilter && (
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-muted-foreground" />
						<Badge variant="secondary" className="gap-1">
							User: {userFilter.displayName}
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 hover:bg-transparent"
								onClick={() => {
									setUserFilter(null)
									setColumnFilters((prev) => prev.filter((filter) => filter.id !== "created_by"))
								}}
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					</div>
				)}
			</div>

			{/* Bulk Actions Toolbar */}
			{isAdmin && selectedSubmissionIds.length > 0 && (
				<div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
							{selectedSubmissionIds.length} selected
						</Badge>
						<span className="text-sm text-muted-foreground">
							approved submission{selectedSubmissionIds.length > 1 ? "s" : ""} ready to process
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
							Clear selection
						</Button>
						<Button
							size="sm"
							onClick={handleBulkTrigger}
							disabled={isBulkTriggeringWorkflow}
							className="bg-blue-600 hover:bg-blue-700"
						>
							<Github className="w-4 h-4 mr-2" />
							{isBulkTriggeringWorkflow ? "Triggering..." : `Trigger All (${selectedSubmissionIds.length})`}
						</Button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="bg-background">
						{table.getRowModel().rows?.length ? (
							(() => {
								let lastStatus: string | null = null
								return table.getRowModel().rows.map((row, _index) => {
									const currentStatus = row.original.status
									const showStatusHeader = currentStatus !== lastStatus
									lastStatus = currentStatus

									return (
										<React.Fragment key={row.id}>
											{showStatusHeader && (
												<TableRow className="bg-muted/40 hover:bg-muted/40">
													<TableCell colSpan={columns.length} className="py-2 font-semibold text-sm">
														<div className="flex items-center gap-2">
															<Badge variant="outline" className={getStatusColor(currentStatus)}>
																{getStatusDisplayName(currentStatus)}
															</Badge>
															<span className="text-xs text-muted-foreground">
																{table.getRowModel().rows.filter((r) => r.original.status === currentStatus).length}
																{table.getRowModel().rows.filter((r) => r.original.status === currentStatus).length === 1
																	? " submission"
																	: " submissions"}
															</span>
														</div>
													</TableCell>
												</TableRow>
											)}
											<TableRow
												data-state={row.getIsSelected() && "selected"}
												className={cn("cursor-pointer hover:bg-muted/50 transition-colors", row.getIsExpanded() && "bg-muted/30")}
												onClick={() => handleRowToggle(row.id, row.getIsExpanded())}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
												))}
											</TableRow>
											{row.getIsExpanded() && (
												<TableRow>
													<TableCell colSpan={columns.length} className="p-6 bg-muted/20 border-t">
														<SubmissionDetails
															submission={row.original}
															isAdmin={isAdmin}
															onUserClick={handleUserFilter}
															onApprove={row.original.status === "pending" && isAdmin ? () => onApprove(row.original.id) : undefined}
															onReject={row.original.status === "pending" && isAdmin ? () => onReject(row.original.id) : undefined}
															onTriggerWorkflow={
																row.original.status === "approved" && isAdmin && onTriggerWorkflow
																	? () => onTriggerWorkflow(row.original.id)
																	: undefined
															}
															isApproving={isApproving}
															isRejecting={isRejecting}
															isTriggeringWorkflow={isTriggeringWorkflow}
															workflowUrl={workflowUrl}
														/>
													</TableCell>
												</TableRow>
											)}
										</React.Fragment>
									)
								})
							})()
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									{globalFilter || userFilter ? "No submissions found matching your search" : "No submissions found"}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
