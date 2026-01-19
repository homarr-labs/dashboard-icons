"use client"

import { AlertCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { type IconNameOption, useExistingIconNames } from "@/hooks/use-submissions"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"

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

	const selectedIcon = useMemo(() => {
		if (!value) return null
		return existingIcons.find((icon) => icon.value === value) || null
	}, [value, existingIcons])

	const showSuggestions = isFocused && (rawInput || value) && filteredIcons.length > 0

	useEffect(() => {
		if (!isFocused) {
			setRawInput(value)
		}
	}, [value, isFocused])

	const canUpdateRejected = selectedIcon?.source === "community" && selectedIcon?.status === "rejected" && selectedIcon?.isOwner

	return (
		<div className="relative w-full">
			<Input
				type="text"
				value={rawInput}
				onChange={handleInputChange}
				onFocus={() => setIsFocused(true)}
				onBlur={() => {
					setRawInput(value)
					setTimeout(() => setIsFocused(false), 200)
				}}
				placeholder="Type icon ID (new or existing, e.g., my-app)..."
				className={cn("font-mono", isInvalid && "border-destructive focus-visible:ring-destructive/50")}
				aria-invalid={isInvalid}
				aria-describedby={error ? "icon-name-error" : undefined}
			/>

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
										<div className="flex items-center">
											<span className="font-mono text-sm">{icon.label}</span>
											<StatusBadge icon={icon} showCollectionStatus className="ml-2" />
										</div>
										{icon.isOwner && icon.status === "rejected" && (
											<span className="text-xs text-muted-foreground">Your submission</span>
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</div>
			)}

			{error && isInvalid && (
				<p id="icon-name-error" className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
					<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
					<span>{error}</span>
				</p>
			)}

			{!error && value && (
				<div className="mt-1.5">
					{loading ? (
						<p className="text-sm text-muted-foreground">Loading icon names...</p>
					) : canUpdateRejected ? (
						<p className="text-sm text-amber-600 flex items-center gap-1.5">
							<AlertCircle className="h-3.5 w-3.5" />
							This is your rejected submission. You can update it with new files.
						</p>
					) : selectedIcon?.source === "collection" ? (
						<p className="text-sm text-muted-foreground">
							This icon already exists in the main collection.
						</p>
					) : selectedIcon?.source === "community" && !selectedIcon?.isOwner ? (
						<p className="text-sm text-muted-foreground">
							This name is already used by another community submission.
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							Enter a unique ID for your new icon submission.
						</p>
					)}
				</div>
			)}
		</div>
	)
}
