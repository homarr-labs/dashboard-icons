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
import { pb } from "@/lib/pb"

interface IconNameComboboxProps {
	value: string
	onValueChange: (value: string) => void
	onIsExisting: (isExisting: boolean) => void
}

export function IconNameCombobox({ value, onValueChange, onIsExisting }: IconNameComboboxProps) {
	const [existingIcons, setExistingIcons] = useState<Array<{ label: string; value: string }>>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetchExistingIcons() {
			try {
				const records = await pb.collection("community_gallery").getFullList({
					fields: "name",
					sort: "name",
				})

				const uniqueNames = Array.from(new Set(records.map((r) => r.name)))
				const formattedIcons = uniqueNames.map((name) => ({
					label: name,
					value: name,
				}))

				setExistingIcons(formattedIcons)
			} catch (error) {
				console.error("Failed to fetch existing icons:", error)
			} finally {
				setLoading(false)
			}
		}

		fetchExistingIcons()
	}, [])

	useEffect(() => {
		const isExisting = existingIcons.some((icon) => icon.value === value)
		onIsExisting(isExisting)
	}, [value, existingIcons, onIsExisting])

	const handleCreateNew = (inputValue: string) => {
		const sanitizedValue = inputValue
			.toLowerCase()
			.trim()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/g, "")
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
					<span className="text-muted-foreground">Select or create icon ID...</span>
				)}
			</ComboboxTrigger>
			<ComboboxContent>
				<ComboboxInput placeholder="Search or type new icon ID..." />
				<ComboboxList>
					<ComboboxEmpty>No existing icon found.</ComboboxEmpty>
					{existingIcons.length > 0 && (
						<ComboboxGroup heading="Existing Icons">
							{existingIcons.map((icon) => (
								<ComboboxItem key={icon.value} value={icon.value}>
									<span className="font-mono text-sm">{icon.label}</span>
								</ComboboxItem>
							))}
						</ComboboxGroup>
					)}
					<ComboboxCreateNew onCreateNew={handleCreateNew}>
						{(inputValue) => (
							<div className="flex items-start gap-2">
								<span className="text-muted-foreground">Create new icon:</span>
								<span className="font-mono font-semibold">
									{inputValue
										.toLowerCase()
										.trim()
										.replace(/\s+/g, "-")
										.replace(/[^a-z0-9-]/g, "")}
								</span>
							</div>
						)}
					</ComboboxCreateNew>
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}

