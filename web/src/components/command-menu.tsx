"use client"

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatIconName, fuzzySearch, filterAndSortIcons } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useMemo } from "react"
import type { IconWithName } from "@/types/icons"

interface CommandMenuProps {
	icons: IconWithName[]
	triggerButtonId?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function CommandMenu({ icons, open: externalOpen, onOpenChange: externalOnOpenChange }: CommandMenuProps) {
	const router = useRouter()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState("")
	const isDesktop = useMediaQuery("(min-width: 768px)")

	// Use either external or internal state for controlling open state
	const isOpen = externalOpen !== undefined ? externalOpen : internalOpen

	// Wrap setIsOpen in useCallback to fix dependency issue
	const setIsOpen = useCallback(
		(value: boolean) => {
			if (externalOnOpenChange) {
				externalOnOpenChange(value)
			} else {
				setInternalOpen(value)
			}
		},
		[externalOnOpenChange],
	)

	const filteredIcons = useMemo(() =>
		filterAndSortIcons({ icons, query, limit: 20 }),
		[icons, query]
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.key === "k" && (e.metaKey || e.ctrlKey)) ||
				(e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")
			) {
				e.preventDefault()
				setIsOpen(!isOpen)
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [isOpen, setIsOpen])

	const handleSelect = (name: string) => {
		setIsOpen(false)
		router.push(`/icons/${name}`)
	}

	return (
		<CommandDialog open={isOpen} onOpenChange={setIsOpen}>
			<CommandInput placeholder="Search for icons by name, category, or purpose..." value={query} onValueChange={setQuery} />
			<CommandList>
				<CommandEmpty>No matching icons found. Try a different search term or browse all icons.</CommandEmpty>
				<CommandGroup heading="Icons">
					{filteredIcons.map(({ name, data }) => {
						// Find matched alias for display if available
						const matchedAlias =
							query && data.aliases && data.aliases.length > 0
								? data.aliases.find((alias) => alias.toLowerCase().includes(query.toLowerCase()))
								: null
						const formatedIconName = formatIconName(name)

						return (
							<CommandItem key={name} value={name} onSelect={() => handleSelect(name)} className="flex items-center gap-2 cursor-pointer">
								<div className="flex-shrink-0 h-5 w-5 relative">
									<div className="h-5 w-5 bg-rose-100 dark:bg-rose-900/30 rounded-md flex items-center justify-center">
										<span className="text-[10px] font-medium text-rose-800 dark:text-rose-300">{name.substring(0, 2).toUpperCase()}</span>
									</div>
								</div>
								<span className="flex-grow capitalize">{formatedIconName}</span>
								{matchedAlias && <span className="text-xs text-primary-500 truncate max-w-[100px]">alias: {matchedAlias}</span>}
								{!matchedAlias && data.categories && data.categories.length > 0 && (
									<span className="text-xs text-muted-foreground truncate max-w-[100px]">
										{data.categories[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
									</span>
								)}
							</CommandItem>
						)
					})}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}
