"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { REPO_PATH } from "@/constants"

const userSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string().email(),
	admin: z.boolean().optional(),
	avatar: z.string().optional(),
	created: z.string(),
	updated: z.string(),
})

const submissionExtrasSchema = z.object({
	aliases: z.array(z.string()).default([]),
	categories: z.array(z.string()).default([]),
	base: z.string().optional(),
	colors: z
		.object({
			dark: z.string().optional(),
			light: z.string().optional(),
		})
		.optional(),
	wordmark: z
		.object({
			dark: z.string().optional(),
			light: z.string().optional(),
		})
		.optional(),
})

export const submissionSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Icon name is required"),
	assets: z
		.array(
			z.union([
				z.string(),
				// Accept File objects while data is still client-side
				z.instanceof(File),
			]),
		)
		.min(1, "At least one asset is required"),
	created_by: z.string().optional(),
	status: z.enum(["approved", "rejected", "pending", "added_to_collection"]).default("pending"),
	approved_by: z.string().optional(),
	extras: submissionExtrasSchema.default({
		aliases: [],
		categories: [],
	}),
	expand: z
		.object({
			created_by: userSchema.optional(),
			approved_by: userSchema.optional(),
		})
		.optional(),
	created: z.string().optional(),
	updated: z.string().optional(),
	admin_comment: z.string().optional().default(""),
	description: z.string().optional().default(""),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
export const parseSubmission = (input: unknown) => submissionSchema.parse(input)

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

export function IconSubmissionContent() {
	return (
		<div className="flex flex-col gap-6">
			<div className="text-center space-y-2">
				<p className="text-muted-foreground">
					If you would like to help us expand our collection, you can submit your icons using our submission form or by creating an issue on Github
				</p>
				<Button variant="link" asChild className="text-primary">
					<Link href="/submit">Submit using the submission form &rarr;</Link>
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				{ISSUE_TEMPLATES.map((template) => (
					<Button key={template.id} variant="outline" className="h-auto flex-col items-start p-4 text-left hover:bg-muted/50" asChild>
						<Link href={template.url} target="_blank" rel="noopener noreferrer">
							<div className="flex w-full items-center justify-between mb-1">
								<span className="font-semibold">{template.name}</span>
								<ExternalLink className="h-3 w-3 opacity-50" />
							</div>
							<span className="text-xs text-muted-foreground font-normal whitespace-normal text-wrap">{template.description}</span>
						</Link>
					</Button>
				))}
			</div>
		</div>
	)
}
