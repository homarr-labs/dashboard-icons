import { TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { type AuthorizeValidation, resolveAuthorizePage } from "@/mcp/auth/authorize"
import { AuthorizeConsent } from "./consent"

export const metadata: Metadata = {
	title: "Connect an app",
	robots: { index: false, follow: false },
}

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

type AuthorizeErrorProps = { error: string; description: string; returnTo?: string; returnHost?: string }

function AuthorizeError({ error, description, returnTo, returnHost }: AuthorizeErrorProps) {
	return (
		<Card>
			<CardHeader className="text-center space-y-3">
				<TriangleAlert className="mx-auto size-10 text-destructive" aria-hidden />
				<h1 className="text-2xl font-semibold">This sign-in link is not valid</h1>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-4">
				{returnTo && (
					<Button asChild variant="outline">
						<a href={returnTo} rel="noreferrer">
							Return to <span className="font-mono break-all">{returnHost}</span>
						</a>
					</Button>
				)}
				<p className="text-xs text-muted-foreground">Error code: {error}</p>
			</CardContent>
		</Card>
	)
}

function AuthorizeContent({ result }: { result: AuthorizeValidation }) {
	if (result.kind === "invalid") return <AuthorizeError error={result.error} description={result.description} />
	if (result.kind === "client_error") {
		return (
			<AuthorizeError error={result.error} description={result.description} returnTo={result.returnTo} returnHost={result.returnHost} />
		)
	}
	return (
		<AuthorizeConsent
			clientName={result.request.clientName}
			redirectHost={result.request.redirectHost}
			scope={result.request.scope}
			params={result.request.params}
		/>
	)
}

export default async function AuthorizePage({ searchParams }: PageProps) {
	const result = resolveAuthorizePage(await searchParams, await headers())
	if (result.kind === "disabled") notFound()

	return (
		<div className="container mx-auto px-4 py-10 sm:py-16">
			<div className="max-w-lg mx-auto">
				<AuthorizeContent result={result} />
			</div>
		</div>
	)
}
