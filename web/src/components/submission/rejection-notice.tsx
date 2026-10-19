"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, MessageSquareWarning } from "lucide-react"
import Link from "next/link"
import { ClientResponseError } from "pocketbase"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { pb } from "@/lib/pb"

export function RejectionNotice({ id, feedback, canEdit }: { id: string; feedback?: string; canEdit?: boolean }) {
	const userId = useSyncExternalStore(
		(onChange) => pb.authStore.onChange(onChange),
		() => {
			if (!pb.authStore.isValid) return ""
			return pb.authStore.record?.id ?? ""
		},
		() => "",
	)
	const ownership = useQuery({
		queryKey: ["rejected-submission-owner", id, userId],
		enabled: canEdit === undefined && Boolean(userId),
		retry: false,
		queryFn: async () => {
			try {
				const record = await pb.collection("submissions").getOne(id, { fields: "created_by", requestKey: null })
				return record.created_by === userId
			} catch (error) {
				if (error instanceof ClientResponseError && [403, 404].includes(error.status)) return false
				throw error
			}
		},
	})
	const editable = canEdit === true || (canEdit === undefined && ownership.data === true)
	return (
		<section className="flex gap-3 rounded-lg border bg-background p-4" aria-label="Rejection feedback">
			<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
				<MessageSquareWarning className="size-4" aria-hidden />
			</span>
			<div className="flex min-w-0 flex-col gap-2">
				<h2 className="font-semibold">Rejections are never final</h2>
				{feedback && (
					<blockquote className="whitespace-pre-wrap break-words border-l-2 border-red-500/40 pl-3 text-sm">
						<strong>Reviewer feedback:</strong> {feedback}
					</blockquote>
				)}
				<p className="max-w-prose text-sm text-muted-foreground">
					The contributor can fix the feedback and resubmit this same Submission. Its id and history stay the same.
				</p>
				{ownership.isError && <p className="text-sm text-muted-foreground">Editing access could not be verified. Reload to try again.</p>}
				{editable && (
					<Button asChild className="max-w-full self-start whitespace-normal">
						<Link href={`/submit?submission=${encodeURIComponent(id)}`}>
							Fix and resubmit
							<ArrowRight aria-hidden />
						</Link>
					</Button>
				)}
			</div>
		</section>
	)
}
