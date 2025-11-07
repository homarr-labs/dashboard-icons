"use client"

import { Github, Loader2 } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { pb } from "@/lib/pb"
import { identifyUserInPostHog } from "@/lib/posthog-utils"

interface LoginModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
	const [isRegister, setIsRegister] = useState(false)
	const [email, setEmail] = useState("")
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [error, setError] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const emailRef = useRef<HTMLInputElement>(null)
	const posthog = usePostHog()

	const resetForm = () => {
		setEmail("")
		setUsername("")
		setPassword("")
		setConfirmPassword("")
		setError("")
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setIsLoading(true)

		try {
			if (isRegister) {
				// Validation
				if (password !== confirmPassword) {
					setError("Passwords do not match")
					return
				}
				if (!username.trim()) {
					setError("Username is required")
					return
				}
				if (!email.trim()) {
					setError("Email is required")
					return
				}

				// Create account and login
				await pb.collection("users").create({
					username: username.trim(),
					email: email.trim(),
					password,
					passwordConfirm: confirmPassword,
				})
				await pb.collection("users").authWithPassword(email, password)

				// Identify user immediately after successful authentication
				// This follows PostHog best practice of calling identify as soon as possible
				identifyUserInPostHog(posthog)

				// Track registration event
				posthog?.capture("user_registered", {
					email: email.trim(),
					username: username.trim(),
				})
			} else {
				// Login
				await pb.collection("users").authWithPassword(email, password)

				// Identify user immediately after successful authentication
				// This follows PostHog best practice of calling identify as soon as possible
				identifyUserInPostHog(posthog)

				// Track login event
				posthog?.capture("user_logged_in", {
					email: email.trim(),
				})
			}

			// Success
			onOpenChange(false)
			resetForm()
		} catch (err: any) {
			console.error("Auth error:", err)
			setError(err?.message || "Authentication failed. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	const toggleMode = () => {
		setIsRegister(!isRegister)
		resetForm()
		setTimeout(() => emailRef.current?.focus(), 100)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-full max-w-lg bg-background border shadow-2xl">
				<DialogHeader className="text-center space-y-2 pb-4">
					<DialogTitle className="text-3xl font-bold">{isRegister ? "Create Account" : "Welcome Back"}</DialogTitle>
					<DialogDescription className="text-lg text-muted-foreground">
						{isRegister ? "Join our community and start submitting icons" : "Sign in to submit and manage your icons"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Error Message */}
					{error && (
						<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3">
							<svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="font-medium">{error}</span>
						</div>
					)}

					{/* GitHub Button (Coming Soon) */}
					<Button type="button" variant="outline" className="w-full h-12 text-base font-medium cursor-not-allowed opacity-50" disabled>
						<Github className="h-5 w-5 mr-2" />
						Continue with GitHub
						<span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
					</Button>

					{/* Divider */}
					<div className="relative">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground font-medium">
							or continue with email
						</span>
					</div>

					{/* Form Fields */}
					<div className="space-y-4">
						{/* Email Field */}
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-semibold">
								Email {!isRegister && "or Username"}
							</Label>
							<Input
								id="email"
								ref={emailRef}
								autoFocus
								type="text"
								autoComplete="username"
								placeholder={`Enter your email${isRegister ? "" : " or username"}`}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="h-12 text-base"
								required
							/>
							{isRegister && (
								<p className="text-xs text-muted-foreground">We'll only use this to send you updates about your submissions</p>
							)}
						</div>

						{/* Username Field (Register only) */}
						{isRegister && (
							<div className="space-y-2">
								<Label htmlFor="username" className="text-sm font-semibold">
									Username
								</Label>
								<Input
									id="username"
									type="text"
									autoComplete="username"
									placeholder="Choose a username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="h-12 text-base"
									required
								/>
								<p className="text-xs text-muted-foreground">This will be displayed publicly with your submissions</p>
							</div>
						)}

						{/* Password Field */}
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-semibold">
								Password
							</Label>
							<Input
								id="password"
								type="password"
								autoComplete={isRegister ? "new-password" : "current-password"}
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-12 text-base"
								required
							/>
						</div>

						{/* Confirm Password Field (Register only) */}
						{isRegister && (
							<div className="space-y-2">
								<Label htmlFor="confirmPassword" className="text-sm font-semibold">
									Confirm Password
								</Label>
								<Input
									id="confirmPassword"
									type="password"
									autoComplete="new-password"
									placeholder="Confirm your password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="h-12 text-base"
									required
								/>
							</div>
						)}
					</div>

					{/* Submit Button */}
					<Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
								Please wait...
							</>
						) : (
							<>{isRegister ? "Create Account" : "Sign In"}</>
						)}
					</Button>

					{/* Toggle Mode */}
					<div className="text-center">
						<button
							type="button"
							onClick={toggleMode}
							className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium hover:underline underline-offset-4"
						>
							{isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
						</button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
