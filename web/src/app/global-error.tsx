"use client"

import NextError from "next/error"
import posthog from "posthog-js"
import { useEffect } from "react"
import { isChunkLoadError, recoverFromChunkError } from "@/lib/chunk-error-recovery"

export default function GlobalError({ error, reset: _reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		posthog.captureException(error)
		if (isChunkLoadError(error)) recoverFromChunkError()
	}, [error])

	return (
		<html lang="en">
			<body>
				<NextError statusCode={0} />
			</body>
		</html>
	)
}
