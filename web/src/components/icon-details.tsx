"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BASE_URL, REPO_PATH } from "@/constants"
import type { AuthorData, Icon } from "@/types/icons"
import confetti from "canvas-confetti"
import { motion } from "framer-motion"
import { Check, Copy, Download, FileType, Github, Moon, PaletteIcon, Sun, Type } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Carbon } from "./carbon"
import { MagicCard } from "./magicui/magic-card"
import { Badge } from "./ui/badge"

export type IconDetailsProps = {
	icon: string
	iconData: Icon
	authorData: AuthorData
}

function IconVariant({ 
	format, 
	iconName, 
	theme, 
	isWordmark = false, 
	iconData, 
	onCopy, 
	onDownload, 
	copiedVariants 
}: { 
	format: string 
	iconName: string
	theme?: "light" | "dark"
	isWordmark?: boolean
	iconData: Icon
	onCopy: (url: string, variantKey: string, event?: React.MouseEvent) => void
	onDownload: (event: React.MouseEvent, url: string, filename: string) => void
	copiedVariants: Record<string, boolean>
}) {
	let variantName = '';
	
	if (isWordmark) {
		if (theme && iconData.wordmark && typeof iconData.wordmark !== 'string') {
			variantName = iconData.wordmark[theme] || `${iconName}_wordmark_${theme}`;
		} else if (iconData.wordmark && typeof iconData.wordmark === 'string') {
			variantName = iconData.wordmark;
		} else {
			variantName = `${iconName}_wordmark`;
		}
	} else {
		if (theme && iconData.colors) {
			variantName = iconData.colors[theme] || `${iconName}_${theme}`;
		} else {
			variantName = iconName;
		}
	}
	
	const imageUrl = `${BASE_URL}/${format}/${variantName}.${format}`;
	const githubUrl = `${REPO_PATH}/tree/main/${format}/${variantName}.${format}`;
	const variantKey = `${format}-${theme || "default"}${isWordmark ? "-wordmark" : ""}`;
	const isCopied = copiedVariants[variantKey] || false;
	const btnCopied = copiedVariants[`btn-${variantKey}`] || false;

	return (
		<TooltipProvider delayDuration={500}>
			<MagicCard className="p-0 rounded-md">
				<div className="flex flex-col items-center p-4 transition-all">
					<Tooltip>
						<TooltipTrigger asChild>
							<motion.div
								className="relative w-28 h-28 mb-3 cursor-pointer rounded-xl overflow-hidden group"
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={(e) => onCopy(imageUrl, variantKey, e)}
							>
								<div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-xl z-10 transition-colors" />

								<motion.div
									className="absolute inset-0 bg-primary/10 flex items-center justify-center z-20 rounded-xl"
									initial={{ opacity: 0 }}
									animate={{ opacity: isCopied ? 1 : 0 }}
									transition={{ duration: 0.2 }}
								>
									{isCopied && (
										<motion.div
											initial={{ scale: 0.5, opacity: 0 }}
											animate={{
												scale: 1,
												opacity: 1,
											}}
											transition={{
												type: "spring",
												stiffness: 300,
												damping: 20,
											}}
										>
											<Check className="w-8 h-8 text-primary" />
										</motion.div>
									)}
								</motion.div>

								<Image
									src={imageUrl}
									alt={`${iconName} in ${format} format${theme ? ` (${theme} theme)` : ""}`}
									fill
									className="object-contain p-4"
								/>
							</motion.div>
						</TooltipTrigger>
						<TooltipContent>
							<p>Click to copy direct URL to clipboard</p>
						</TooltipContent>
					</Tooltip>

					<p className="text-sm font-medium">{format.toUpperCase()}</p>

					<div className="flex gap-2 mt-3 w-full justify-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-lg cursor-pointer"
									onClick={(e) => onDownload(e, imageUrl, `${iconName}.${format}`)}
								>
									<Download className="w-4 h-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Download icon file</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-lg cursor-pointer"
									onClick={(e) => onCopy(imageUrl, `btn-${variantKey}`, e)}
								>
									{btnCopied && <Check className="w-4 h-4 text-green-500" />}
									{!btnCopied && <Copy className="w-4 h-4" />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Copy direct URL to clipboard</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
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
			</MagicCard>
		</TooltipProvider>
	)
}

function IconVariantsSection({ 
	availableFormats, 
	icon, 
	theme, 
	isWordmark = false, 
	iconData, 
	handleCopy, 
	handleDownload, 
	copiedVariants, 
	title,
	iconElement
}: {
	availableFormats: string[]
	icon: string
	theme?: "light" | "dark"
	isWordmark?: boolean
	iconData: Icon
	handleCopy: (url: string, variantKey: string, event?: React.MouseEvent) => void
	handleDownload: (event: React.MouseEvent, url: string, filename: string) => void
	copiedVariants: Record<string, boolean>
	title: string
	iconElement: React.ReactNode
}) {
	return (
		<div>
			<h3 className="text-lg font-semibold flex items-center gap-2">
				{iconElement}
				{title}
			</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 rounded-lg">
				{availableFormats.map((format) => (
					<IconVariant 
						key={format}
						format={format} 
						iconName={icon} 
						theme={theme} 
						isWordmark={isWordmark} 
						iconData={iconData}
						onCopy={handleCopy}
						onDownload={handleDownload}
						copiedVariants={copiedVariants}
					/>
				))}
			</div>
		</div>
	)
}

function WordmarkSection({ 
	iconData, 
	icon, 
	availableFormats, 
	handleCopy, 
	handleDownload, 
	copiedVariants 
}: {
	iconData: Icon
	icon: string
	availableFormats: string[]
	handleCopy: (url: string, variantKey: string, event?: React.MouseEvent) => void
	handleDownload: (event: React.MouseEvent, url: string, filename: string) => void
	copiedVariants: Record<string, boolean>
}) {
	if (!iconData.wordmark) return null;

	const isStringWordmark = typeof iconData.wordmark === 'string';
	const hasLightDarkVariants = !isStringWordmark && (iconData.wordmark.light || iconData.wordmark.dark);
	
	return (
		<div>
			<h3 className="text-lg font-semibold flex items-center gap-2">
				<Type className="w-4 h-4 text-green-500" />
				Wordmark variants
			</h3>
			
			{(isStringWordmark || !hasLightDarkVariants) && (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 rounded-lg">
					{availableFormats.map((format) => (
						<IconVariant 
							key={format}
							format={format} 
							iconName={icon} 
							isWordmark={true} 
							iconData={iconData}
							onCopy={handleCopy}
							onDownload={handleDownload}
							copiedVariants={copiedVariants}
						/>
					))}
				</div>
			)}
			
			{hasLightDarkVariants && (
				<div className="space-y-6">
					{iconData.wordmark.light && (
						<div>
							<h4 className="text-md font-medium flex items-center gap-2 ml-4 mb-2">
								<Sun className="w-3 h-3 text-amber-500" />
								Light
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 rounded-lg">
								{availableFormats.map((format) => (
									<IconVariant 
										key={format}
										format={format} 
										iconName={icon} 
										theme="light" 
										isWordmark={true} 
										iconData={iconData}
										onCopy={handleCopy}
										onDownload={handleDownload}
										copiedVariants={copiedVariants}
									/>
								))}
							</div>
						</div>
					)}
					
					{iconData.wordmark.dark && (
						<div>
							<h4 className="text-md font-medium flex items-center gap-2 ml-4 mb-2">
								<Moon className="w-3 h-3 text-indigo-500" />
								Dark
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 rounded-lg">
								{availableFormats.map((format) => (
									<IconVariant 
										key={format}
										format={format} 
										iconName={icon} 
										theme="dark" 
										isWordmark={true} 
										iconData={iconData}
										onCopy={handleCopy}
										onDownload={handleDownload}
										copiedVariants={copiedVariants}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export function IconDetails({ icon, iconData, authorData }: IconDetailsProps) {
	const authorName = authorData.name || authorData.login || ""
	const iconColorVariants = iconData.colors
	const iconWordmarkVariants = iconData.wordmark
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

	const launchConfetti = useCallback((originX?: number, originY?: number) => {
		const defaults = {
			startVelocity: 15,
			spread: 180,
			ticks: 50,
			zIndex: 20,
			disableForReducedMotion: true,
			colors: ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1bd", "#f9bec7"],
		}

		if (originX !== undefined && originY !== undefined) {
			confetti({
				...defaults,
				particleCount: 50,
				origin: {
					x: originX / window.innerWidth,
					y: originY / window.innerHeight,
				},
			})
		} else {
			confetti({
				...defaults,
				particleCount: 50,
				origin: { x: 0.5, y: 0.5 },
			})
		}
	}, [])

	const handleCopy = (url: string, variantKey: string, event?: React.MouseEvent) => {
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

		if (event) {
			launchConfetti(event.clientX, event.clientY)
		} else {
			launchConfetti()
		}

		toast.success("URL copied", {
			description: "The icon URL has been copied to your clipboard. Ready to use!",
		})
	}

	const handleDownload = async (event: React.MouseEvent, url: string, filename: string) => {
		event.preventDefault()
		launchConfetti(event.clientX, event.clientY)

		try {
			toast.loading("Preparing download...")
			const response = await fetch(url)
			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = blobUrl
			link.download = filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

			toast.dismiss()
			toast.success("Download started", {
				description: "Your icon file is being downloaded and will be saved to your device.",
			})
		} catch (error) {
			console.error("Download error:", error)
			toast.dismiss()
			toast.error("Download failed", {
				description: "There was an error downloading the file. Please try again.",
			})
		}
	}

	return (
		<div className="container mx-auto pt-12 pb-14">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<div className="lg:col-span-1">
					<Card className="h-full bg-background/50 border shadow-lg">
						<CardHeader className="pb-4">
							<div className="flex flex-col items-center">
								<div className="relative w-32 h-32  rounded-xl overflow-hidden border flex items-center justify-center p-3 ">
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
							<div className="space-y-4">
								<div>
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
													<AvatarFallback>{authorName ? authorName.slice(0, 2).toUpperCase() : "??"}</AvatarFallback>
												</Avatar>
												{authorData.html_url && (
													<Link
														href={authorData.html_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline text-sm"
													>
														{authorName}
													</Link>
												)}
												{!authorData.html_url && (
													<span className="text-sm">{authorName}</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{iconData.categories && iconData.categories.length > 0 && (
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground">Categories</h3>
										<div className="flex flex-wrap gap-2">
											{iconData.categories.map((category) => (
												<Link key={category} href={`/icons?category=${encodeURIComponent(category)}`} className="cursor-pointer">
													<Badge
														variant="outline"
														className="inline-flex items-center border border-primary/20 hover:border-primary px-2.5 py-0.5 text-sm"
													>
														{category
															.split("-")
															.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
															.join(" ")}
													</Badge>
												</Link>
											))}
										</div>
									</div>
								)}

								{iconData.aliases && iconData.aliases.length > 0 && (
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground">Aliases</h3>
										<div className="flex flex-wrap gap-2">
											{iconData.aliases.map((alias) => (
												<Badge
													variant="outline"
													key={alias}
													className="inline-flex items-center px-2.5 py-1 text-xs"
													title={`This icon can also be found by searching for "${alias}"`}
												>
													{alias}
												</Badge>
											))}
										</div>
									</div>
								)}

								<div>
									<h3 className="text-sm font-semibold text-muted-foreground">About this icon</h3>
									<div className="text-xs text-muted-foreground space-y-2">
										<p>
											Available in{" "}
											{availableFormats.length > 1 && (
												`${availableFormats.length} formats (${availableFormats.map((f) => f.toUpperCase()).join(", ")})`
											)}
											{availableFormats.length === 1 && (
												`${availableFormats[0].toUpperCase()} format`
											)}{" "}
											with a base format of {iconData.base.toUpperCase()}.
											{iconData.colors && " Includes both light and dark theme variants for better integration with different UI designs."}
											{iconData.wordmark && " Wordmark variants are also available for enhanced branding options."}
										</p>
										<p>
											Use the {icon} icon in your web applications, dashboards, or documentation to enhance visual communication and user
											experience.
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="lg:col-span-2">
					<Card className="h-full bg-background/50 shadow-lg">
						<CardHeader>
							<CardTitle>Icon variants</CardTitle>
							<CardDescription>Click on any icon to copy its URL to your clipboard</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-10">
								<IconVariantsSection
									availableFormats={availableFormats}
									icon={icon}
									iconData={iconData}
									handleCopy={handleCopy}
									handleDownload={handleDownload}
									copiedVariants={copiedVariants}
									title="Default"
									iconElement={<FileType className="w-4 h-4 text-blue-500" />}
								/>
								
								{iconData.colors && (
									<>
										<IconVariantsSection
											availableFormats={availableFormats}
											icon={icon}
											theme="light"
											iconData={iconData}
											handleCopy={handleCopy}
											handleDownload={handleDownload}
											copiedVariants={copiedVariants}
											title="Light theme"
											iconElement={<Sun className="w-4 h-4 text-amber-500" />}
										/>
										
										<IconVariantsSection
											availableFormats={availableFormats}
											icon={icon}
											theme="dark"
											iconData={iconData}
											handleCopy={handleCopy}
											handleDownload={handleDownload}
											copiedVariants={copiedVariants}
											title="Dark theme"
											iconElement={<Moon className="w-4 h-4 text-indigo-500" />}
										/>
									</>
								)}
								
								{iconData.wordmark && (
									<WordmarkSection
										iconData={iconData}
										icon={icon}
										availableFormats={availableFormats}
										handleCopy={handleCopy}
										handleDownload={handleDownload}
										copiedVariants={copiedVariants}
									/>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="lg:col-span-1">
					<Card className="h-full bg-background/50 border shadow-lg">
						<CardHeader>
							<CardTitle>Technical details</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div className="">
									<h3 className="text-sm font-semibold text-muted-foreground">Base format</h3>
									<div className="flex items-center gap-2">
										<FileType className="w-4 h-4 text-blue-500" />
										<div className="px-3 py-1.5  border border-border rounded-lg text-sm font-medium">{iconData.base.toUpperCase()}</div>
									</div>
								</div>

								<div className="">
									<h3 className="text-sm font-semibold text-muted-foreground">Available formats</h3>
									<div className="flex flex-wrap gap-2">
										{availableFormats.map((format) => (
											<div key={format} className="px-3 py-1.5  border border-border rounded-lg text-xs font-medium">
												{format.toUpperCase()}
											</div>
										))}
									</div>
								</div>

								{iconData.colors && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground">Color variants</h3>
										<div className="space-y-2">
											{Object.entries(iconData.colors).map(([theme, variant]) => (
												<div key={theme} className="flex items-center gap-2">
													<PaletteIcon className="w-4 h-4 text-purple-500" />
													<span className="capitalize font-medium text-sm">{theme}:</span>
													<code className=" border border-border px-2 py-0.5 rounded-lg text-xs">{variant}</code>
												</div>
											))}
										</div>
									</div>
								)}

								{iconData.wordmark && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground">Wordmark variants</h3>
										<div className="space-y-2">
											{iconData.wordmark.light && (
												<div className="flex items-center gap-2">
													<Type className="w-4 h-4 text-green-500" />
													<span className="capitalize font-medium text-sm">Light:</span>
													<code className="border border-border px-2 py-0.5 rounded-lg text-xs">{iconData.wordmark.light}</code>
												</div>
											)}
											{iconData.wordmark.dark && (
												<div className="flex items-center gap-2">
													<Type className="w-4 h-4 text-green-500" />
													<span className="capitalize font-medium text-sm">Dark:</span>
													<code className="border border-border px-2 py-0.5 rounded-lg text-xs">{iconData.wordmark.dark}</code>
												</div>
											)}
										</div>
									</div>
								)}

								<div className="">
									<h3 className="text-sm font-semibold text-muted-foreground">Source</h3>
									<Button variant="outline" className="w-full" asChild>
										<Link href={`${REPO_PATH}/blob/main/meta/${icon}.json`} target="_blank" rel="noopener noreferrer">
											<Github className="w-4 h-4 mr-2" />
											View on GitHub
										</Link>
									</Button>
								</div>
							</div>
						</CardContent>
						<Carbon />
					</Card>
				</div>
			</div>
		</div>
	)
}
