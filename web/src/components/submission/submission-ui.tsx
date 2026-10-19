"use client"

import { Check, type LucideIcon, Moon, Palette, Sun, Type, UploadCloud, WandSparkles } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { useRef } from "react"
import { type DropzoneOptions, useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { buttonVariants } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export const TONES = {
	primary: "bg-primary/10 text-primary",
	info: "bg-info/10 text-info",
	success: "bg-success/10 text-success",
	warning: "bg-warning/10 text-warning",
	destructive: "bg-destructive/10 text-destructive",
	community: "bg-community/10 text-community",
} as const

export type Tone = keyof typeof TONES

export const PANEL_CLASS = "rounded-lg border bg-background shadow-sm"

export const AURORA_COLORS = ["var(--primary)", "var(--community)", "var(--primary)"]

export type Backdrop = "light" | "dark" | "checker"

export const BACKDROP_CLASS: Record<Backdrop, string> = {
	light: "bg-white",
	dark: "bg-zinc-950",
	checker: "bg-muted",
}

export const CHECKER_STYLE: CSSProperties = {
	backgroundImage:
		"conic-gradient(color-mix(in oklab, var(--muted-foreground) 18%, transparent) 25%, transparent 0 50%, color-mix(in oklab, var(--muted-foreground) 18%, transparent) 0 75%, transparent 0)",
	backgroundSize: "16px 16px",
}

export function variantBackdrop(variant: SubmissionVariant): Backdrop {
	const { background } = variantKind(variant)
	if (background === "any") return "checker"
	return background
}

export function SectionHeading({
	icon: Icon,
	tone,
	title,
	description,
	level = 3,
	className,
	children,
}: {
	icon: LucideIcon
	tone: Tone
	title: ReactNode
	description?: ReactNode
	level?: 2 | 3
	className?: string
	children?: ReactNode
}) {
	let Heading: "h2" | "h3" = "h3"
	if (level === 2) Heading = "h2"
	return (
		<div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}>
			<div className="flex min-w-0 items-center gap-3">
				<span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
					<Icon className="size-[18px]" aria-hidden />
				</span>
				<div className="min-w-0">
					<Heading className="font-semibold leading-tight">{title}</Heading>
					{description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
				</div>
			</div>
			{children}
		</div>
	)
}

export function VariantGlyph({ variant, className }: { variant: SubmissionVariant; className?: string }) {
	const { background } = variantKind(variant)
	let Icon: LucideIcon = Palette
	let tone = "text-primary"
	if (variant.startsWith("custom:")) {
		Icon = WandSparkles
		tone = "text-community"
	}
	if (background === "dark") {
		Icon = Sun
		tone = "text-warning"
	}
	if (background === "light") {
		Icon = Moon
		tone = "text-info"
	}
	if (variant.startsWith("wordmark")) Icon = Type
	if (variant === "wordmark") tone = "text-success"
	return <Icon className={cn("size-4 shrink-0", tone, className)} aria-hidden />
}

const ACCEPT = { "image/svg+xml": [".svg"], "image/png": [".png"] }

export function FileDrop({
	label,
	multiple = false,
	backdrop,
	onFiles,
	className,
	children,
}: {
	label: string
	multiple?: boolean
	backdrop?: Backdrop
	onFiles: (files: File[]) => void
	className?: string
	children?: ReactNode
}) {
	const input = useRef<HTMLInputElement>(null)
	const options: DropzoneOptions = {
		noClick: true,
		noKeyboard: true,
		noDragEventsBubbling: true,
		multiple,
		onDrop: (accepted, rejected) => {
			if (input.current?.matches(":disabled")) return
			if (rejected.length) toast.error("Drop one SVG or PNG file here")
			if (accepted.length) onFiles(accepted)
		},
	}
	if (!multiple) options.accept = ACCEPT
	const dropzone = useDropzone(options)
	return (
		<div
			{...dropzone.getRootProps({
				className: cn(
					"group/drop relative isolate flex flex-col items-center justify-center overflow-hidden rounded-md transition-[outline-color]",
					"has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring",
					backdrop && BACKDROP_CLASS[backdrop],
					dropzone.isDragActive && "outline-2 outline-offset-2 outline-primary",
					className,
				),
				style: backdrop === "checker" ? CHECKER_STYLE : undefined,
			})}
		>
			{children}
			{dropzone.isDragActive && (
				<span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/15 p-2 text-center text-sm font-semibold text-primary">
					Drop to add
				</span>
			)}
			<input
				ref={input}
				type="file"
				aria-label={label}
				title={label}
				accept=".svg,.png,image/svg+xml,image/png"
				multiple={multiple}
				className="absolute inset-0 size-full cursor-pointer opacity-0 file:cursor-pointer disabled:cursor-not-allowed"
				onChange={(event) => {
					onFiles(Array.from(event.target.files ?? []))
					event.target.value = ""
				}}
			/>
		</div>
	)
}

const PROMPT_CLASS: Record<Backdrop, string> = {
	light: "border-zinc-300 text-zinc-600",
	dark: "border-zinc-700 text-zinc-300",
	checker: "border-border text-muted-foreground",
}

export function DropPrompt({ backdrop = "checker", title, hint }: { backdrop?: Backdrop; title: ReactNode; hint?: ReactNode }) {
	return (
		<span
			className={cn(
				"pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[inherit] border border-dashed p-3 text-center text-xs font-medium transition-colors group-hover/drop:border-primary",
				PROMPT_CLASS[backdrop],
			)}
		>
			<UploadCloud
				className="size-4 transition-transform group-hover/drop:-translate-y-0.5 group-hover/drop:text-primary motion-reduce:transition-none"
				aria-hidden
			/>
			{title}
			{hint && <span className="font-normal opacity-80">{hint}</span>}
		</span>
	)
}

export function FileChooser({
	label,
	multiple = false,
	onFiles,
	className,
}: {
	label: string
	multiple?: boolean
	onFiles: (files: File[]) => void
	className?: string
}) {
	return (
		<label
			className={cn(
				buttonVariants({ variant: "outline", size: "sm" }),
				"relative cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
				className,
			)}
		>
			<UploadCloud aria-hidden />
			{label}
			<input
				type="file"
				aria-label={label}
				accept=".svg,.png,image/svg+xml,image/png"
				multiple={multiple}
				className="absolute inset-0 size-full cursor-pointer opacity-0 file:cursor-pointer"
				onChange={(event) => {
					onFiles(Array.from(event.target.files ?? []))
					event.target.value = ""
				}}
			/>
		</label>
	)
}

export function CategoryPicker({
	options,
	value,
	onChange,
}: {
	options: readonly string[]
	value: string[]
	onChange: (categories: string[]) => void
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{options.map((category) => {
				const selected = value.includes(category)
				return (
					<Toggle
						key={category}
						variant="outline"
						size="sm"
						pressed={selected}
						onPressedChange={(pressed) => {
							if (pressed) onChange([...value, category])
							else onChange(value.filter((item) => item !== category))
						}}
						className="border-border px-2.5 font-normal capitalize hover:border-success/40 hover:bg-success/5 hover:text-foreground data-[state=on]:border-success/40 data-[state=on]:bg-success/10 data-[state=on]:text-success"
					>
						{selected && <Check className="size-3.5" aria-hidden />}
						{category.replaceAll("-", " ")}
					</Toggle>
				)
			})}
		</div>
	)
}

export function splitAliases(aliases: string) {
	return aliases
		.split(",")
		.map((alias) => alias.trim())
		.filter(Boolean)
}
