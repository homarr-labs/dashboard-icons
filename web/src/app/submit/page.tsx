"use client"

import { Check, Loader2, LogIn } from "lucide-react"
import { useEffect, useState } from "react"
import { IconSubmissionForm } from "@/components/icon-submission-form"
import { LoginModal } from "@/components/login-modal"
import { AuroraText } from "@/components/magicui/aurora-text"
import { AURORA_COLORS } from "@/components/submission/submission-ui"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { pb } from "@/lib/pb"

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
						<Card className="relative overflow-hidden bg-background/50 shadow-lg">
							<CardHeader className="gap-2 px-4 text-center sm:px-6">
								<h1 className="text-2xl font-bold sm:text-3xl">
									Submit an <AuroraText colors={AURORA_COLORS}>Icon</AuroraText>
								</h1>
								<CardDescription className="text-sm sm:text-base">
									Share your icons with the community and help expand our collection
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-6 px-4 sm:px-6">
								<div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4 sm:p-6">
									<h2 className="text-base font-semibold sm:text-lg">Before you start</h2>
									<ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
										{REQUIREMENTS.map((requirement) => (
											<li key={requirement} className="flex items-start gap-2.5">
												<Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
												{requirement}
											</li>
										))}
									</ul>
								</div>

								<div className="flex justify-center pt-2 sm:pt-4">
									<Button size="lg" onClick={() => setShowLoginModal(true)} className="w-full sm:w-auto">
										<LogIn aria-hidden />
										Sign In to Submit
									</Button>
								</div>
							</CardContent>
							<BorderBeam
								size={120}
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
