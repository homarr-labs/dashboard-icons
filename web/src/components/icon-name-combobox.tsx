"use client"

import { useEffect, useState } from "react"
import {
	Combobox,
	ComboboxContent,
	ComboboxCreateNew,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from "@/components/ui/shadcn-io/combobox"
import { useExistingIconNames } from "@/hooks/use-submissions"

interface IconNameComboboxProps {
	value: string
	onValueChange: (value: string) => void
	onIsExisting: (isExisting: boolean) => void
}

export function IconNameCombobox({ value, onValueChange, onIsExisting }: IconNameComboboxProps) {
	const { data: existingIcons = [], isLoading: loading } = useExistingIconNames()
	const [previewValue, setPreviewValue] = useState("")

	// Check if current value is existing
	useEffect(() => {
		const isExisting = existingIcons.some((icon) => icon.value === value)
		onIsExisting(isExisting)
	}, [value, existingIcons, onIsExisting])

	const sanitizeIconName = (inputValue: string): string => {
		return inputValue
			.toLowerCase()
			.trim()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/g, "")
	}

	const handleCreateNew = (inputValue: string) => {
		const sanitizedValue = sanitizeIconName(inputValue)
		onValueChange(sanitizedValue)
	}

	const handleValueChange = (newValue: string) => {
		onValueChange(newValue)
	}

	return (
		<Combobox data={existingIcons} type="icon" value={value} onValueChange={handleValueChange}>
			<ComboboxTrigger className="w-full justify-start">
				{value ? (
					<span className="flex items-center justify-between w-full">
						<span className="font-mono">{value}</span>
					</span>
				) : (
					<span className="text-muted-foreground">
						{loading ? "Loading icons..." : "Select or create icon ID..."}
					</span>
				)}
			</ComboboxTrigger>
			<ComboboxContent>
				<ComboboxInput 
					placeholder="Search or type new icon ID..." 
					onValueChange={setPreviewValue}
				/>
				<ComboboxEmpty>
					{loading ? (
						"Loading..."
					) : (
						<ComboboxCreateNew onCreateNew={handleCreateNew}>
							{(inputValue) => {
								const sanitized = sanitizeIconName(inputValue)
								return (
									<div className="flex items-center gap-2 py-2">
										<span className="text-muted-foreground">Create new icon:</span>
										<span className="font-mono font-semibold text-foreground">
											{sanitized}
										</span>
									</div>
								)
							}}
						</ComboboxCreateNew>
					)}
				</ComboboxEmpty>
				<ComboboxList>
					{!loading && existingIcons.length > 0 && (
						<ComboboxGroup heading="Existing Icons">
							{existingIcons.map((icon) => (
								<ComboboxItem key={icon.value} value={icon.value}>
									<span className="font-mono text-sm">{icon.label}</span>
								</ComboboxItem>
							))}
						</ComboboxGroup>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}

