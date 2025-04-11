"use client"

import * as React from "react"

import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CommandMenuProps {
	icons: string[]
}

export function CommandMenu({ icons }: CommandMenuProps) {
	const [open, setOpen] = React.useState(false)

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
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					{icons.map((icon) => (
						<CommandItem key={icon}>
							<span>{icon}</span>
						</CommandItem>
					))}
				</CommandList>
			</CommandDialog>
		</>
	)
}
