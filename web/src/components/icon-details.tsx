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
		timestamp: string
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
	const authorName = authorData.name || authorData.login
	const iconColorVariants = iconData.colors
	const formattedDate = new Date(iconData.update.timestamp).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})
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
	const [copiedVariants, setCopiedVariants] = useState<Record<string, boolean>>({})

	const handleCopy = (url: string, variantKey: string) => {
		navigator.clipboard.writeText(url)
		setCopiedVariants((prev) => ({
			...prev,
			[variantKey]: true,
		}))
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
									src={url}
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
									<a href={url} download={`${iconName}.${format}`}>
										<Download className="w-4 h-4" />
									</a>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Download icon</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8 cursor-pointer"
									onClick={() => handleCopy(url, `btn-${variantKey}`)}
								>
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
		<div className="container mx-auto px-4 py-8">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Left Column: Icon Info and Author */}
				<div className="lg:col-span-1">
					<Card className="h-full">
						<CardHeader className="pb-4">
							<div className="flex flex-col items-center">
								<div className="relative w-32 h-32 bg-background rounded-xl overflow-hidden border flex items-center justify-center p-3 mb-4">
									<Image
										src={`${BASE_URL}/${iconData.base}/${icon}.${iconData.base}`}
										width={96}
										height={96}
										alt={icon}
										className="w-full h-full object-contain"
									/>
								</div>
								<CardTitle className="text-2xl font-bold capitalize text-center mb-2">{icon}</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div className="space-y-3">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<p className="text-sm">
												<span className="font-medium">Updated on:</span> {formattedDate}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium">By:</p>
												<Avatar className="h-5 w-5 border">
													<AvatarImage src={authorData.avatar_url} alt={authorName} />
													<AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
												</Avatar>
												<Link
													href={authorData.html_url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary hover:underline text-sm"
												>
													{authorName}
												</Link>
											</div>
										</div>
									</div>
								</div>

								{iconData.categories && iconData.categories.length > 0 && (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-muted-foreground">Categories</h3>
										<div className="flex flex-wrap gap-2">
											{iconData.categories.map((category) => (
												<span key={category} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
													{category}
												</span>
											))}
										</div>
									</div>
								)}

								{iconData.aliases && iconData.aliases.length > 0 && (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-muted-foreground">Aliases</h3>
										<div className="flex flex-wrap gap-1">
											{iconData.aliases.map((alias) => (
												<span key={alias} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs">
													{alias}
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Middle Column: Icon Variants */}
				<div className="lg:col-span-2">
					<Card className="h-full">
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

				{/* Right Column: Technical Details */}
				<div className="lg:col-span-1">
					<Card className="h-full">
						<CardHeader>
							<CardTitle>Technical Details</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div className="space-y-3">
									<h3 className="text-sm font-semibold text-muted-foreground">Base Format</h3>
									<div className="flex items-center gap-2">
										<span className="w-3 h-3 rounded-full bg-primary/80" />
										<div className="px-3 py-1.5 bg-muted rounded-md text-sm font-medium">{iconData.base.toUpperCase()}</div>
									</div>
								</div>

								<div className="space-y-3">
									<h3 className="text-sm font-semibold text-muted-foreground">Available Formats</h3>
									<div className="flex flex-wrap gap-2">
										{availableFormats.map((format) => (
											<div key={format} className="px-3 py-1.5 bg-muted rounded-md text-xs font-medium">
												{format.toUpperCase()}
											</div>
										))}
									</div>
								</div>

								{iconData.colors && (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-muted-foreground">Color Variants</h3>
										<div className="space-y-2">
											{Object.entries(iconData.colors).map(([theme, variant]) => (
												<div key={theme} className="flex items-center gap-2">
													<span className="w-3 h-3 rounded-full bg-primary/80" />
													<span className="capitalize font-medium text-sm">{theme}:</span>
													<code className="bg-muted px-2 py-0.5 rounded text-xs">{variant}</code>
												</div>
											))}
										</div>
									</div>
								)}

								<div className="space-y-3">
									<h3 className="text-sm font-semibold text-muted-foreground">Source</h3>
									<Button variant="outline" className="w-full" asChild>
										<Link
											href={`${REPO_PATH}/tree/main/${iconData.base}/${icon}.${iconData.base}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Github className="w-4 h-4 mr-2" />
											View on GitHub
										</Link>
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
