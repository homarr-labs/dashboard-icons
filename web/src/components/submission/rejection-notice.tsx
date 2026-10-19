import Link from "next/link"
import { Button } from "@/components/ui/button"

export function RejectionNotice({ id, feedback, canEdit = true }: { id: string; feedback?: string; canEdit?: boolean }) {
	return (
		<section className="space-y-3 rounded-lg bg-muted/50 p-4" aria-label="Rejection feedback">
			<h2 className="font-semibold">Rejections are never final</h2>
			{feedback && (
				<p className="whitespace-pre-wrap break-words text-sm">
					<strong>Reviewer feedback:</strong> {feedback}
				</p>
			)}
			<p className="max-w-prose text-sm">
				The contributor can fix the feedback and resubmit this same Submission. Its id and history stay the same.
			</p>
			{canEdit && (
				<Button asChild variant="outline" className="min-h-11 max-w-full whitespace-normal">
					<Link href={`/submit?submission=${encodeURIComponent(id)}`}>Fix and resubmit</Link>
				</Button>
			)}
		</section>
	)
}
