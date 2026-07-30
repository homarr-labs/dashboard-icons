"use client"

import NextError from "next/error"
import posthog from "posthog-js"
import { useEffect } from "react"

export default function GlobalError({ error, reset: _reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		posthog.captureException(error)
	}, [error])

	return (
		<html lang="en">
			<body>
				<NextError statusCode={0} />
			</body>
		</html>
	)
}
