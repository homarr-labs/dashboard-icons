"use client"
import { useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateTakedownIcon } from "@/app/actions/takedowns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { dashboardKey, dashboardRequest, useTakedowns } from "@/hooks/use-dashboard"
import { useIconCatalog } from "@/hooks/use-icon-catalog"
import { type Takedown, type TakedownRequest, type TakedownStatus, takedownReasons, takedownStatusLabels } from "@/lib/dashboard/takedowns"
import { getIconImageUrl } from "@/lib/icon-url"
import type { IconSearchEntry } from "@/types/icons"
import { Empty, ErrorState, Loading, Panel, Time } from "./primitives"

const MAX_VISIBLE_ICONS = 100
const CUSTOM_REASON = "__custom__"

function matches(icon: IconSearchEntry, query: string): boolean {
	if (!query) return true
	const normalized = query.trim().toLowerCase()
	if (icon.name.toLowerCase().includes(normalized)) return true
	return icon.data.aliases.some((alias) => alias.toLowerCase().includes(normalized))
}

function statusClass(status: TakedownStatus): string {
	switch (status) {
		case "succeeded":
			return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
		case "requested":
		case "queued":
		case "running":
			return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
		case "failed":
			return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
		default:
			return "border-muted/30 bg-muted/20 text-muted-foreground"
	}
}

function TakedownDialog({ icon, onClose }: { icon: string; onClose: () => void }) {
	const client = useQueryClient()
	const [reason, setReason] = useState(takedownReasons[0])
	const [customReason, setCustomReason] = useState("")
	const [requesterName, setRequesterName] = useState("")
	const [requesterEmail, setRequesterEmail] = useState("")
	const [description, setDescription] = useState("")
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState("")

	const submit = async () => {
		const resolvedReason = reason === CUSTOM_REASON ? customReason.trim() : reason
		if (!resolvedReason) {
			setError("Please provide a reason for the removal.")
			return
		}
		setError("")
		setBusy(true)
		try {
			const payload: TakedownRequest = {
				icon,
				reason: resolvedReason,
				...(requesterName.trim() ? { requester_name: requesterName.trim() } : {}),
				...(requesterEmail.trim() ? { requester_email: requesterEmail.trim() } : {}),
				...(description.trim() ? { description: description.trim() } : {}),
			}
			await dashboardRequest<Takedown>("icons/takedown", payload)
			void client.invalidateQueries({ queryKey: [...dashboardKey, "takedowns"] })
			toast.success("Takedown requested", { description: `The removal of "${icon}" was dispatched to the repository.` })
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : "The takedown could not be requested. Please try again.")
		} finally {
			setBusy(false)
		}
	}

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Remove icon for takedown</DialogTitle>
					<DialogDescription>
						This permanently removes <span className="font-medium text-foreground">{icon}</span> from the collection. Its direct links will
						serve a placeholder image and the removal is recorded publicly.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<label htmlFor="takedown-reason" className="space-y-1.5 text-sm">
						<span className="font-semibold">Reason</span>
						<select
							id="takedown-reason"
							className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
						>
							{takedownReasons.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
							<option value={CUSTOM_REASON}>Custom…</option>
						</select>
					</label>
					{reason === CUSTOM_REASON && (
						<label htmlFor="takedown-custom-reason" className="space-y-1.5 text-sm">
							<span className="font-semibold">Custom reason</span>
							<Textarea
								id="takedown-custom-reason"
								value={customReason}
								onChange={(event) => setCustomReason(event.target.value)}
								placeholder="Describe the legal basis for the request…"
								maxLength={500}
								rows={2}
							/>
						</label>
					)}
					<div className="grid gap-4 sm:grid-cols-2">
						<label htmlFor="takedown-requester-name" className="space-y-1.5 text-sm">
							<span className="font-semibold">Requester name</span>
							<Input
								id="takedown-requester-name"
								value={requesterName}
								onChange={(event) => setRequesterName(event.target.value)}
								placeholder="Rights holder or representative"
								maxLength={200}
							/>
						</label>
						<label htmlFor="takedown-requester-email" className="space-y-1.5 text-sm">
							<span className="font-semibold">Requester email</span>
							<Input
								id="takedown-requester-email"
								type="email"
								value={requesterEmail}
								onChange={(event) => setRequesterEmail(event.target.value)}
								placeholder="you@example.com"
								maxLength={320}
							/>
						</label>
					</div>
					<label htmlFor="takedown-notes" className="space-y-1.5 text-sm">
						<span className="font-semibold">Notes (optional)</span>
						<Textarea
							id="takedown-notes"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Reference number, affected URLs, or additional context…"
							maxLength={2000}
							rows={3}
						/>
					</label>
					{error && (
						<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" disabled={busy} onClick={onClose}>
						Cancel
					</Button>
					<Button variant="destructive" disabled={busy} onClick={() => void submit()}>
						{busy ? "Requesting…" : "Request removal"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function IconManager() {
	const catalogue = useIconCatalog()
	const takedowns = useTakedowns(true)
	const [search, setSearch] = useState("")
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

	const icons = useMemo(
		() => (catalogue.data || []).filter((icon) => icon.source === "native").filter((icon) => matches(icon, search)),
		[catalogue.data, search],
	)
	const takedownByIcon = new Map<string, Takedown>()
	for (const entry of takedowns.data?.items || []) takedownByIcon.set(entry.icon, entry)
	const visibleIcons = icons.slice(0, MAX_VISIBLE_ICONS)

	// Revalidate the public pages once a takedown finishes so the icon
	// disappears from the catalogue promptly instead of after the ISR window.
	const previousTakedownStatus = useRef<Map<string, TakedownStatus>>(new Map())
	useEffect(() => {
		for (const entry of takedowns.data?.items || []) {
			if (entry.status === "succeeded" && previousTakedownStatus.current.get(entry.id) !== "succeeded") {
				void revalidateTakedownIcon(entry.icon)
			}
			previousTakedownStatus.current.set(entry.id, entry.status)
		}
	}, [takedowns.data])

	return (
		<div className="grid min-h-0 flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
			<Panel
				title="Existing icons"
				action={
					<span className="text-xs text-muted-foreground">
						{icons.length.toLocaleString()} native {icons.length === 1 ? "icon" : "icons"}
					</span>
				}
			>
				{catalogue.isPending && <Loading />}
				{catalogue.isError && <ErrorState error={catalogue.error} retry={() => void catalogue.refetch()} />}
				{catalogue.data && (
					<div className="flex min-h-0 flex-1 flex-col">
						<div className="relative border-b bg-background p-2">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search icons by name or alias…"
									aria-label="Search existing icons"
									className="h-9 pl-9"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
								/>
							</div>
						</div>
						{visibleIcons.length === 0 && <Empty title="No icons found">Try a different name or alias.</Empty>}
						{visibleIcons.length > 0 && (
							<div className="max-h-[46dvh] min-h-0 flex-1 divide-y overflow-y-auto">
								{visibleIcons.map((icon) => {
									const takedown = takedownByIcon.get(icon.name)
									return (
										<div key={icon.name} className="flex items-center gap-3 px-4 py-2">
											<span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-1.5">
												<UnoptimizedImage src={getIconImageUrl(icon)} alt="" className="max-h-full max-w-full object-contain" />
											</span>
											<span className="min-w-0 flex-1 truncate text-sm font-medium">{icon.name}</span>
											{takedown ? (
												<Badge className={statusClass(takedown.status)}>{takedownStatusLabels[takedown.status]}</Badge>
											) : (
												<Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setSelectedIcon(icon.name)}>
													Remove
												</Button>
											)}
										</div>
									)
								})}
							</div>
						)}
						{icons.length > MAX_VISIBLE_ICONS && (
							<p className="border-t px-4 py-2 text-xs text-muted-foreground">
								Showing {MAX_VISIBLE_ICONS} of {icons.length.toLocaleString()} matches. Narrow your search to find more.
							</p>
						)}
					</div>
				)}
			</Panel>

			<Panel
				title="Takedown history"
				action={
					<span className="text-xs text-muted-foreground">
						{takedowns.data?.totalItems || 0} {takedowns.data?.totalItems === 1 ? "record" : "records"}
					</span>
				}
			>
				{takedowns.isLoading && <Loading />}
				{takedowns.error && <ErrorState error={takedowns.error} retry={() => void takedowns.refetch()} />}
				{takedowns.data && (
					<>
						{takedowns.data.items.length === 0 && (
							<Empty title="No takedowns yet">Use the icon list to request the removal of an icon.</Empty>
						)}
						<div className="max-h-[46dvh] min-h-0 divide-y overflow-y-auto">
							{takedowns.data.items.map((entry) => (
								<div key={entry.id} className="space-y-1.5 px-4 py-2.5">
									<div className="flex flex-wrap items-center gap-2">
										<span className="min-w-0 break-all font-medium">{entry.icon}</span>
										<Badge className={statusClass(entry.status)}>{takedownStatusLabels[entry.status]}</Badge>
									</div>
									<div className="text-xs leading-5 text-muted-foreground">
										<span className="capitalize">{entry.reason || "Takedown request"}</span>
										{entry.requester_name && <span> · {entry.requester_name}</span>}
										<span> · requested by {entry.requested_by_name || "an administrator"}</span>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
										<Time value={entry.created} />
										{entry.commit_sha && <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{entry.commit_sha.slice(0, 7)}</code>}
										{entry.message && <span className="truncate">{entry.message}</span>}
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</Panel>

			{selectedIcon && <TakedownDialog icon={selectedIcon} onClose={() => setSelectedIcon(null)} />}
		</div>
	)
}
