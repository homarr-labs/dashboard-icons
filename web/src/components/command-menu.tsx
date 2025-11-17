"use client"

import { Info, Search as SearchIcon, Tag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useMediaQuery } from "@/hooks/use-media-query"
import { filterAndSortIcons, formatIconName } from "@/lib/utils"
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
	const _isDesktop = useMediaQuery("(min-width: 768px)")

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

	const filteredIcons = useMemo(() => filterAndSortIcons({ icons, query, limit: 20 }), [icons, query])

	const totalIcons = icons.length

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

	const handleBrowseAll = () => {
		setIsOpen(false)
		router.push("/icons")
	}

	return (
		<CommandDialog open={isOpen} onOpenChange={setIsOpen} contentClassName="bg-background/90 backdrop-blur-sm border border-border/60">
			<CommandInput placeholder={`Search our collection of ${totalIcons} icons by name...`} value={query} onValueChange={setQuery} />
			<CommandList className="max-h-[300px]">
				{/* Icon Results */}
				<CommandGroup heading="Icons">
					{filteredIcons.length > 0 &&
						filteredIcons.map(({ name, data }) => {
							const formatedIconName = formatIconName(name)
							const hasCategories = data.categories && data.categories.length > 0

							return (
								<CommandItem
									key={name}
									value={name}
									onSelect={() => handleSelect(name)}
									className="flex items-center gap-2 cursor-pointer py-1.5"
								>
									<div className="flex-shrink-0 h-5 w-5 relative">
										<div className="h-full w-full bg-primary/10 dark:bg-primary/20 rounded-md flex items-center justify-center">
											<span className="text-[9px] font-medium text-primary dark:text-primary-foreground">
												{name.substring(0, 2).toUpperCase()}
											</span>
										</div>
									</div>
									<span className="flex-grow capitalize font-medium text-sm">{formatedIconName}</span>
									{hasCategories && (
										<div className="flex gap-1 items-center flex-shrink-0 overflow-hidden max-w-[40%]">
											{/* First category */}
											<Badge
												key={data.categories[0]}
												variant="secondary"
												className="text-xs font-normal inline-flex items-center gap-1 whitespace-nowrap max-w-[120px] overflow-hidden"
											>
												<Tag size={8} className="mr-1 flex-shrink-0" />
												<span className="truncate">{data.categories[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
											</Badge>
											{/* "+N" badge if more than one category */}
											{data.categories.length > 1 && (
												<Badge variant="outline" className="text-xs flex-shrink-0">
													+{data.categories.length - 1}
												</Badge>
											)}
										</div>
									)}
								</CommandItem>
							)
						})}
				</CommandGroup>
				<CommandEmpty>
					{/* Minimal empty state */}
					<div className="py-2 px-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
						<Info className="h-3.5 w-3.5 text-destructive" /> {/* Smaller red icon */}
						<span>No matching icons found.</span>
					</div>
				</CommandEmpty>
			</CommandList>

			{/* Separator and Browse section - Styled div outside CommandList */}
			<div className="border-t border-border/40 pt-1 mt-1 px-1 pb-1">
				<button
					type="button"
					className="flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground w-full"
					onClick={handleBrowseAll}
				>
					<div className="flex-shrink-0 h-5 w-5 relative">
						<div className="h-full w-full bg-primary/80 dark:bg-primary/40 rounded-md flex items-center justify-center">
							<SearchIcon className="text-primary-foreground dark:text-primary-200 w-3.5 h-3.5" />
						</div>
					</div>
					<span className="flex-grow text-sm">Browse all icons – {totalIcons} available</span>
				</button>
			</div>
		</CommandDialog>
	)
}
