"use client"

import { XIcon } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TagInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
	value: string[]
	onValueChange: (value: string[]) => void
	maxTags?: number
	tagClassName?: string
}

const SEPARATOR = /[\s,]+/

function TagInput({ value, onValueChange, maxTags, className, tagClassName, placeholder, disabled, id, ...props }: TagInputProps) {
	const [draft, setDraft] = React.useState("")
	const inputRef = React.useRef<HTMLInputElement>(null)

	function commit(text: string) {
		const next = [...value]
		for (const tag of text.split(SEPARATOR)) {
			const trimmed = tag.trim()
			if (!trimmed || next.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) continue
			if (maxTags !== undefined && next.length >= maxTags) break
			next.push(trimmed)
		}
		if (next.length !== value.length) onValueChange(next)
		setDraft("")
	}

	function remove(index: number) {
		onValueChange(value.filter((_, position) => position !== index))
		inputRef.current?.focus()
	}

	return (
		<div
			data-slot="tag-input"
			className={cn(
				"dark:bg-input/30 border-input flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2 py-1.5 shadow-sm transition-all duration-300",
				"focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:shadow-md",
				disabled && "pointer-events-none cursor-not-allowed opacity-50",
				className,
			)}
			onClick={() => inputRef.current?.focus()}
		>
			{value.map((tag, index) => (
				<Badge key={tag} variant="secondary" className={cn("h-7 gap-1 rounded-md pr-1 pl-2.5 text-sm font-medium", tagClassName)}>
					{tag}
					<button
						type="button"
						aria-label={`Remove ${tag}`}
						className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-[3px]"
						onClick={(event) => {
							event.stopPropagation()
							remove(index)
						}}
					>
						<XIcon className="size-3.5" />
					</button>
				</Badge>
			))}
			<input
				{...props}
				ref={inputRef}
				id={id}
				disabled={disabled}
				value={draft}
				placeholder={value.length ? undefined : placeholder}
				className="placeholder:text-muted-foreground h-7 min-w-24 flex-1 bg-transparent px-1.5 text-base outline-none md:text-sm"
				onChange={(event) => {
					const text = event.target.value
					if (SEPARATOR.test(text)) commit(text)
					else setDraft(text)
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" && draft.trim()) {
						event.preventDefault()
						commit(draft)
					}
					if (event.key === "Backspace" && !draft && value.length) {
						event.preventDefault()
						remove(value.length - 1)
					}
				}}
				onBlur={(event) => {
					if (draft.trim()) commit(draft)
					props.onBlur?.(event)
				}}
			/>
		</div>
	)
}

export { TagInput }
