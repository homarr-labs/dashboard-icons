"use client"

import confetti from "canvas-confetti"
import { Check, type LucideIcon, Moon, Palette, Plus, Sun, Type, UploadCloud, WandSparkles } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { useRef } from "react"
import { type DropzoneOptions, useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { buttonVariants } from "@/components/ui/button"
import { type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

export const TONES = {
	primary: "bg-primary/10 text-primary ring-primary/25",
	blue: "bg-blue-500/10 text-blue-600 ring-blue-500/25 dark:text-blue-400",
	emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
	violet: "bg-violet-500/10 text-violet-600 ring-violet-500/25 dark:text-violet-400",
	amber: "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400",
} as const

export type Tone = keyof typeof TONES

export const CTA_CLASS =
	"min-h-11 w-full whitespace-normal bg-primary bg-gradient-to-r from-primary to-primary/75 font-semibold text-secondary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40"

export type Backdrop = "light" | "dark" | "checker"

export const BACKDROP_CLASS: Record<Backdrop, string> = {
	light: "bg-white",
	dark: "bg-zinc-950",
	checker: "bg-muted",
}

export const CHECKER_STYLE: CSSProperties = {
	backgroundImage: "conic-gradient(#a1a1aa30 25%, transparent 0 50%, #a1a1aa30 0 75%, transparent 0)",
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
				<span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", TONES[tone])}>
					<Icon className="size-[18px]" aria-hidden />
				</span>
				<div className="min-w-0">
					<Heading className="font-semibold leading-tight tracking-tight">{title}</Heading>
					{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
				</div>
			</div>
			{children}
		</div>
	)
}

export function VariantGlyph({ variant, className }: { variant: SubmissionVariant; className?: string }) {
	const { background } = variantKind(variant)
	let Icon: LucideIcon = Palette
	let tone = "text-pink-500"
	if (variant.startsWith("custom:")) {
		Icon = WandSparkles
		tone = "text-violet-500"
	}
	if (background === "dark") {
		Icon = Sun
		tone = "text-amber-500"
	}
	if (background === "light") {
		Icon = Moon
		tone = "text-indigo-500"
	}
	if (variant.startsWith("wordmark")) Icon = Type
	if (variant === "wordmark") tone = "text-green-500"
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
					"group/drop relative isolate flex flex-col items-center justify-center overflow-hidden rounded-lg transition-[box-shadow,transform] duration-200 motion-reduce:transition-none",
					"has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring",
					backdrop && BACKDROP_CLASS[backdrop],
					dropzone.isDragActive && "scale-[1.02] ring-2 ring-primary ring-offset-2 ring-offset-background",
					className,
				),
				style: backdrop === "checker" ? CHECKER_STYLE : undefined,
			})}
		>
			{children}
			{dropzone.isDragActive && (
				<span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/85 p-2 text-center text-sm font-semibold text-primary-foreground">
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
	light: "border-zinc-300 text-zinc-600 [&_[data-bubble]]:bg-zinc-100",
	dark: "border-zinc-700 text-zinc-300 [&_[data-bubble]]:bg-white/10",
	checker: "border-border text-muted-foreground [&_[data-bubble]]:bg-background [&_[data-bubble]]:shadow-sm",
}

export function DropPrompt({ backdrop = "checker", title, hint }: { backdrop?: Backdrop; title: ReactNode; hint?: ReactNode }) {
	return (
		<span
			className={cn(
				"pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-[inherit] border-2 border-dashed p-3 text-center text-xs font-medium transition-colors group-hover/drop:border-primary/60",
				PROMPT_CLASS[backdrop],
			)}
		>
			<span
				data-bubble
				className="flex size-9 items-center justify-center rounded-full transition-transform duration-200 group-hover/drop:-translate-y-0.5 group-hover/drop:text-primary motion-reduce:transition-none"
			>
				<UploadCloud className="size-4" aria-hidden />
			</span>
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
					<button
						key={category}
						type="button"
						aria-pressed={selected}
						onClick={() => {
							if (selected) onChange(value.filter((item) => item !== category))
							else onChange([...value, category])
						}}
						className={cn(
							"inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm capitalize transition-all duration-200 active:scale-95 motion-reduce:transition-none",
							"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
							selected && "border-emerald-500/50 bg-emerald-500/15 font-medium text-emerald-700 shadow-sm dark:text-emerald-300",
							!selected &&
								"border-border bg-background text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-foreground",
						)}
					>
						{selected && <Check className="size-3.5" aria-hidden />}
						{!selected && <Plus className="size-3.5 opacity-60" aria-hidden />}
						{category.replaceAll("-", " ")}
					</button>
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

export function celebrate() {
	confetti({
		particleCount: 90,
		spread: 110,
		startVelocity: 32,
		ticks: 140,
		origin: { y: 0.35 },
		zIndex: 60,
		disableForReducedMotion: true,
		colors: ["#1e9df1", "#8ed0f9", "#fa5352", "#ffb347", "#22c55e"],
	})
}
