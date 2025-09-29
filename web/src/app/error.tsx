"use client"

import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const router = useRouter()

	useEffect(() => {
		// Log the error to an error reporting service
		console.error("Application error:", error)
	}, [error])

	const handleGoBack = () => {
		router.back()
	}

	return (
		<div className="py-16 flex items-center justify-center">
			<div className="text-center space-y-6 max-w-md">
				<div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
					<AlertTriangle className="w-8 h-8" />
				</div>
				<h1 className="text-2xl font-bold">Something went wrong</h1>
				<p className="text-muted-foreground">Unable to load this page. We're looking into the issue.</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
					<Button variant="outline" onClick={() => reset()} className="cursor-pointer">
						<RefreshCcw className="mr-2 h-4 w-4" />
						Retry
					</Button>
					<Button onClick={handleGoBack} className="cursor-pointer">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
				</div>
				{error.digest && <p className="text-xs text-muted-foreground mt-6">Error ID: {error.digest}</p>}
			</div>
		</div>
	)
}
