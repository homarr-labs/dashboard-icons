"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import Link from "next/link"

interface CommandMenuProps {
	icons: string[]
}

export function CommandMenu({ icons }: CommandMenuProps) {
	const router = useRouter()
	const [open, setOpen] = React.useState(false)
	const [mounted, setMounted] = React.useState(false)
	const [inputValue, setInputValue] = React.useState("")
	const getFilteredIcons = React.useCallback(() => {
		const query = inputValue.toLowerCase().trim()
		if (!query) return icons.slice(0, 75)
		return icons.filter((icon) => {
			const iconName = icon.toLowerCase()
			if (iconName.includes(query)) return true
			const parts = query.split(/\s+/)
			let lastIndex = -1
			return parts.every((part) => {
				const index = iconName.indexOf(part, lastIndex + 1)
				if (index === -1) return false
				lastIndex = index
				return true
			})
		})
	}, [icons, inputValue])

	const filteredIcons = getFilteredIcons()

	React.useEffect(() => {
		setMounted(true)
	}, [])
	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			}
		}

		document.addEventListener("keydown", down)
		return () => document.removeEventListener("keydown", down)
	}, [])

	const handleInputChange = React.useCallback((value: string) => {
		setInputValue(value)
	}, [])

	const handleSelectIcon = React.useCallback(
		(iconName: string) => {
			router.push(`/icons/${iconName}`)
			setOpen(false)
		},
		[router],
	)
	if (!mounted) return null

	return (
		<>
			<p className="text-sm text-muted-foreground">
				Press{" "}
				<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
					<span className="text-xs">⌘</span>K
				</kbd>{" "}
				to search
			</p>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput placeholder="Type to search icons..." value={inputValue} onValueChange={handleInputChange} />
				<CommandList className="max-h-[300px]">
					{filteredIcons.length === 0 && <CommandEmpty>No results found. Try a different search term.</CommandEmpty>}
					{filteredIcons.map((icon) => (
						<CommandItem key={icon} onSelect={() => handleSelectIcon(icon)}>
							<Link prefetch={filteredIcons.length < 3} href={`/icons/${icon}`} className="flex items-center gap-2">
								<div className="w-2 h-2 bg-primary-foreground" />
								<span className="capitalize">{icon.replace(/-/g, " ")}</span>
							</Link>
						</CommandItem>
					))}
				</CommandList>
			</CommandDialog>
		</>
	)
}
