"use client"

import { AlertCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { useExistingIconNames } from "@/hooks/use-submissions"
import { cn } from "@/lib/utils"

interface IconNameComboboxProps {
	value: string
	onValueChange: (value: string) => void
	error?: string
	isInvalid?: boolean
}

export function IconNameCombobox({ value, onValueChange, error, isInvalid }: IconNameComboboxProps) {
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
		setRawInput(raw) // Track raw input for immediate filtering
		const sanitized = sanitizeIconName(raw)
		onValueChange(sanitized)
	}

	// Filter existing icons based on EITHER raw input OR sanitized value - show ALL matches
	const filteredIcons = useMemo(() => {
		const searchTerm = rawInput || value
		if (!searchTerm || !existingIcons.length) return []

		const lowerSearch = searchTerm.toLowerCase()
		return existingIcons.filter((icon) => icon.value.toLowerCase().includes(lowerSearch) || icon.label.toLowerCase().includes(lowerSearch))
	}, [rawInput, value, existingIcons])

	const showSuggestions = isFocused && (rawInput || value) && filteredIcons.length > 0

	// Sync rawInput with external value changes (form reset, etc.)
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
				placeholder="Type new icon ID (e.g., my-app)..."
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
							<CommandGroup heading={`⚠️ Existing Icons (${filteredIcons.length} matches - Not Allowed)`}>
								{filteredIcons.slice(0, 50).map((icon) => (
									<CommandItem
										key={icon.value}
										value={icon.value}
										onSelect={(selectedValue) => {
											setRawInput(selectedValue)
											onValueChange(selectedValue)
											setIsFocused(false)
										}}
										className="cursor-pointer opacity-60"
									>
										<AlertCircle className="h-3.5 w-3.5 text-destructive mr-2 flex-shrink-0" />
										<span className="font-mono text-sm">{icon.label}</span>
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

			{/* Helper text when no error */}
			{!error && value && (
				<p className="text-sm text-muted-foreground mt-1.5">{loading ? "Checking availability..." : "✓ Available icon ID"}</p>
			)}
		</div>
	)
}
