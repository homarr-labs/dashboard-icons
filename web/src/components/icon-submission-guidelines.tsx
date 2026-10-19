"use client"

import { BookOpenCheck, Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface GuidelineItem {
	type: "do" | "dont"
	title: string
	description: string
}

const GUIDELINES: GuidelineItem[] = [
	{
		type: "do",
		title: "Submit SVG files",
		description: "We strongly prefer SVG format for all icons. We'll automatically transform them into PNG and WebP formats as well.",
	},
	{
		type: "do",
		title: "Provide color variants when available",
		description:
			"Submit the Base (in brand colours) plus Light and Dark variants when possible. A Light variant is light-coloured for dark backgrounds; a Dark variant is dark-coloured for light backgrounds. Wordmarks follow the same rule.",
	},
	{
		type: "do",
		title: "Ensure transparent backgrounds",
		description: "All icons must have transparent backgrounds. Icons with opaque or colored backgrounds will be rejected.",
	},
	{
		type: "dont",
		title: "Don't make multiple submissions for the same icon",
		description:
			"If you have both SVG and PNG versions, only submit the SVG. Do not create separate submissions like 'something.svg' and 'something.png'.",
	},
	{
		type: "dont",
		title: "Don't use PNG-to-SVG converter tools",
		description: "If an SVG version exists, use that instead. PNG-to-SVG converters produce poor quality results and should be avoided.",
	},
]

const SECTIONS = [
	{
		type: "do",
		label: "DO",
		Icon: Check,
		tone: "text-emerald-700 dark:text-emerald-300",
		badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
		card: "border-emerald-500/25 bg-emerald-500/5",
	},
	{
		type: "dont",
		label: "DON'T",
		Icon: X,
		tone: "text-red-700 dark:text-red-300",
		badge: "bg-red-500/15 text-red-600 dark:text-red-400",
		card: "border-red-500/25 bg-red-500/5",
	},
] as const

export function IconSubmissionGuidelines() {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div className="@container rounded-xl border border-blue-500/30 bg-blue-500/5">
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="group/guide flex min-h-11 w-full items-center gap-3 rounded-xl p-4 text-left transition-colors hover:bg-blue-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-inset ring-blue-500/25 dark:text-blue-400">
							<BookOpenCheck className="size-[18px]" aria-hidden />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-sm font-semibold text-blue-700 dark:text-blue-300">Icon Submission Guidelines</span>
							<span className="block text-xs text-muted-foreground">Review these important guidelines before submitting</span>
						</span>
						<ChevronDown
							className={cn(
								"size-4 shrink-0 text-blue-700 transition-transform duration-300 group-hover/guide:translate-y-0.5 motion-reduce:transition-none dark:text-blue-300",
								isOpen && "rotate-180 group-hover/guide:translate-y-0",
							)}
							aria-hidden
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="grid grid-cols-1 gap-5 px-4 pb-4 @lg:grid-cols-2">
						{SECTIONS.map(({ type, label, Icon, tone, badge, card }) => (
							<div key={type} className="flex flex-col gap-3">
								<div className="flex items-center gap-2">
									<span className={cn("flex size-7 items-center justify-center rounded-full", badge)}>
										<Icon className="size-4" aria-hidden />
									</span>
									<h4 className={cn("text-sm font-semibold", tone)}>{label}</h4>
								</div>
								<ul className="flex flex-col gap-2">
									{GUIDELINES.filter((item) => item.type === type).map((item) => (
										<li key={item.title} className={cn("flex gap-3 rounded-lg border p-3", card)}>
											<Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-foreground">{item.title}</p>
												<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
											</div>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}
