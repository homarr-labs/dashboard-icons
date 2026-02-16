"use client"

import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { ChevronDown, ChevronRight, Filter, Github, ImageIcon, Rocket, Search, SortDesc, X } from "lucide-react"
import * as React from "react"
import { StatusBadge } from "@/components/status-badge"
import { SubmissionDetails } from "@/components/submission-details"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserDisplay } from "@/components/user-display"
import { useIsMobile } from "@/hooks/use-mobile"
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
// For admins: approved first (needs CI action), then pending, then rest
// For non-admins: pending first (waiting on review), then approved, then rest
const groupAndSortSubmissions = (submissions: Submission[], isAdmin: boolean): Submission[] => {
	const statusPriority = isAdmin
		? { approved: 0, pending: 1, added_to_collection: 2, rejected: 3 }
		: { pending: 0, approved: 1, added_to_collection: 2, rejected: 3 }

	return [...submissions].sort((a, b) => {
		const statusDiff = statusPriority[a.status] - statusPriority[b.status]
		if (statusDiff !== 0) return statusDiff

		return new Date(b.updated).getTime() - new Date(a.updated).getTime()
	})
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
	const isMobile = useIsMobile()
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = React.useState("")
	const [userFilter, setUserFilter] = React.useState<{ userId: string; displayName: string } | null>(null)
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
	const [mobileDetailSubmission, setMobileDetailSubmission] = React.useState<Submission | null>(null)

	// Handle row expansion - only one row can be expanded at a time
	const handleRowToggle = React.useCallback((rowId: string, isExpanded: boolean) => {
		setExpanded(isExpanded ? {} : { [rowId]: true })
	}, [])

	const groupedData = React.useMemo(() => {
		return groupAndSortSubmissions(data, isAdmin)
	}, [data, isAdmin])

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
				accessorKey: "assets",
				header: "Preview",
				cell: ({ row }) => {
					const assets = row.getValue("assets") as string[]
					const name = row.getValue("name") as string
					if (assets.length > 0) {
						return (
							<div className="w-12 h-12 rounded border flex items-center justify-center bg-background p-2">
								<img
									src={`${pb.baseURL}/api/files/submissions/${row.original.id}/${assets[0]}?thumb=100x100` || "/placeholder.svg"}
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
					return <StatusBadge status={status} showCollectionStatus />
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
					const expandedData = submission.expand
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
			const expandedData = submission.expand
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

	const approvedSubmissions = React.useMemo(() => {
		return data.filter((s) => s.status === "approved")
	}, [data])

	const handleBulkTrigger = () => {
		if (onBulkTriggerWorkflow && selectedSubmissionIds.length > 0) {
			onBulkTriggerWorkflow(selectedSubmissionIds)
			setRowSelection({})
		}
	}

	const handleSelectAllApproved = () => {
		const newSelection: RowSelectionState = {}
		for (const s of approvedSubmissions) {
			newSelection[s.id] = true
		}
		setRowSelection(newSelection)
	}

	const mobileFilteredData = React.useMemo(() => {
		let filtered = groupedData
		if (globalFilter) {
			const searchValue = globalFilter.toLowerCase()
			filtered = filtered.filter((submission) => {
				const expandedData = submission.expand
				const displayName = getDisplayName(submission, expandedData)
				return (
					submission.name.toLowerCase().includes(searchValue) ||
					submission.status.toLowerCase().includes(searchValue) ||
					displayName.toLowerCase().includes(searchValue)
				)
			})
		}
		if (userFilter) {
			filtered = filtered.filter((submission) => submission.created_by === userFilter.userId)
		}
		return filtered
	}, [groupedData, globalFilter, userFilter])

	const toggleMobileSelection = (id: string) => {
		setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }))
	}

	return (
		<div className="space-y-4">
			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1 border rounded-md bg-background">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder="Search submissions..."
						autoFocus={!isMobile}
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
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
							{selectedSubmissionIds.length} selected
						</Badge>
						<span className="text-sm text-muted-foreground">
							approved submission{selectedSubmissionIds.length > 1 ? "s" : ""} ready to process
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={() => setRowSelection({})} className="flex-1 sm:flex-none">
							Clear selection
						</Button>
						<Button
							size="sm"
							onClick={handleBulkTrigger}
							disabled={isBulkTriggeringWorkflow}
							className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
						>
							<Github className="w-4 h-4 mr-2" />
							{isBulkTriggeringWorkflow ? "Triggering..." : `Trigger All (${selectedSubmissionIds.length})`}
						</Button>
					</div>
				</div>
			)}

			{isAdmin && approvedSubmissions.length > 0 && selectedSubmissionIds.length === 0 && (
				<Alert className="border-amber-500/30 bg-amber-500/5">
					<Rocket className="h-4 w-4 text-amber-500" />
					<AlertTitle className="text-amber-600 dark:text-amber-400">
						{approvedSubmissions.length} approved submission{approvedSubmissions.length > 1 ? "s" : ""} ready for GitHub CI
					</AlertTitle>
					<AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
						<span className="text-sm text-muted-foreground">
							Select submissions to trigger the GitHub Action workflow and add them to the collection.
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={handleSelectAllApproved}
							className="w-fit shrink-0 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
						>
							Select all approved
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{isMobile ? (
				<>
					{/* Mobile Card List */}
					<div className="space-y-2">
						{mobileFilteredData.length > 0 ? (
							(() => {
								let lastStatus: string | null = null
								return mobileFilteredData.map((submission) => {
									const currentStatus = submission.status
									const showStatusHeader = currentStatus !== lastStatus
									lastStatus = currentStatus
									const assets = submission.assets
									const expandedData = submission.expand
									const displayName = getDisplayName(submission, expandedData)
									const isSelected = !!rowSelection[submission.id]
									const isApproved = submission.status === "approved"

									return (
										<React.Fragment key={submission.id}>
											{showStatusHeader && (
												<div className="flex items-center gap-2 pt-3 pb-1 px-1">
													<StatusBadge status={currentStatus} showCollectionStatus />
													<span className="text-xs text-muted-foreground">
														{mobileFilteredData.filter((s) => s.status === currentStatus).length}
														{mobileFilteredData.filter((s) => s.status === currentStatus).length === 1 ? " submission" : " submissions"}
													</span>
												</div>
											)}
											<div
												className={cn(
													"flex items-center gap-3 p-3 rounded-lg border bg-background cursor-pointer active:bg-muted/50 transition-colors",
													isSelected && "ring-2 ring-primary/50 bg-primary/5",
													isApproved && !isSelected && "border-l-2 border-l-green-500",
												)}
												onClick={() => setMobileDetailSubmission(submission)}
											>
												{isAdmin && isApproved && (
													<Checkbox
														checked={isSelected}
														onCheckedChange={() => toggleMobileSelection(submission.id)}
														onClick={(e: React.MouseEvent) => e.stopPropagation()}
														aria-label="Select row"
														className="shrink-0"
													/>
												)}
												{assets.length > 0 ? (
													<div className="w-10 h-10 rounded border flex items-center justify-center bg-background p-1.5 shrink-0">
														<img
															src={`${pb.baseURL}/api/files/submissions/${submission.id}/${assets[0]}?thumb=100x100`}
															alt={submission.name}
															className="w-full h-full object-contain"
														/>
													</div>
												) : (
													<div className="w-10 h-10 rounded border flex items-center justify-center bg-muted shrink-0">
														<ImageIcon className="w-5 h-5 text-muted-foreground" />
													</div>
												)}
												<div className="flex-1 min-w-0">
													<div className="font-medium capitalize truncate">{submission.name}</div>
													<div className="flex items-center gap-2 mt-0.5">
														<span className="text-xs text-muted-foreground truncate">{displayName}</span>
														<span className="text-xs text-muted-foreground">&middot;</span>
														<span className="text-xs text-muted-foreground whitespace-nowrap">{dayjs(submission.updated).fromNow()}</span>
													</div>
												</div>
												<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
											</div>
										</React.Fragment>
									)
								})
							})()
						) : (
							<div className="py-16 flex flex-col items-center gap-2">
								<ImageIcon className="h-10 w-10 text-muted-foreground/30" />
								<p className="text-muted-foreground font-medium">
									{globalFilter || userFilter ? "No submissions match your search" : "No submissions yet"}
								</p>
								{!(globalFilter || userFilter) && (
									<p className="text-sm text-muted-foreground/70">Submissions will appear here once they are created.</p>
								)}
							</div>
						)}
					</div>

					{/* Mobile Detail Drawer */}
					<Drawer open={!!mobileDetailSubmission} onOpenChange={(open) => !open && setMobileDetailSubmission(null)}>
						<DrawerContent className="max-h-[85vh] bg-background">
							<DrawerHeader className="text-left pb-2">
								<DrawerTitle className="capitalize">{mobileDetailSubmission?.name}</DrawerTitle>
							</DrawerHeader>
							<div className="overflow-y-auto px-4 pb-6">
								{mobileDetailSubmission && (
									<SubmissionDetails
										submission={mobileDetailSubmission}
										isAdmin={isAdmin}
										onUserClick={handleUserFilter}
										onApprove={
											mobileDetailSubmission.status === "pending" && isAdmin
												? () => {
														onApprove(mobileDetailSubmission.id)
														setMobileDetailSubmission(null)
													}
												: undefined
										}
										onReject={
											mobileDetailSubmission.status === "pending" && isAdmin
												? () => {
														onReject(mobileDetailSubmission.id)
														setMobileDetailSubmission(null)
													}
												: undefined
										}
										onTriggerWorkflow={
											mobileDetailSubmission.status === "approved" && isAdmin && onTriggerWorkflow
												? () => {
														onTriggerWorkflow(mobileDetailSubmission.id)
														setMobileDetailSubmission(null)
													}
												: undefined
										}
										isApproving={isApproving}
										isRejecting={isRejecting}
										isTriggeringWorkflow={isTriggeringWorkflow}
										workflowUrl={workflowUrl}
									/>
								)}
							</div>
						</DrawerContent>
					</Drawer>
				</>
			) : (
				/* Desktop Table */
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
																<StatusBadge status={currentStatus} showCollectionStatus />
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
													className={cn(
														"cursor-pointer hover:bg-muted/50 transition-colors",
														row.getIsExpanded() && "bg-muted/30",
														row.original.status === "approved" && "bg-green-500/[0.03] hover:bg-green-500/[0.07]",
													)}
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
									<TableCell colSpan={columns.length} className="h-48 text-center">
										<div className="flex flex-col items-center gap-2">
											<ImageIcon className="h-10 w-10 text-muted-foreground/30" />
											<p className="text-muted-foreground font-medium">
												{globalFilter || userFilter ? "No submissions match your search" : "No submissions yet"}
											</p>
											{!(globalFilter || userFilter) && (
												<p className="text-sm text-muted-foreground/70">Submissions will appear here once they are created.</p>
											)}
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
