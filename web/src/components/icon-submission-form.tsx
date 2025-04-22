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
		name: "Add light/dark icon",
		description: "Submit a new icon with light and dark versions.",
		url: `${REPO_PATH}/issues/new?template=add_monochrome_icon.yml`,
	},
	{
		id: "add_normal_icon",
		name: "Add standard icon",
		description: "Submit a new icon for both themes.",
		url: `${REPO_PATH}/issues/new?template=add_normal_icon.yml`,
	},
	{
		id: "update_monochrome_icon",
		name: "Update light/dark icon",
		description: "Improve an existing light/dark icon.",
		url: `${REPO_PATH}/issues/new?template=update_monochrome_icon.yml`,
	},
	{
		id: "update_normal_icon",
		name: "Update standard icon",
		description: "Improve an existing standard icon.",
		url: `${REPO_PATH}/issues/new?template=update_normal_icon.yml`,
	},
	{
		id: "blank_issue",
		name: "Other request",
		description: "Submit another type of request.",
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
							<div>
								<div className="flex w-full items-center justify-between">
									<span className="font-medium transition-all duration-300">{template.name}</span>
									<ExternalLink className="h-4 w-4 text-muted-foreground transition-all duration-300" />
								</div>
								<span className="text-xs text-muted-foreground">{template.description}</span>
							</div>
						</Button>
					</Link>
				))}
			</div>
		</div>
	)
}
export function IconSubmissionForm() {
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="hidden md:inline-flex cursor-pointer transition-all duration-300">
					<PlusCircle className="h-4 w-4 transition-all duration-300" /> Submit icon
				</Button>
			</DialogTrigger>
			<DialogContent className="md:max-w-4xl backdrop-blur-2xl bg-background">
				<DialogHeader>
					<DialogTitle>Submit an icon</DialogTitle>
					<DialogDescription>Select an option below to submit or update an icon.</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<IconSubmissionContent onClose={() => setOpen(false)} />
				</div>
			</DialogContent>
		</Dialog>
	)
}
