"use client"

import { Github } from "lucide-react"
import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { pb } from "@/lib/pb"

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
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setIsLoading(true)

		try {
			if (isRegister) {
				if (password !== confirmPassword) {
					setError("Passwords do not match")
					setIsLoading(false)
					return
				}

				if (!username.trim()) {
					setError("Username is required")
					setIsLoading(false)
					return
				}

				if (!email.trim()) {
					setError("Email is required")
					setIsLoading(false)
					return
				}

				await pb.collection("users").create({
					username: username.trim(),
					email: email.trim(),
					password,
					passwordConfirm: confirmPassword,
				})

				await pb.collection("users").authWithPassword(email, password)
			} else {
				await pb.collection("users").authWithPassword(email, password)
			}

			onOpenChange(false)
			setEmail("")
			setUsername("")
			setPassword("")
			setConfirmPassword("")
		} catch (err: any) {
			console.error("Auth error:", err)
			setError(err?.message || "Authentication failed. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	const toggleMode = () => {
		setIsRegister(!isRegister)
		emailRef.current?.focus()
		setEmail("")
		setUsername("")
		setPassword("")
		setConfirmPassword("")
		setError("")
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-background border shadow-2xl ">
				<DialogHeader className="space-y-3">
					<DialogTitle className="text-2xl font-bold">{isRegister ? "Create account" : "Sign in"}</DialogTitle>
					<DialogDescription className="text-base">
						{isRegister ? "Enter your details to create an account" : "Enter your credentials to continue"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5 pt-2">
					{error && (
						<div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg flex items-start gap-2">
							<svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clipRule="evenodd"
								/>
							</svg>
							<span>{error}</span>
						</div>
					)}

					<div
						role="presentation"
						aria-hidden="true"
						className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-input bg-muted/30 px-4 py-2 text-sm cursor-not-allowed opacity-50 pointer-events-none transition-colors"
					>
						<Github className="h-5 w-5" />
						<span className="font-medium">Continue with GitHub</span>
						<span className="text-xs text-muted-foreground ml-auto">(Coming soon)</span>
					</div>

					<div role="separator" aria-label="or" className="relative py-2">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground uppercase font-medium">
							or
						</span>
					</div>

					<fieldset className="space-y-2 border-0 p-0">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								Email {!isRegister && "or Username"}
							</Label>
							<Input
								id="email"
								ref={emailRef}
								autoFocus
								tabIndex={1}
								name="email"
								type="text"
								autoComplete="username"
								placeholder={`Enter your email${isRegister ? "" : " or username"}`}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								aria-invalid={error ? "true" : "false"}
								className="h-11 text-base"
								required
							/>
							{isRegister && (
								<p className="text-xs text-muted-foreground leading-relaxed">Used only to send you updates about your submissions</p>
							)}
						</div>

						{isRegister && (
							<div className="space-y-2">
								<Label htmlFor="username" className="text-sm font-medium">
									Username
								</Label>
								<Input
									id="username"
									tabIndex={2}
									name="username"
									type="text"
									autoComplete="username"
									placeholder="Choose a username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									aria-invalid={error && !username.trim() ? "true" : "false"}
									className="h-11 text-base"
									required
								/>
								<p className="text-xs text-muted-foreground leading-relaxed">This will be displayed publicly with your submissions</p>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								Password
							</Label>
							<Input
								id="password"
								tabIndex={isRegister ? 3 : 2}
								name="password"
								type="password"
								autoComplete={isRegister ? "new-password" : "current-password"}
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								aria-invalid={error ? "true" : "false"}
								className="h-11 text-base"
								required
							/>
						</div>

						{isRegister && (
							<div className="space-y-2">
								<Label htmlFor="confirmPassword" className="text-sm font-medium">
									Confirm Password
								</Label>
								<Input
									id="confirmPassword"
									tabIndex={4}
									name="confirmPassword"
									type="password"
									autoComplete="new-password"
									placeholder="Confirm your password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									aria-invalid={error && password !== confirmPassword ? "true" : "false"}
									className="h-11 text-base"
									required
								/>
							</div>
						)}
					</fieldset>

					<footer className="space-y-4 pt-2">
						<Button type="submit" className="w-full h-11 text-base font-semibold shadow-sm" disabled={isLoading}>
							{isLoading ? (
								<>
									<svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Please wait...
								</>
							) : (
								<>{isRegister ? "Create account" : "Sign in"}</>
							)}
						</Button>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs">
								<button
									type="button"
									onClick={toggleMode}
									className="bg-background px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer font-medium hover:underline underline-offset-4"
								>
									{isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
								</button>
							</div>
						</div>
					</footer>
				</form>
			</DialogContent>
		</Dialog>
	)
}
