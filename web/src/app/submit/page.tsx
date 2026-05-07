"use client"

import { useEffect, useState } from "react"
import { IconSubmissionForm } from "@/components/icon-submission-form"
import { LoginModal } from "@/components/login-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { pb } from "@/lib/pb"

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

		// Subscribe to auth changes
		pb.authStore.onChange(() => {
			checkAuth()
		})
	}, [])

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-12">
				<div className="flex items-center justify-center min-h-[60vh]">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<>
				<div className="container mx-auto px-4 py-6 sm:py-12">
					<div className="max-w-2xl mx-auto">
						<Card>
							<CardHeader className="text-center space-y-4 px-4 sm:px-6">
								<CardTitle className="text-2xl sm:text-3xl">Submit an Icon</CardTitle>
								<CardDescription className="text-sm sm:text-base">Share your icons with the community and help expand our collection</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6 px-4 sm:px-6">
								<div className="bg-muted/50 p-4 sm:p-6 rounded-lg space-y-4">
									<h3 className="font-semibold text-base sm:text-lg">Before you start</h3>
									<ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
										<li>You need to be logged in to submit icons</li>
										<li>Icons should be in SVG, PNG, or WebP format</li>
										<li>Maximum file size: 5MB per variant</li>
										<li>All submissions are reviewed before being added</li>
									</ul>
								</div>

								<div className="flex justify-center pt-2 sm:pt-4">
									<Button size="lg" onClick={() => setShowLoginModal(true)} className="w-full sm:w-auto">
										Sign In to Submit
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				<LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
			</>
		)
	}

	return (
		<div className="container mx-auto px-4 py-6 sm:py-12">
			<div className="mb-6 sm:mb-8 text-center">
				<h1 className="text-2xl sm:text-4xl font-bold mb-2">Submit an Icon</h1>
				<p className="text-muted-foreground text-sm sm:text-lg">
					{isAuthenticated ? "Create a new icon or update an existing one" : "Sign in to submit icons"}
				</p>
			</div>

			<IconSubmissionForm />
		</div>
	)
}
