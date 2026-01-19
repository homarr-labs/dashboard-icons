"use client"

import { CheckCircle2, Clock, Info, Library, Tag, Users, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useMediaQuery } from "@/hooks/use-media-query"
import { type IconNameOption, useExistingIconNames } from "@/hooks/use-submissions"
import { filterAndSortIcons, formatIconName } from "@/lib/utils"
import type { IconWithName } from "@/types/icons"

interface CommandMenuProps {
	icons: IconWithName[]
	triggerButtonId?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

const getStatusBadge = (icon: IconNameOption) => {
	if (icon.source === "collection") {
		return null
	}

	switch (icon.status) {
		case "pending":
			return (
				<Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
					<Clock className="h-3 w-3 mr-1" />
					Pending
				</Badge>
			)
		case "approved":
			return (
				<Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
					<CheckCircle2 className="h-3 w-3 mr-1" />
					Approved
				</Badge>
			)
		case "rejected":
			return (
				<Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
					<XCircle className="h-3 w-3 mr-1" />
					Rejected
				</Badge>
			)
		case "added_to_collection":
			return null
		default:
			return (
				<Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/20">
					<Users className="h-3 w-3 mr-1" />
					Community
				</Badge>
			)
	}
}

export function CommandMenu({ icons, open: externalOpen, onOpenChange: externalOnOpenChange }: CommandMenuProps) {
	const router = useRouter()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState("")
	const _isDesktop = useMediaQuery("(min-width: 768px)")
	const { data: communityIcons = [] } = useExistingIconNames()

	const isOpen = externalOpen !== undefined ? externalOpen : internalOpen

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

	const filteredIcons = useMemo(() => filterAndSortIcons({ icons, query, limit: 15 }), [icons, query])

	const filteredCommunityIcons = useMemo(() => {
		if (!query.trim()) return []
		const lowerQuery = query.toLowerCase()
		return communityIcons
			.filter((icon) => 
				icon.source === "community" && 
				icon.status !== "added_to_collection" &&
				icon.value.toLowerCase().includes(lowerQuery)
			)
			.slice(0, 5)
	}, [communityIcons, query])

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

	const handleCommunitySelect = (name: string) => {
		setIsOpen(false)
		router.push(`/community/${name}`)
	}

	const handleBrowseAll = () => {
		setIsOpen(false)
		router.push("/icons")
	}

	const handleBrowseCommunity = () => {
		setIsOpen(false)
		router.push("/community")
	}

	return (
		<CommandDialog open={isOpen} onOpenChange={setIsOpen} contentClassName="bg-background/90 backdrop-blur-sm border border-border/60">
			<CommandInput placeholder={`Search ${totalIcons} icons and community submissions...`} value={query} onValueChange={setQuery} />
			<CommandList className="max-h-[350px]">
				{/* Collection Icon Results */}
				{filteredIcons.length > 0 && (
					<CommandGroup heading="Collection">
						{filteredIcons.map(({ name, data }) => {
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
											<Badge
												key={data.categories[0]}
												variant="secondary"
												className="text-xs font-normal inline-flex items-center gap-1 whitespace-nowrap max-w-[120px] overflow-hidden"
											>
												<Tag size={8} className="mr-1 flex-shrink-0" />
												<span className="truncate">{data.categories[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
											</Badge>
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
				)}

				{/* Community Icon Results */}
				{filteredCommunityIcons.length > 0 && (
					<CommandGroup heading="Community Submissions">
						{filteredCommunityIcons.map((icon) => {
							const formatedIconName = formatIconName(icon.value)
							const statusBadge = getStatusBadge(icon)

							return (
								<CommandItem
									key={`community-${icon.value}`}
									value={`community-${icon.value}`}
									onSelect={() => handleCommunitySelect(icon.value)}
									className="flex items-center gap-2 cursor-pointer py-1.5"
								>
									<div className="flex-shrink-0 h-5 w-5 relative">
										<div className="h-full w-full bg-violet-500/10 dark:bg-violet-500/20 rounded-md flex items-center justify-center">
											<Users className="h-3 w-3 text-violet-600 dark:text-violet-400" />
										</div>
									</div>
									<span className="flex-grow capitalize font-medium text-sm">{formatedIconName}</span>
									{statusBadge}
								</CommandItem>
							)
						})}
					</CommandGroup>
				)}

				<CommandEmpty>
					<div className="py-2 px-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
						<Info className="h-3.5 w-3.5 text-destructive" />
						<span>No matching icons found.</span>
					</div>
				</CommandEmpty>
			</CommandList>

			{/* Separator and Browse section */}
			<div className="border-t border-border/40 pt-1 mt-1 px-1 pb-1 space-y-0.5">
				<button
					type="button"
					className="flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground w-full"
					onClick={handleBrowseAll}
				>
					<div className="flex-shrink-0 h-5 w-5 relative">
						<div className="h-full w-full bg-primary/80 dark:bg-primary/40 rounded-md flex items-center justify-center">
							<Library className="text-primary-foreground dark:text-primary-200 w-3.5 h-3.5" />
						</div>
					</div>
					<span className="flex-grow text-sm text-left">Browse collection – {totalIcons} icons</span>
				</button>
				<button
					type="button"
					className="flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground w-full"
					onClick={handleBrowseCommunity}
				>
					<div className="flex-shrink-0 h-5 w-5 relative">
						<div className="h-full w-full bg-violet-500/80 dark:bg-violet-500/40 rounded-md flex items-center justify-center">
							<Users className="text-white dark:text-violet-200 w-3.5 h-3.5" />
						</div>
					</div>
					<span className="flex-grow text-sm text-left">Browse community submissions</span>
				</button>
			</div>
		</CommandDialog>
	)
}
