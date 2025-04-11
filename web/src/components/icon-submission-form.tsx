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
		description: "Use this template to add a new icon to the project. Monochrome icons need both light and dark versions.",
		url: `${REPO_PATH}/issues/new?template=add_monochrome_icon.yml`,
	},
	{
		id: "add_normal_icon",
		name: "Add normal icon",
		description: "Use this template to add a new icon to the project. Normal icons work for both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=add_normal_icon.yml`,
	},
	{
		id: "update_monochrome_icon",
		name: "Update light & dark icon",
		description: "Use this template to update an existing icon. Monochrome icons need both light and dark versions.",
		url: `${REPO_PATH}/issues/new?template=update_monochrome_icon.yml`,
	},
	{
		id: "update_normal_icon",
		name: "Update normal icon",
		description: "Use this template to update an existing icon. Normal icons work for both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=update_normal_icon.yml`,
	},
	{
		id: "blank_issue",
		name: "Something else",
		description: "You'd like to do something else? Use this template to create a new issue.",
		url: `${REPO_PATH}/issues/new?template=BLANK_ISSUE`,
	},
]
export function IconSubmissionContent({ onClose }: { onClose?: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				{ISSUE_TEMPLATES.map((template) => (
					<Link key={template.id} href={template.url} className="w-full" target="_blank" rel="noopener noreferrer">
						<Button
							key={template.id}
							variant="outline"
							className="w-full flex flex-col items-start gap-1 h-auto p-4 text-left cursor-pointer"
						>
							<div className="flex w-full items-center justify-between">
								<span className="font-medium">{template.name}</span>
								<ExternalLink className="h-4 w-4 text-muted-foreground" />
							</div>
							<span className="text-xs text-muted-foreground">{template.description}</span>
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
				<Button variant="outline" className="hidden md:inline-flex">
					<PlusCircle className="h-4 w-4" /> Suggest new icon
				</Button>
			</DialogTrigger>
			<DialogContent className="md:max-w-4xl backdrop-blur-2xl">
				<DialogHeader>
					<DialogTitle>Suggest a new icon</DialogTitle>
					<DialogDescription>You can suggest a new icon by creating an issue on GitHub using one of the templates below.</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<IconSubmissionContent onClose={() => setOpen(false)} />
				</div>
			</DialogContent>
		</Dialog>
	)
}
