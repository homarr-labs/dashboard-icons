"use client"

import { AlertCircle, Info } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { SourceBadge, StatusBadge } from "@/components/status-badge"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { type IconNameOption, useExistingIconNames } from "@/hooks/use-submissions"
import { cn } from "@/lib/utils"

interface IconNameComboboxProps {
	value: string
	onValueChange: (value: string) => void
	onIconSelected?: (icon: IconNameOption | null) => void
	error?: string
	isInvalid?: boolean
}

export function IconNameCombobox({ value, onValueChange, onIconSelected, error, isInvalid }: IconNameComboboxProps) {
	const { data: existingIcons = [], isLoading: loading } = useExistingIconNames()
	const [isFocused, setIsFocused] = useState(false)
	const [rawInput, setRawInput] = useState(value)

	const sanitizeIconName = (input: string): string => {
		return input
			.toLowerCase()
			.trim()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/g, "")
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value
		setRawInput(raw)
		const sanitized = sanitizeIconName(raw)
		onValueChange(sanitized)
		onIconSelected?.(null)
	}

	const filteredIcons = useMemo(() => {
		const searchTerm = rawInput || value
		if (!searchTerm || !existingIcons.length) return []

		const lowerSearch = searchTerm.toLowerCase()
		return existingIcons.filter((icon) => icon.value.toLowerCase().includes(lowerSearch) || icon.label.toLowerCase().includes(lowerSearch))
	}, [rawInput, value, existingIcons])

	const matchedIcon = useMemo(() => {
		if (!value || !existingIcons.length) return null
		return existingIcons.find((icon) => icon.value === value) ?? null
	}, [value, existingIcons])

	const isExistingSubmission = !!matchedIcon?.status
	const isClaimable = matchedIcon?.status === "rejected"
	// Non-rejected submissions can only be replaced by their author, so warn
	// when the ID is known to belong to someone else. Rejected records stay
	// claimable by anyone, so they keep the replacement wording.
	const isOtherSubmission = isExistingSubmission && !isClaimable && matchedIcon?.owned === false

	const showSuggestions = isFocused && (rawInput || value) && filteredIcons.length > 0

	useEffect(() => {
		if (!isFocused) {
			setRawInput(value)
		}
	}, [value, isFocused])

	return (
		<div className="relative w-full">
			<Input
				type="text"
				value={rawInput}
				onChange={handleInputChange}
				onFocus={() => setIsFocused(true)}
				onBlur={() => {
					// Sync with sanitized value when leaving input
					setRawInput(value)
					// Delay to allow clicking on suggestions
					setTimeout(() => setIsFocused(false), 200)
				}}
				placeholder="Type icon ID (new or existing, e.g., my-app)..."
				className={cn("font-mono", isInvalid && "border-destructive focus-visible:ring-destructive/50")}
				aria-invalid={isInvalid}
				aria-describedby={error ? "icon-name-error" : undefined}
			/>

			{/* Inline suggestions list */}
			{showSuggestions && (
				<div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover shadow-md">
					<Command className="rounded-md">
						<CommandList className="max-h-[300px] overflow-y-auto">
							<CommandEmpty>No existing icons found</CommandEmpty>
							<CommandGroup heading={`Existing Icons (${filteredIcons.length} matches)`}>
								{filteredIcons.slice(0, 50).map((icon) => (
									<CommandItem
										key={icon.value}
										value={icon.value}
										onSelect={(selectedValue) => {
											setRawInput(selectedValue)
											onValueChange(selectedValue)
											onIconSelected?.(icon)
											setIsFocused(false)
										}}
										className="cursor-pointer flex items-center justify-between"
									>
										<span className="font-mono text-sm">{icon.label}</span>
										<div className="flex items-center gap-1">
											<SourceBadge source={icon.source} showIcon={false} />
											{icon.source === "community" && icon.status && <StatusBadge status={icon.status} showIcon={false} />}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</div>
			)}

			{/* Error message */}
			{error && isInvalid && (
				<p id="icon-name-error" className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
					<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
					<span>{error}</span>
				</p>
			)}

			{/* Another contributor's submission */}
			{!error && isOtherSubmission && (
				<p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
					<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
					<span>This icon ID already belongs to another contributor. Choose a different ID or add it as an alias instead.</span>
				</p>
			)}

			{/* Existing submission notice */}
			{!error && isExistingSubmission && !isOtherSubmission && (
				<p className="text-sm text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1.5">
					<Info className="h-3.5 w-3.5 flex-shrink-0" />
					<span>This icon already has a submission. Submitting will replace it and send it back for review.</span>
				</p>
			)}

			{/* Helper text when no error */}
			{!error && !isExistingSubmission && value && (
				<p className="text-sm text-muted-foreground mt-1.5">
					{loading ? "Loading icon names..." : "Select an existing icon to update or enter a new ID"}
				</p>
			)}
		</div>
	)
}
