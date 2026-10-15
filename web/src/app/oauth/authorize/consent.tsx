"use client"

import { Check, Loader2, PlugZap, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { LoginModalContent } from "@/components/login-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { pb } from "@/lib/pb"

type AuthorizeConsentProps = {
	clientName: string
	redirectHost: string
	scope: string
	params: Record<string, string>
}

type Phase = { kind: "checking" } | { kind: "signin" } | { kind: "consent"; username: string } | { kind: "redirecting"; denied: boolean }

type DecisionResponse = { redirectTo?: string; error?: string; error_description?: string }

const SCOPE_GRANTS: Record<string, string[]> = {
	account: ["See your icon submissions and their review status", "Submit icons to the review queue as you"],
}

function currentPhase(): Phase {
	if (!pb.authStore.isValid || !pb.authStore.record) return { kind: "signin" }
	return { kind: "consent", username: pb.authStore.record.username || pb.authStore.record.email }
}

export function AuthorizeConsent({ clientName, redirectHost, scope, params }: AuthorizeConsentProps) {
	const [phase, setPhase] = useState<Phase>({ kind: "checking" })
	const [pending, setPending] = useState<"approve" | "deny" | null>(null)
	const [error, setError] = useState("")

	useEffect(() => {
		setPhase(currentPhase())
		return pb.authStore.onChange(() => setPhase(currentPhase()))
	}, [])

	async function decide(deny: boolean) {
		setError("")
		setPending(deny ? "deny" : "approve")
		try {
			const response = await fetch("/api/oauth/authorize", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ params, deny, pbToken: deny ? undefined : pb.authStore.token }),
			})
			const body = (await response.json()) as DecisionResponse
			if (response.status === 401) {
				pb.authStore.clear()
				return
			}
			if (!response.ok || !body.redirectTo) {
				setError(body.error_description ?? "Something went wrong. Try again.")
				return
			}
			setPhase({ kind: "redirecting", denied: deny })
			window.location.assign(body.redirectTo)
		} catch {
			setError("Could not reach Dashboard Icons. Check your connection and try again.")
		} finally {
			setPending(null)
		}
	}

	if (phase.kind === "checking") {
		return (
			<div className="flex justify-center py-24">
				<Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
			</div>
		)
	}

	if (phase.kind === "signin") {
		return (
			<Card>
				<CardHeader className="text-center">
					<CardDescription>
						Sign in to connect <span className="font-medium text-foreground">{clientName}</span> to your Dashboard Icons account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<LoginModalContent />
				</CardContent>
			</Card>
		)
	}

	if (phase.kind === "redirecting") {
		return (
			<Card>
				<CardHeader className="text-center space-y-3">
					<Check className="mx-auto size-10 text-primary" aria-hidden />
					<h1 className="text-2xl font-semibold">{phase.denied ? "Access denied" : "You're connected"}</h1>
					<CardDescription>Returning you to {clientName}. You can close this tab once it opens.</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	const grants = scope.split(" ").flatMap((value) => SCOPE_GRANTS[value] ?? [])

	return (
		<Card>
			<CardHeader className="text-center space-y-3">
				<PlugZap className="mx-auto size-10 text-primary" aria-hidden />
				<h1 className="text-2xl font-semibold">
					Connect <span className="break-words">{clientName}</span>
				</h1>
				<CardDescription>This app wants to use the Dashboard Icons MCP server with your account.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="space-y-2">
					<p className="text-sm font-semibold">It will be able to:</p>
					<ul className="space-y-2">
						{grants.map((grant) => (
							<li key={grant} className="flex items-start gap-2 text-sm text-muted-foreground">
								<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
								{grant}
							</li>
						))}
					</ul>
				</div>
				<Separator />
				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Signed in as</dt>
					<dd className="flex items-center gap-1.5 font-medium">
						<UserRound className="size-4" aria-hidden />
						{phase.username}
					</dd>
					<dt className="text-muted-foreground">Returns to</dt>
					<dd className="font-mono text-xs break-all self-center">{redirectHost}</dd>
				</dl>
				<p className="text-xs text-muted-foreground">
					Only approve apps you started connecting yourself. Changing your password signs every connected app out within an hour.
				</p>
				{error && (
					<p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</p>
				)}
			</CardContent>
			<CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
				<Button variant="ghost" size="sm" onClick={() => pb.authStore.clear()} disabled={pending !== null}>
					Not you? Switch account
				</Button>
				<div className="flex w-full gap-3 sm:w-auto">
					<Button variant="outline" className="flex-1" onClick={() => decide(true)} disabled={pending !== null}>
						{pending === "deny" && <Loader2 className="animate-spin" />}
						Deny
					</Button>
					<Button className="flex-1" onClick={() => decide(false)} disabled={pending !== null}>
						{pending === "approve" && <Loader2 className="animate-spin" />}
						Approve
					</Button>
				</div>
			</CardFooter>
		</Card>
	)
}
