"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { EXTERNAL_SOURCES, type ExternalSourceId } from "@/constants"
import { useMediaQuery } from "@/hooks/use-media-query"
import { getIconImageUrl } from "@/lib/icon-url"
import { filterAndSortIcons, formatIconName } from "@/lib/utils"
import type { IconSearchEntry } from "@/types/icons"

function normalizeCmdkValue(s: string): string {
	return s.trim().toLowerCase().replace(/[\s-]/g, " ")
}

function getItemValue(icon: IconSearchEntry): string {
	const isExternal = icon.source && icon.source !== "native"
	const sourceConfig = isExternal ? EXTERNAL_SOURCES[icon.source as ExternalSourceId] : undefined
	return `${icon.name}${isExternal ? ` ${sourceConfig?.label}` : ""}`
}

interface CommandMenuProps {
	icons: IconSearchEntry[]
	isLoaded: boolean
	hasLoadError: boolean
	triggerButtonId?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function CommandMenu({ icons, isLoaded, hasLoadError, open: externalOpen, onOpenChange: externalOnOpenChange }: CommandMenuProps) {
	const router = useRouter()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [cmdkValue, setCmdkValue] = useState("")
	const [selectedIcon, setSelectedIcon] = useState<IconSearchEntry | null>(null)
	const isDesktop = useMediaQuery("(min-width: 768px)")

	const isOpen = externalOpen !== undefined ? externalOpen : internalOpen

	const setIsOpen = useCallback(
		(value: boolean) => {
			if (value) {
				posthog.capture("command_menu_opened")
			}
			if (!value) {
				setQuery("")
				setSelectedIcon(null)
				setCmdkValue("")
			}
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
	const isReady = isLoaded && !hasLoadError

	let inputPlaceholder = "Loading icons..."
	if (hasLoadError) {
		inputPlaceholder = "Icon search is unavailable"
	} else if (isLoaded) {
		inputPlaceholder = `Search ${totalIcons.toLocaleString()} icons...`
	}

	let browseLabel = "Browse all icons"
	if (query.trim()) {
		browseLabel = `Search "${query}" in all icons`
	} else if (isReady) {
		browseLabel = `Browse all ${totalIcons.toLocaleString()} icons`
	}

	const iconsByValue = useMemo(() => {
		const map = new Map<string, IconSearchEntry>()
		for (const icon of filteredIcons) {
			map.set(normalizeCmdkValue(getItemValue(icon)), icon)
		}
		return map
	}, [filteredIcons])

	const handleValueChange = useCallback(
		(v: string) => {
			setCmdkValue(v)
			const icon = iconsByValue.get(normalizeCmdkValue(v))
			if (icon) setSelectedIcon(icon)
		},
		[iconsByValue],
	)

	useEffect(() => {
		if (filteredIcons.length > 0) {
			setSelectedIcon(filteredIcons[0])
		} else {
			setSelectedIcon(null)
		}
	}, [filteredIcons])

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

	const handleSelect = (icon: IconSearchEntry) => {
		setIsOpen(false)
		if (icon.source && icon.source !== "native") {
			router.push(`/icons/external/${icon.slug || icon.name}`)
		} else {
			router.push(`/icons/${icon.name}`)
		}
	}

	const handleBrowseAll = () => {
		setIsOpen(false)
		if (query.trim()) {
			router.push(`/icons?q=${encodeURIComponent(query)}`)
		} else {
			router.push("/icons")
		}
	}

	let listContent: ReactNode
	if (!isLoaded) {
		listContent = <output className="block py-10 text-center text-sm text-muted-foreground">Loading icons...</output>
	} else if (hasLoadError) {
		listContent = (
			<div role="alert" className="py-10 text-center">
				<p className="text-base font-medium">Unable to load icon search</p>
				<p className="text-sm text-muted-foreground mt-2">Browse all icons to continue.</p>
			</div>
		)
	} else {
		listContent = (
			<>
				<CommandGroup>
					{filteredIcons.map((icon) => {
						const { name, source } = icon
						const formattedIconName = formatIconName(name)
						const isExternal = source && source !== "native"
						const sourceConfig = isExternal ? EXTERNAL_SOURCES[source as ExternalSourceId] : undefined

						return (
							<CommandItem
								key={`${source || "native"}-${name}`}
								value={getItemValue(icon)}
								onSelect={() => handleSelect(icon)}
								className="gap-3 py-3 px-3 text-base cursor-pointer"
								onMouseEnter={() => setSelectedIcon(icon)}
							>
								<span className="flex-grow capitalize font-medium truncate">{formattedIconName}</span>
								{isExternal && sourceConfig && (
									<Badge variant="outline" className="text-xs px-2 h-6 gap-1.5 shrink-0">
										<UnoptimizedImage src={sourceConfig.icon} alt="" width={12} height={12} className="shrink-0" />
										{sourceConfig.label}
									</Badge>
								)}
							</CommandItem>
						)
					})}
				</CommandGroup>

				<CommandEmpty>
					<div className="flex flex-col items-center py-10 text-center">
						<p className="text-base font-medium">No icons match "{query}"</p>
						<p className="text-sm text-muted-foreground mt-2">Try a shorter name or check for typos</p>
					</div>
				</CommandEmpty>
			</>
		)
	}

	return (
		<CommandDialog
			open={isOpen}
			onOpenChange={setIsOpen}
			commandValue={cmdkValue}
			onCommandValueChange={handleValueChange}
			className="max-w-3xl backdrop-blur-md bg-popover/95"
			showCloseButton={false}
		>
			<CommandInput
				placeholder={inputPlaceholder}
				value={query}
				onValueChange={setQuery}
				disabled={hasLoadError}
				className="text-base h-12"
			/>

			<div className="flex min-h-0">
				<CommandList aria-busy={!isLoaded} className="max-h-[min(480px,60vh)] flex-1">
					{listContent}
				</CommandList>

				{isReady && isDesktop && selectedIcon && (
					<div className="w-56 border-l border-border flex flex-col items-center justify-center p-6">
						<AnimatePresence mode="wait">
							<motion.div
								key={`${selectedIcon.source || "native"}-${selectedIcon.name}`}
								className="flex flex-col items-center gap-3"
								initial={{ opacity: 0, scale: 0.92 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.92 }}
								transition={{ duration: 0.1 }}
							>
								<div className="h-24 w-24 rounded-xl bg-muted ring-1 ring-border flex items-center justify-center overflow-hidden">
									<UnoptimizedImage
										src={getIconImageUrl(selectedIcon)}
										alt={selectedIcon.name}
										width={64}
										height={64}
										className="object-contain"
									/>
								</div>
								<span className="text-sm font-medium text-center capitalize truncate max-w-full">{formatIconName(selectedIcon.name)}</span>
								{selectedIcon.source && selectedIcon.source !== "native" && (
									<span className="text-xs text-muted-foreground">{EXTERNAL_SOURCES[selectedIcon.source as ExternalSourceId]?.label}</span>
								)}
							</motion.div>
						</AnimatePresence>
					</div>
				)}
			</div>

			<div className="flex items-center justify-between border-t border-border px-5 py-3">
				<button
					type="button"
					className="flex items-center gap-2 cursor-pointer rounded-md px-3 py-2 outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent group"
					onClick={handleBrowseAll}
				>
					<span className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-150">
						{browseLabel}
					</span>
					<ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors duration-150" />
				</button>
				{isDesktop && (
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs">↑↓</kbd>
							navigate
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs">↵</kbd>
							open
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs">esc</kbd>
							close
						</span>
					</div>
				)}
			</div>
		</CommandDialog>
	)
}
