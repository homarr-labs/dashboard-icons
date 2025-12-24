"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
			"Submit normal (colored), dark, and light variants when possible. The 'normal' variant is the standard colored version. For monochrome icons, provide light and dark variants optimized for different backgrounds.",
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

export function IconSubmissionGuidelines() {
	const [isOpen, setIsOpen] = useState(false)

	const doItems = GUIDELINES.filter((item) => item.type === "do")
	const dontItems = GUIDELINES.filter((item) => item.type === "dont")

	return (
		<div className="rounded-lg border border-blue-500/50 bg-blue-500/10 dark:bg-blue-500/5">
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div className="p-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex-1">
							<p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Icon Submission Guidelines</p>
							<p className="text-sm text-blue-700/90 dark:text-blue-300/80 mt-1">Review these important guidelines before submitting</p>
						</div>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="ml-2 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 shrink-0"
								aria-label={isOpen ? "Hide guidelines" : "Show guidelines"}
							>
								{isOpen ? "Hide" : "Show"} Details
								<ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
							</Button>
						</CollapsibleTrigger>
					</div>
				</div>

				<CollapsibleContent>
					<div className="px-4 pb-4 pt-0">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* DO's Section */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div className="p-1.5 rounded-full bg-green-500/20 dark:bg-green-500/30">
										<Check className="h-4 w-4 text-green-600 dark:text-green-400" />
									</div>
									<h4 className="text-sm font-semibold text-green-700 dark:text-green-300">DO</h4>
								</div>
								<div className="space-y-3">
									{doItems.map((item, index) => (
										<div key={index} className="rounded-lg border border-green-500/30 bg-green-500/5 dark:bg-green-500/10 p-3">
											<div className="flex gap-3">
												<Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-foreground">{item.title}</p>
													<p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* DON'Ts Section */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div className="p-1.5 rounded-full bg-red-500/20 dark:bg-red-500/30">
										<X className="h-4 w-4 text-red-600 dark:text-red-400" />
									</div>
									<h4 className="text-sm font-semibold text-red-700 dark:text-red-300">DON'T</h4>
								</div>
								<div className="space-y-3">
									{dontItems.map((item, index) => (
										<div key={index} className="rounded-lg border border-red-500/30 bg-red-500/5 dark:bg-red-500/10 p-3">
											<div className="flex gap-3">
												<X className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-foreground">{item.title}</p>
													<p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}
