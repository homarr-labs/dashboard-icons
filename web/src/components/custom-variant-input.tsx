"use client"

import { Plus, WandSparkles } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { customVariantNameError } from "@/lib/submission-variants"

export function CustomVariantInput({ names, onAdd }: { names: string[]; onAdd: (name: string) => void }) {
	const id = useId()
	const input = useRef<HTMLInputElement>(null)
	const trigger = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [error, setError] = useState("")
	const [suggestions, setSuggestions] = useState<string[]>([])
	const [suggestionError, setSuggestionError] = useState("")
	useEffect(() => {
		if (!open) return
		input.current?.focus()
		const controller = new AbortController()
		fetch("/api/submissions/variant-names", { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error("Suggestions unavailable. You can still enter a name.")
				const result = (await response.json()) as { names: string[] }
				setSuggestions(result.names)
				setSuggestionError("")
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted)
					setSuggestionError(error instanceof Error ? error.message : "Suggestions unavailable. You can still enter a name.")
			})
		return () => controller.abort()
	}, [open])
	const add = () => {
		const invalid = customVariantNameError(name)
		if (invalid) return setError(invalid)
		if (names.includes(name)) return setError(`"${name}" is already in this Submission`)
		onAdd(name)
		setName("")
		setError("")
		setOpen(false)
		trigger.current?.focus()
	}
	return (
		<div className="flex flex-col items-start gap-3" data-custom-variant-input>
			<Button
				ref={trigger}
				type="button"
				variant="ghost"
				size="sm"
				className="min-h-11 min-w-11 sm:min-h-9"
				aria-expanded={open}
				aria-controls={`${id}-editor`}
				onClick={() => setOpen(!open)}
			>
				<Plus aria-hidden />
				Custom variant
			</Button>
			{open && (
				<div id={`${id}-editor`} className="flex w-full flex-col gap-2 rounded-md border border-community/30 bg-community/5 p-3">
					<Label htmlFor={id} className="flex items-center gap-1.5">
						<WandSparkles className="size-4 text-community" aria-hidden />
						Custom variant name
					</Label>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							ref={input}
							id={id}
							list={`${id}-suggestions`}
							value={name}
							onChange={(event) => {
								setName(event.target.value)
								setError("")
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault()
									add()
								}
							}}
							placeholder="e.g. 4k or animated-dark"
							autoComplete="off"
							aria-invalid={Boolean(error)}
							aria-describedby={`${id}-help ${id}-error`}
							className="min-h-11 min-w-0 flex-1"
						/>
						<datalist id={`${id}-suggestions`}>
							{suggestions
								.filter((name) => !names.includes(name))
								.map((name) => (
									<option key={name} value={name} />
								))}
						</datalist>
						<Button type="button" className="min-h-11 min-w-11" onClick={add}>
							Add variant
						</Button>
					</div>
					<p id={`${id}-help`} className="text-sm text-muted-foreground">
						One name, one file. Lowercase kebab-case, up to 32 characters. Names ending in -dark are for light backgrounds; -light for dark
						backgrounds.
					</p>
					<output id={`${id}-error`} className="block text-sm text-destructive">
						{error}
					</output>
					{suggestionError && <output className="block text-sm text-muted-foreground">{suggestionError}</output>}
				</div>
			)}
		</div>
	)
}
