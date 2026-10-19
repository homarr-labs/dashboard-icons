"use client"

import { Check, Loader2, LogIn, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { IconSubmissionForm } from "@/components/icon-submission-form"
import { LoginModal } from "@/components/login-modal"
import { AuroraText } from "@/components/magicui/aurora-text"
import { CTA_CLASS } from "@/components/submission/submission-ui"
import { Badge } from "@/components/ui/badge"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { pb } from "@/lib/pb"
import { cn } from "@/lib/utils"

const REQUIREMENTS = [
	"You need to be logged in to submit icons",
	"Upload SVG or PNG files, with one Base per Icon",
	"Maximum file size: 5MB per variant",
	"All submissions are reviewed before being added",
]

export default function SubmitPage() {
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [showLoginModal, setShowLoginModal] = useState(false)

	useEffect(() => {
		const checkAuth = () => {
			setIsAuthenticated(pb.authStore.isValid)
			setIsLoading(false)
		}

		checkAuth()

		return pb.authStore.onChange(() => {
			checkAuth()
		})
	}, [])

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-12">
				<div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
					<Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
					<p>Loading...</p>
				</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<>
				<div className="container mx-auto px-4 py-6 sm:py-12">
					<div className="mx-auto max-w-2xl">
						<Card className="relative overflow-hidden shadow-lg">
							<span
								className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
								aria-hidden
							/>
							<CardHeader className="relative items-center gap-4 px-4 text-center sm:px-6">
								<Badge variant="outline" className="mx-auto gap-1.5 rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-primary">
									<Sparkles aria-hidden />
									Community contributions
								</Badge>
								<h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
									Submit an <AuroraText colors={["#FA5352", "#FA5352", "orange"]}>Icon</AuroraText>
								</h1>
								<CardDescription className="text-sm sm:text-base">
									Share your icons with the community and help expand our collection
								</CardDescription>
							</CardHeader>
							<CardContent className="relative flex flex-col gap-6 px-4 sm:px-6">
								<div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4 sm:p-6">
									<h2 className="text-base font-semibold sm:text-lg">Before you start</h2>
									<ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
										{REQUIREMENTS.map((requirement) => (
											<li key={requirement} className="flex items-start gap-2.5">
												<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
													<Check className="size-3" aria-hidden />
												</span>
												{requirement}
											</li>
										))}
									</ul>
								</div>

								<div className="flex justify-center pt-2 sm:pt-4">
									<Button size="lg" onClick={() => setShowLoginModal(true)} className={cn(CTA_CLASS, "sm:w-auto")}>
										<LogIn aria-hidden />
										Sign In to Submit
									</Button>
								</div>
							</CardContent>
							<BorderBeam
								size={140}
								duration={10}
								colorFrom="var(--magic-border-from)"
								colorTo="var(--magic-border-to)"
								className="motion-reduce:hidden"
							/>
						</Card>
					</div>
				</div>

				<LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
			</>
		)
	}

	return (
		<div className="container mx-auto px-4 py-6 sm:py-10">
			<IconSubmissionForm />
		</div>
	)
}
