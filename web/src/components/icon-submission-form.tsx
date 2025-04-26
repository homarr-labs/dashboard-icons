"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { REPO_PATH } from "@/constants"
import { DialogDescription } from "@radix-ui/react-dialog"
import { ExternalLink, PlusCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export const ISSUE_TEMPLATES = [
	{
		id: "add_monochrome_icon",
		name: "Add light & dark icon",
		description: "Submit a new icon with both light and dark versions for optimal theme compatibility.",
		url: `${REPO_PATH}/issues/new?template=add_monochrome_icon.yml`,
	},
	{
		id: "add_normal_icon",
		name: "Add normal icon",
		description: "Submit a new icon that works well across both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=add_normal_icon.yml`,
	},
	{
		id: "update_monochrome_icon",
		name: "Update light & dark icon",
		description: "Improve an existing icon by updating both light and dark versions.",
		url: `${REPO_PATH}/issues/new?template=update_monochrome_icon.yml`,
	},
	{
		id: "update_normal_icon",
		name: "Update normal icon",
		description: "Improve an existing icon that works across both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=update_normal_icon.yml`,
	},
	{
		id: "blank_issue",
		name: "Something else",
		description: "Create a custom issue for other suggestions, bug reports, or improvements.",
		url: `${REPO_PATH}/issues/new?template=BLANK_ISSUE`,
	},
]
export function IconSubmissionContent({ onClose }: { onClose?: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				{ISSUE_TEMPLATES.map((template) => (
					<Link key={template.id} href={template.url} className="w-full group z10" target="_blank" rel="noopener noreferrer">
						<Button
							variant="secondary"
							key={template.id}
							className="w-full flex flex-col items-start gap-1 h-auto p-4 text-left cursor-pointer transition-all duration-300"
							asChild
						>
							<div className="w-full">
								<div className="flex w-full items-center justify-between">
									<span className="font-medium transition-all duration-300 whitespace-normal text-wrap">{template.name}</span>
									<ExternalLink className="h-4 w-4 text-muted-foreground transition-all duration-300 flex-shrink-0 ml-2" />
								</div>
								<span className="text-xs text-muted-foreground whitespace-normal text-wrap break-words">{template.description}</span>
							</div>
						</Button>
					</Link>
				))}
			</div>
		</div>
	)
}
export function IconSubmissionForm({ trigger }: { trigger?: React.ReactNode }) {
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger ? (
				<DialogTrigger asChild>{trigger}</DialogTrigger>
			) : (
				<DialogTrigger asChild>
					<Button variant="outline" className="hidden md:inline-flex cursor-pointer transition-all duration-300 items-center gap-2">
						<PlusCircle className="h-4 w-4 transition-all duration-300" /> Submit icon(s)
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="w-[calc(100%-2rem)] max-w-sm md:w-full md:max-w-4xl p-6 backdrop-blur-2xl bg-background flex flex-col gap-4">
				<DialogHeader>
					<DialogTitle>Submit an icon</DialogTitle>
					<DialogDescription>Select an option below to submit or update an icon.</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto max-h-[calc(85vh-10rem)] pr-2">
					<IconSubmissionContent onClose={() => setOpen(false)} />
				</div>
			</DialogContent>
		</Dialog>
	)
}
