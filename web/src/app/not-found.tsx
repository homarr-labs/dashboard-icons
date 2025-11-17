import { AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { IconSubmissionContent } from "@/components/icon-submission-form"
import { Button } from "@/components/ui/button"

export default function NotFound({ error }: { error: Error & { digest?: string } }) {
	return (
		<div className="py-16 flex items-center justify-center">
			<div className="text-center space-y-8 max-w-2xl mx-auto">
				<div className="flex flex-col items-center">
					<div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
						<AlertTriangle className="w-8 h-8" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold mt-6">Not found</h1>
					<p className="text-muted-foreground mt-3 max-w-md">This icon does not exist or could not be loaded.</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button asChild variant="outline">
						<Link href="/icons">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to icons
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
