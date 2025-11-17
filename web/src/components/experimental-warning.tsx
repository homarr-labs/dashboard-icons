import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ExperimentalWarningProps {
	message?: string
}

export function ExperimentalWarning({ message }: ExperimentalWarningProps) {
	const defaultMessage =
		message ||
		"This icon submission system is currently in an experimentation phase. Submissions will not be reviewed or processed at this time. We're gathering feedback to improve the experience."

	return (
		<Alert variant="default" className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 px-8 py-6">
			<AlertTriangle className="text-amber-600 dark:text-amber-500 size-8" />
			<div className="col-start-2 space-y-4">
				<AlertTitle className="text-amber-900 dark:text-amber-100 text-2xl font-bold">Experimental Feature</AlertTitle>
				<AlertDescription className="text-amber-800 dark:text-amber-200 text-base leading-relaxed">{defaultMessage}</AlertDescription>
				<Button className="feedback-button mt-4" variant="outline" size="lg">
					Send feedback
				</Button>
			</div>
		</Alert>
	)
}
