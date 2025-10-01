"use client"

import { Github, LayoutDashboard, LogOut, User } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { pb } from "@/lib/pb"

interface UserData {
	username: string
	email: string
	avatar?: string
}

interface UserButtonProps {
	asChild?: boolean
	isLoggedIn?: boolean
	userData?: UserData
}

export function UserButton({ asChild, isLoggedIn = false, userData }: UserButtonProps) {
	return (
		<DropdownMenuTrigger asChild>
			<Button
				className="transition-colors duration-200 group hover:ring-2 rounded-lg cursor-pointer border border-border/50"
				variant="ghost"
				size="icon"
			>
				{isLoggedIn && userData ? (
					<Avatar className="h-8 w-8">
						<AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.username} />
						<AvatarFallback className="text-xs">{userData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
				) : (
					<User className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-110" />
				)}
				<span className="sr-only">{isLoggedIn ? "User menu" : "Sign in"}</span>
			</Button>
		</DropdownMenuTrigger>
	)
}

interface UserMenuProps {
	userData: UserData
	onSignOut: () => void
}

export function UserMenu({ userData, onSignOut }: UserMenuProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-3 px-1">
				<Avatar className="h-10 w-10">
					<AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.username} />
					<AvatarFallback className="text-sm font-semibold">{userData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
				<div className="flex flex-col gap-0.5 flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">{userData.username}</p>
					<p className="text-xs text-muted-foreground truncate">{userData.email}</p>
				</div>
			</div>

			<DropdownMenuSeparator />

			<Button asChild variant="ghost" className="w-full justify-start gap-2 hover:bg-muted">
				<Link href="/dashboard">
					<LayoutDashboard className="h-4 w-4" />
					Dashboard
				</Link>
			</Button>

			<Button
				onClick={onSignOut}
				asChild
				variant="ghost"
				className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
			>
				<div>
					<LogOut className="h-4 w-4" />
					Sign out
				</div>
			</Button>
		</div>
	)
}

interface LoginPopupProps {
	trigger?: React.ReactNode
	isLoggedIn?: boolean
	userData?: UserData
	onSignOut?: () => void
}

export function LoginPopup({ trigger, isLoggedIn = false, userData, onSignOut }: LoginPopupProps) {
	const [open, setOpen] = useState(false)
	const [isRegister, setIsRegister] = useState(false)
	const [email, setEmail] = useState("")
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [error, setError] = useState("")
	const [isLoading, setIsLoading] = useState(false)

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
				// For login, use email as the identifier
				await pb.collection("users").authWithPassword(email, password)
			}

			setOpen(false)
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
		setEmail("")
		setUsername("")
		setPassword("")
		setConfirmPassword("")
		setError("")
	}

	const handleSignOut = () => {
		setOpen(false)
		// Wait for dropdown close animation before updating parent state
		setTimeout(() => {
			onSignOut?.()
		}, 150)
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
			{trigger || <UserButton isLoggedIn={isLoggedIn} userData={userData} />}
			<DropdownMenuContent align="end" className="w-80 p-4">
				{isLoggedIn && userData ? (
					<UserMenu userData={userData} onSignOut={handleSignOut} />
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<h3 className="font-semibold text-lg">{isRegister ? "Create account" : "Sign in"}</h3>
							<p className="text-sm text-muted-foreground">
								{isRegister ? "Enter your details to create an account" : "Enter your credentials to continue"}
							</p>
							{error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
						</div>

						<div
							role="presentation"
							aria-hidden="true"
							className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-not-allowed opacity-50 pointer-events-none"
						>
							<Github className="h-4 w-4 opacity-40" />
							<span className="opacity-40">Sign in with GitHub</span>
						</div>

						<div role="separator" aria-label="or" className="relative">
							<Separator />
							<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover px-2 text-xs text-muted-foreground uppercase">
								or
							</span>
						</div>

						<fieldset className="space-y-4 border-0 p-0">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									autoFocus
									tabIndex={1}
									name="email"
									type="email"
									autoComplete="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
								{isRegister && <p className="text-xs text-muted-foreground">Used only to send you updates about your submissions</p>}
							</div>

							{isRegister && (
								<div className="space-y-2">
									<Label htmlFor="username">Username</Label>
									<Input
										id="username"
										tabIndex={2}
										name="username"
										type="text"
										autoComplete="username"
										placeholder="Choose a username"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required
									/>
									<p className="text-xs text-muted-foreground">This will be displayed publicly with your submissions</p>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									tabIndex={isRegister ? 3 : 2}
									name="password"
									type="password"
									autoComplete={isRegister ? "new-password" : "current-password"}
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>

							{isRegister && (
								<div className="space-y-2">
									<Label htmlFor="confirmPassword">Confirm Password</Label>
									<Input
										id="confirmPassword"
										tabIndex={4}
										name="confirmPassword"
										type="password"
										autoComplete="new-password"
										placeholder="Confirm your password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
									/>
								</div>
							)}
						</fieldset>

						<footer className="space-y-3">
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Please wait..." : isRegister ? "Register" : "Login"}
							</Button>

							<div className="text-center text-sm">
								<button
									type="button"
									onClick={toggleMode}
									className="text-muted-foreground hover:text-foreground transition-all duration-200 underline underline-offset-4 decoration-muted-foreground/50 cursor-pointer font-medium"
								>
									{isRegister ? "login" : "register"}
								</button>
							</div>
						</footer>
					</form>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
