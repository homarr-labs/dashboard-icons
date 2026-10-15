import { TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { resolveAuthorizePage } from "@/mcp/auth/authorize"
import { AuthorizeConsent } from "./consent"

export const metadata: Metadata = {
	title: "Connect an app",
	robots: { index: false, follow: false },
}

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AuthorizePage({ searchParams }: PageProps) {
	const result = resolveAuthorizePage(await searchParams, await headers())
	if (result.kind === "disabled") notFound()
	if (result.kind === "redirect") redirect(result.redirectTo)

	return (
		<div className="container mx-auto px-4 py-10 sm:py-16">
			<div className="max-w-lg mx-auto">
				{result.kind === "invalid" ? (
					<Card>
						<CardHeader className="text-center space-y-3">
							<TriangleAlert className="mx-auto size-10 text-destructive" aria-hidden />
							<h1 className="text-2xl font-semibold">This sign-in link is not valid</h1>
							<CardDescription>{result.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-center text-xs text-muted-foreground">Error code: {result.error}</p>
						</CardContent>
					</Card>
				) : (
					<AuthorizeConsent
						clientName={result.request.clientName}
						redirectHost={result.request.redirectHost}
						scope={result.request.scope}
						params={result.request.params}
					/>
				)}
			</div>
		</div>
	)
}
