"use client"

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { REPO_PATH } from "@/constants";

export const ISSUE_TEMPLATES = [
	{
		id: "add_monochrome_icon",
		name: "Add light & dark icon",
		description:
			"Submit a new icon with both light and dark versions for optimal theme compatibility.",
		url: `${REPO_PATH}/issues/new?template=add_monochrome_icon.yml`,
	},
	{
		id: "add_normal_icon",
		name: "Add normal icon",
		description:
			"Submit a new icon that works well across both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=add_normal_icon.yml`,
	},
	{
		id: "update_monochrome_icon",
		name: "Update light & dark icon",
		description:
			"Improve an existing icon by updating both light and dark versions.",
		url: `${REPO_PATH}/issues/new?template=update_monochrome_icon.yml`,
	},
	{
		id: "update_normal_icon",
		name: "Update normal icon",
		description:
			"Improve an existing icon that works across both light and dark themes.",
		url: `${REPO_PATH}/issues/new?template=update_normal_icon.yml`,
	},
	{
		id: "blank_issue",
		name: "Something else",
		description:
			"Create a custom issue for other suggestions, bug reports, or improvements.",
		url: `${REPO_PATH}/issues/new?template=BLANK_ISSUE`,
	},
];

export function IconSubmissionContent() {
	return (
		<div className="flex flex-col gap-6">
			<div className="text-center space-y-2">
				<p className="text-muted-foreground">
					Submissions are currently handled via GitHub issues, but we are
					experimenting with uploading icons directly on the website.
				</p>
				<Button variant="link" asChild className="text-primary">
					<Link href="/submit">
						Try the experimental submission form &rarr;
					</Link>
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				{ISSUE_TEMPLATES.map((template) => (
					<Button
						key={template.id}
						variant="outline"
						className="h-auto flex-col items-start p-4 text-left hover:bg-muted/50"
						asChild
					>
						<Link href={template.url} target="_blank" rel="noopener noreferrer">
							<div className="flex w-full items-center justify-between mb-1">
								<span className="font-semibold">{template.name}</span>
								<ExternalLink className="h-3 w-3 opacity-50" />
							</div>
							<span className="text-xs text-muted-foreground font-normal whitespace-normal text-wrap">
								{template.description}
							</span>
						</Link>
					</Button>
				))}
			</div>
		</div>
	);
}
