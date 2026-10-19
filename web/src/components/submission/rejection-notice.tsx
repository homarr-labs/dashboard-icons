"use client"

import { useQuery } from "@tanstack/react-query"
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
			{ownership.isError && <p className="text-sm text-muted-foreground">Editing access could not be verified. Reload to try again.</p>}
			{editable && (
				<Button asChild variant="outline" className="min-h-11 max-w-full whitespace-normal">
					<Link href={`/submit?submission=${encodeURIComponent(id)}`}>Fix and resubmit</Link>
				</Button>
			)}
		</section>
	)
}
