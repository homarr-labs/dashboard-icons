"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BASE_URL, REPO_PATH } from "@/constants"
import { motion } from "framer-motion"
import { Check, Copy, Download, Github } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

type Icon = {
	base: string
	categories: string[]
	aliases: string[]
	update: {
		timestamp: number
		author: {
			id: string
		}
	}
	colors?: {
		light?: string
		dark?: string
	}
}

type IconDetailsProps = {
	icon: string
	iconData: Icon
	authorData: {
		name?: string
		login: string
		avatar_url: string
		html_url: string
	}
}

export function IconDetails({ icon, iconData, authorData }: IconDetailsProps) {
	// Use the author login if they don't have a name
	const authorName = authorData.name || authorData.login
	const iconColorVariants = iconData.colors
	const formattedDate = new Date(iconData.update.timestamp).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	// Calculate time difference
	const getTimeAgo = (timestamp: number) => {
		const now = new Date().getTime()
		const diff = now - timestamp

		const days = Math.floor(diff / (1000 * 60 * 60 * 24))
		if (days < 30) return `${days} days ago`

		const months = Math.floor(days / 30)
		if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`

		const years = Math.floor(months / 12)
		return `${years} year${years > 1 ? "s" : ""} ago`
	}

	const timeAgo = getTimeAgo(iconData.update.timestamp)

	// Determine available formats based on base format
	const getAvailableFormats = () => {
		switch (iconData.base) {
			case "svg":
				return ["svg", "png", "webp"]
			case "png":
				return ["png", "webp"]
			default:
				return [iconData.base]
		}
	}

	const availableFormats = getAvailableFormats()

	// Track copied state for each variant
	const [copiedVariants, setCopiedVariants] = useState<Record<string, boolean>>({})

	const handleCopy = (url: string, variantKey: string) => {
		navigator.clipboard.writeText(url)

		// Set this specific variant as copied
		setCopiedVariants((prev) => ({
			...prev,
			[variantKey]: true,
		}))

		// Reset after animation completes
		setTimeout(() => {
			setCopiedVariants((prev) => ({
				...prev,
				[variantKey]: false,
			}))
		}, 2000)

		toast.success("URL copied", {
			description: "The icon URL has been copied to your clipboard",
		})
	}

	const renderVariant = (format: string, iconName: string, theme?: "light" | "dark") => {
		const variantName = theme && iconColorVariants?.[theme] ? iconColorVariants[theme] : iconName
		const url = `${BASE_URL}/${format}/${variantName}.${format}`
		const githubUrl = `${REPO_PATH}/tree/main/${format}/${iconName}.${format}`
		const variantKey = `${format}-${theme || "default"}`
		const isCopied = copiedVariants[variantKey] || false

		return (
			<TooltipProvider key={variantKey}>
				<div className="flex flex-col items-center bg-card rounded-lg p-4 border shadow-sm hover:shadow-md transition-all">
					<Tooltip>
						<TooltipTrigger asChild>
							<motion.div
								className="relative w-28 h-28 mb-3 cursor-pointer rounded-md overflow-hidden group"
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => handleCopy(url, variantKey)}
							>
								<div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-md z-10 transition-colors" />

								{/* Overlay for copy feedback */}
								<motion.div
									className="absolute inset-0 bg-primary/10 flex items-center justify-center z-20 rounded-md"
									initial={{ opacity: 0 }}
									animate={{ opacity: isCopied ? 1 : 0 }}
									transition={{ duration: 0.2 }}
								>
									<motion.div
										initial={{ scale: 0.5, opacity: 0 }}
										animate={{ scale: isCopied ? 1 : 0.5, opacity: isCopied ? 1 : 0 }}
										transition={{ type: "spring", stiffness: 300, damping: 20 }}
									>
										<Check className="w-8 h-8 text-primary" />
									</motion.div>
								</motion.div>

								<Image
									src={url || "/placeholder.svg"}
									alt={`${iconName} in ${format} format${theme ? ` (${theme} theme)` : ""}`}
									fill
									className="object-contain p-2"
								/>
							</motion.div>
						</TooltipTrigger>
						<TooltipContent>
							<p>Click to copy URL to clipboard</p>
						</TooltipContent>
					</Tooltip>

					<p className="text-sm font-medium">{format.toUpperCase()}</p>

					<div className="flex gap-2 mt-3 w-full justify-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline" size="icon" className="h-8 w-8" asChild>
									<Link href={url} download>
										<Download className="w-4 h-4" />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Download icon</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopy(url, `btn-${variantKey}`)}>
									{copiedVariants[`btn-${variantKey}`] ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Copy URL to clipboard</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline" size="icon" className="h-8 w-8" asChild>
									<Link href={githubUrl} target="_blank" rel="noopener noreferrer">
										<Github className="w-4 h-4" />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>View on GitHub</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</TooltipProvider>
		)
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
				{/* Hero section */}
				<div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 bg-card rounded-xl p-6 border shadow-sm">
					<div className="relative w-24 h-24 md:w-32 md:h-32 bg-background rounded-xl overflow-hidden border flex items-center justify-center p-2">
						<Image
							src={`${BASE_URL}/${iconData.base}/${icon}.${iconData.base}`}
							width={96}
							height={96}
							alt={icon}
							className="w-full h-full object-contain"
						/>
					</div>
					<div className="flex-1 text-center md:text-left">
						<h1 className="text-3xl md:text-4xl font-bold capitalize mb-2">{icon}</h1>

						<div className="flex flex-col gap-2 text-muted-foreground">
							<div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
								<p className="font-medium">Updated on</p>
								<p>{formattedDate}</p>
								<span className="hidden md:inline">•</span>
								<p>{timeAgo}</p>
							</div>

							<div className="flex items-center gap-2 justify-center md:justify-start">
								<p className="font-medium">Updated by</p>
								<div className="flex items-center gap-2">
									<Avatar className="h-5 w-5 border">
										<AvatarImage src={authorData.avatar_url} alt={authorName} />
										<AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
									</Avatar>
									<Link href={authorData.html_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
										{authorName}
									</Link>
								</div>
							</div>
						</div>

						<div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
							{iconData.categories &&
								iconData.categories.length > 0 &&
								iconData.categories.map((category) => (
									<span key={category} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
										{category}
									</span>
								))}
						</div>
					</div>
				</div>

				<div className="grid gap-6">
					{/* Icon details card */}
					<Card>
						<CardHeader>
							<CardTitle>Icon Details</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">Format</p>
									<p className="font-medium">{iconData.base.toUpperCase()}</p>
								</div>
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">Categories</p>
									<p className="font-medium">
										{iconData.categories && iconData.categories.length > 0 ? iconData.categories.join(", ") : "No categories"}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">Aliases</p>
									<p className="font-medium">
										{iconData.aliases && iconData.aliases.length > 0 ? iconData.aliases.join(", ") : "No aliases"}
									</p>
								</div>
								{iconData.colors && (
									<div className="space-y-1">
										<p className="text-sm text-muted-foreground">Color Variants</p>
										<div className="font-medium">
											{Object.entries(iconData.colors).map(([theme, variant], index) => (
												<div key={theme} className="flex items-center gap-2">
													<span className="capitalize">{theme}:</span>
													<code className="bg-muted px-1 py-0.5 rounded text-sm">{variant}</code>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Icon variants section */}
				<div className="mt-8">
					<Card>
						<CardHeader>
							<CardTitle>Icon Variants</CardTitle>
							<CardDescription>Click on any icon to copy its URL to your clipboard</CardDescription>
						</CardHeader>
						<CardContent>
							{!iconData.colors ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
									{availableFormats.map((format) => renderVariant(format, icon))}
								</div>
							) : (
								<div className="space-y-10">
									<div>
										<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
											<span className="inline-block w-3 h-3 rounded-full bg-primary" />
											Light Theme
										</h3>
										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
											{availableFormats.map((format) => renderVariant(format, icon, "light"))}
										</div>
									</div>
									<div>
										<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
											<span className="inline-block w-3 h-3 rounded-full bg-primary" />
											Dark Theme
										</h3>
										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
											{availableFormats.map((format) => renderVariant(format, icon, "dark"))}
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
