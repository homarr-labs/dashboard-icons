import { IconSubmissionContent } from "@/components/icon-submission-form"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft, PlusCircle } from "lucide-react"
import Link from "next/link"

export default function NotFound({
	error,
}: {
	error: Error & { digest?: string }
}) {
	return (
		<div className="py-16 flex items-center justify-center">
			<div className="text-center space-y-8 max-w-2xl mx-auto">
				<div className="flex flex-col items-center">
					<div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
						<AlertTriangle className="w-8 h-8" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold mt-6">Icon not found</h1>
					<p className="text-muted-foreground mt-3 max-w-md">
						The icon you are looking for could not be found or there was an error loading it.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button asChild variant="outline">
						<Link href="/icons">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to all icons
						</Link>
					</Button>
				</div>

				<div className="border-t border-border pt-8 mt-8">
					<div className="text-center mb-6">
						<h2 className="text-xl font-semibold">Can't find what you're looking for?</h2>
						<p className="text-muted-foreground mt-2">
							Contribute to our icon collection by suggesting a new icon or improving an existing one.
						</p>
					</div>

					<div className="mt-6">
						<IconSubmissionContent />
					</div>
				</div>
			</div>
		</div>
	)
}
