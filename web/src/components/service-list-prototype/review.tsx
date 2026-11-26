"use client"

import { ArrowRight, Download } from "lucide-react"
import { type FormEvent, type MouseEvent, useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { IconSearchEntry } from "@/types/icons"
import {
	buildReviewTsv,
	createReviewRows,
	MAX_SERVICE_ROWS,
	type ServiceListAction,
	type ServiceListCandidate,
	type ServiceListRow,
	searchReplacementIcons,
	updateReviewRow,
} from "./model"
import { candidateName, FocusReview, ListReview, TileReview } from "./review-layouts"

const EXAMPLE = ["Home Assistant", "pihole", "Sonarr 4K", "Paperless", "Homepage", "My NAS Portal"].join("\n")

function IconPicker({
	icons,
	row,
	previousFocus,
	onChoose,
	onClose,
}: {
	icons: IconSearchEntry[]
	row: ServiceListRow
	previousFocus: HTMLButtonElement | null
	onChoose: (candidate: ServiceListCandidate) => void
	onClose: () => void
}) {
	const [query, setQuery] = useState(row.name)
	const input = useRef<HTMLInputElement>(null)
	const searchId = useId()
	const results = useMemo(() => searchReplacementIcons(icons, query), [icons, query])

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-h-[85dvh] overflow-y-auto motion-reduce:animate-none"
				onOpenAutoFocus={(event) => {
					event.preventDefault()
					input.current?.focus()
					input.current?.select()
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault()
					previousFocus?.focus()
				}}
			>
				<DialogHeader className="pr-7 text-left">
					<DialogTitle>Find an icon</DialogTitle>
					<DialogDescription className="break-words">Choose a match for {row.name}.</DialogDescription>
				</DialogHeader>
				<div>
					<label htmlFor={searchId} className="sr-only">
						Search the icon catalog
					</label>
					<Input
						ref={input}
						id={searchId}
						type="search"
						value={query}
						placeholder="Search the icon catalog"
						className="min-h-11"
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				<output className="text-sm text-muted-foreground empty:hidden">
					{query.trim() && results.length === 0 && "No matching icons. Try another name."}
				</output>
				{results.length > 0 && (
					<ul className="max-h-72 list-none divide-y overflow-y-auto rounded-md border">
						{results.map((candidate) => (
							<li key={candidate.url}>
								<button
									type="button"
									className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
									onClick={() => onChoose(candidate)}
								>
									<span className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100">
										<UnoptimizedImage src={candidate.url} alt="" width={26} height={26} className="object-contain" />
									</span>
									<span className="min-w-0">
										<span className="block break-words text-sm font-medium">{candidateName(candidate)}</span>
										<span className="block break-all text-xs text-muted-foreground">{candidate.slug}</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	)
}

export function ServiceListReview({ icons, layout }: { icons: IconSearchEntry[]; layout: "tiles" | "list" | "focus" }) {
	const [draft, setDraft] = useState("")
	const [rows, setRows] = useState<ServiceListRow[]>([])
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState("")
	const [focusIndex, setFocusIndex] = useState(0)
	const [pickerId, setPickerId] = useState<number | null>(null)
	const activeImport = useRef<AbortController | null>(null)
	const pickerTrigger = useRef<HTMLButtonElement | null>(null)
	const reviewHeading = useRef<HTMLHeadingElement>(null)
	const focusReviewHeading = useRef(false)
	const inputId = useId()
	const reviewHeadingId = useId()

	const pickerRow = rows.find((row) => row.id === pickerId)
	const confirmed = rows.filter((row) => row.status === "confirmed").length
	const skipped = rows.filter((row) => row.status === "skipped").length
	const open = rows.length - confirmed - skipped
	let inputDescriptions = `${inputId}-help`
	if (error) inputDescriptions += ` ${inputId}-error`

	useEffect(() => () => activeImport.current?.abort(), [])
	useEffect(() => {
		if (focusReviewHeading.current && rows.length > 0) {
			focusReviewHeading.current = false
			reviewHeading.current?.focus()
		}
	}, [rows])

	async function importList(input: string) {
		const controller = new AbortController()
		activeImport.current?.abort()
		activeImport.current = controller
		setBusy(true)
		setError("")

		try {
			const nextRows = await createReviewRows(input, icons, controller.signal)
			if (controller.signal.aborted) return

			focusReviewHeading.current = true
			setRows(nextRows)
			setFocusIndex(0)
			setPickerId(null)
		} catch (failure) {
			if (controller.signal.aborted) return

			if (failure instanceof Error) setError(failure.message)
			else setError("Could not find icons. Try again.")
		} finally {
			if (activeImport.current === controller && !controller.signal.aborted) {
				activeImport.current = null
				setBusy(false)
			}
		}
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		void importList(draft)
	}

	function loadExample() {
		setDraft(EXAMPLE)
		void importList(EXAMPLE)
	}

	function applyAction(id: number, action: ServiceListAction) {
		setRows((current) =>
			current.map((row) => {
				if (row.id === id) return updateReviewRow(row, action)
				return row
			}),
		)
	}

	function openPicker(id: number, event: MouseEvent<HTMLButtonElement>) {
		pickerTrigger.current = event.currentTarget
		setPickerId(id)
	}

	function downloadTsv() {
		const file = new Blob([buildReviewTsv(rows)], { type: "text/tab-separated-values;charset=utf-8" })
		const url = URL.createObjectURL(file)
		const link = document.createElement("a")
		link.href = url
		link.download = "service-icons.tsv"
		document.body.append(link)
		link.click()
		link.remove()
		window.setTimeout(() => URL.revokeObjectURL(url), 1000)
	}

	return (
		<div className="space-y-8">
			<form
				onSubmit={handleSubmit}
				aria-busy={busy}
				className="grid gap-4 rounded-xl border bg-muted/70 p-4 sm:gap-6 sm:p-6 md:grid-cols-[minmax(10rem,1fr)_minmax(0,2.5fr)]"
			>
				<div>
					<label htmlFor={inputId} className="text-lg font-semibold tracking-tight">
						List of services
					</label>
					<p id={`${inputId}-help`} className="mt-1 text-sm text-muted-foreground">
						Paste one name per line, up to {MAX_SERVICE_ROWS} services.
					</p>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="mt-3 motion-reduce:transition-none motion-reduce:hover:scale-100"
						disabled={busy}
						onClick={loadExample}
					>
						Use example
					</Button>
				</div>
				<div className="min-w-0">
					<Textarea
						id={inputId}
						aria-describedby={inputDescriptions}
						aria-invalid={Boolean(error)}
						value={draft}
						readOnly={busy}
						rows={4}
						spellCheck={false}
						placeholder={"Home Assistant\npihole\nSonarr 4K"}
						className="min-h-28 resize-y border-border bg-background [field-sizing:fixed]"
						onChange={(event) => {
							setDraft(event.target.value)
							setError("")
						}}
					/>
					<div className="mt-3 flex flex-wrap items-center justify-end gap-3">
						{error && (
							<p id={`${inputId}-error`} role="alert" className="mr-auto text-sm text-destructive">
								{error}
							</p>
						)}
						<Button
							type="submit"
							size="lg"
							className="motion-reduce:transition-none motion-reduce:hover:scale-100"
							disabled={busy || !draft.trim()}
						>
							{busy ? "Finding icons…" : "Find icons"}
							<ArrowRight aria-hidden="true" />
						</Button>
					</div>
				</div>
			</form>

			{rows.length > 0 && (
				<section aria-labelledby={reviewHeadingId} className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 ref={reviewHeading} id={reviewHeadingId} tabIndex={-1} className="scroll-mt-28 text-xl font-semibold tracking-tight">
								Review matches
							</h2>
							<output className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums text-muted-foreground">
								<span>
									{confirmed} of {rows.length} confirmed
								</span>
								{open > 0 && <span>{open} to review</span>}
								{skipped > 0 && <span>{skipped} skipped</span>}
							</output>
						</div>
						<Button
							type="button"
							variant="outline"
							size="lg"
							className="motion-reduce:transition-none motion-reduce:hover:scale-100"
							disabled={confirmed === 0}
							onClick={downloadTsv}
						>
							<Download aria-hidden="true" />
							Download TSV
						</Button>
					</div>
					{layout === "tiles" && <TileReview rows={rows} onAction={applyAction} onFind={openPicker} />}
					{layout === "list" && <ListReview rows={rows} onAction={applyAction} onFind={openPicker} />}
					{layout === "focus" && (
						<FocusReview rows={rows} index={focusIndex} onIndexChange={setFocusIndex} onAction={applyAction} onFind={openPicker} />
					)}
				</section>
			)}

			{pickerRow && (
				<IconPicker
					key={pickerRow.id}
					icons={icons}
					row={pickerRow}
					previousFocus={pickerTrigger.current}
					onChoose={(candidate) => {
						applyAction(pickerRow.id, { type: "select", candidate })
						setPickerId(null)
					}}
					onClose={() => setPickerId(null)}
				/>
			)}
		</div>
	)
}
