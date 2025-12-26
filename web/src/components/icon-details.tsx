"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, FileType, Github, Moon, Palette, PaletteIcon, Sun, Type } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner"
import { IconsGrid } from "@/components/icon-grid"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BASE_URL, REPO_PATH } from "@/constants"
import { isClipboardAvailable } from "@/lib/svg-color-utils"
import { formatIconName } from "@/lib/utils"
import type { AuthorData, Icon, IconFile } from "@/types/icons"
import { Carbon } from "./carbon"
import { IconActions } from "./icon-actions"
import { IconCustomizerInline } from "./icon-customizer-inline"
import { MagicCard } from "./magicui/magic-card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"

type RenderVariantFn = (format: string, iconName: string, theme?: "light" | "dark") => React.ReactNode

type IconVariantsSectionProps = {
	title: string
	description: string
	iconElement: React.ReactNode
	aavailableFormats: string[]
	icon: string
	iconData: Icon
	handleCopy: (url: string, variantKey: string, event?: React.MouseEvent) => void
	handleDownload: (event: React.MouseEvent, url: string, filename: string) => Promise<void>
	copiedVariants: Record<string, boolean>
	theme?: "light" | "dark"
	renderVariant: RenderVariantFn
}

function IconVariantsSection({
	title,
	description,
	iconElement,
	aavailableFormats,
	icon,
	iconData,
	theme,
	renderVariant,
}: IconVariantsSectionProps) {
	const iconName = theme && iconData.colors?.[theme] ? iconData.colors[theme] : icon
	return (
		<div>
			<h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
				{iconElement}
				{title}
			</h3>
			<p className="text-sm text-muted-foreground mb-4">{description}</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{aavailableFormats.map((format) => renderVariant(format, iconName, theme))}
			</div>
		</div>
	)
}

type WordmarkSectionProps = {
	iconData: Icon
	icon: string
	aavailableFormats: string[]
	handleCopy: (url: string, variantKey: string, event?: React.MouseEvent) => void
	handleDownload: (event: React.MouseEvent, url: string, filename: string) => Promise<void>
	copiedVariants: Record<string, boolean>
	renderVariant: RenderVariantFn
}

function WordmarkSection({ iconData, aavailableFormats, renderVariant }: WordmarkSectionProps) {
	if (!iconData.wordmark) return null

	return (
		<div>
			<h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
				<Type className="w-4 h-4 text-green-500" />
				Wordmark Variants
			</h3>
			<p className="text-sm text-muted-foreground mb-4">Icon variants that include the brand name. Click to copy URL.</p>
			<div className="space-y-6">
				{iconData.wordmark.light && (
					<div>
						<h4 className="text-md font-medium flex items-center gap-2 mb-3">
							<Sun className="w-4 h-4 text-amber-500" />
							Light Theme Wordmark
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{aavailableFormats.map((format) => {
								if (!iconData.wordmark?.light) return null
								return renderVariant(format, iconData.wordmark.light, "light")
							})}
						</div>
					</div>
				)}
				{iconData.wordmark.dark && (
					<div>
						<h4 className="text-md font-medium flex items-center gap-2 mb-3">
							<Moon className="w-4 h-4 text-indigo-500" />
							Dark Theme Wordmark
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{aavailableFormats.map((format) => {
								if (!iconData.wordmark?.dark) return null
								return renderVariant(format, iconData.wordmark.dark, "dark")
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export type IconDetailsProps = {
	icon: string
	iconData: Icon
	authorData: AuthorData
	allIcons: IconFile
	status?: string
	statusDisplayName?: string
	statusColor?: string
	rejectionReason?: string
}

export function IconDetails({
	icon,
	iconData,
	authorData,
	allIcons,
	status,
	statusDisplayName,
	statusColor,
	rejectionReason,
}: IconDetailsProps) {
	const authorName = authorData.name || authorData.login || ""
	const _iconColorVariants = iconData.colors
	const _iconWordmarkVariants = iconData.wordmark
	const formattedDate = new Date(iconData.update.timestamp).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	type CommunityIconData = Icon & {
		mainIconUrl?: string
		assetUrls?: string[]
	}

	const communityData = iconData as CommunityIconData
	const isCommunityIcon = !!communityData.mainIconUrl || (typeof iconData.base === "string" && iconData.base.startsWith("http"))
	const mainIconUrl = communityData.mainIconUrl || (isCommunityIcon ? iconData.base : null)
	const assetUrls = communityData.assetUrls || []

	const shouldShowBaseIcon = () => {
		if (!iconData.colors) return true

		if (!isCommunityIcon) {
			// For regular icons, check if base icon name matches any variant name
			const darkIconName = iconData.colors.dark
			const lightIconName = iconData.colors.light

			if (icon === darkIconName || icon === lightIconName) {
				// Don't show base icon if it's the same as dark or light variant
				return false
			}
		}

		if (isCommunityIcon && mainIconUrl && assetUrls.length > 0) {
			// For community icons, check if base icon matches any variant
			// Find the actual URLs for dark and light variants
			const darkFilename = iconData.colors.dark
			const lightFilename = iconData.colors.light

			const darkUrl = darkFilename ? assetUrls.find((url: string) => typeof url === "string" && url.includes(darkFilename)) : null
			const lightUrl = lightFilename ? assetUrls.find((url: string) => typeof url === "string" && url.includes(lightFilename)) : null

			if (mainIconUrl === darkUrl || mainIconUrl === lightUrl) {
				// Don't show base icon if it's the same as dark or light variant
				return false
			}
		}

		return true
	}

	const getAvailableFormats = (): string[] => {
		if (isCommunityIcon) {
			if (assetUrls.length > 0) {
				const formats = assetUrls
					.filter((url): url is string => typeof url === "string")
					.map((url: string) => {
						const ext = url.split(".").pop()?.toLowerCase() || "svg"
						return ext === "svg" ? "svg" : ext === "png" ? "png" : "webp"
					})
				// Deduplicate formats to avoid duplicate keys
				return Array.from(new Set(formats))
			}
			if (mainIconUrl) {
				const ext = mainIconUrl.split(".").pop()?.toLowerCase() || "svg"
				return [ext === "svg" ? "svg" : ext === "png" ? "png" : "webp"]
			}
			return ["svg"]
		}
		switch (iconData.base) {
			case "svg":
				return ["svg", "png", "webp"]
			case "png":
				return ["png", "webp"]
			default:
				return [String(iconData.base)]
		}
	}

	const availableFormats = getAvailableFormats()
	const [copiedVariants, _setCopiedVariants] = useState<Record<string, boolean>>({})
	const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null)
	const [copiedImageKey, setCopiedImageKey] = useState<string | null>(null)
	const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
	const [hasGradients, setHasGradients] = useState<boolean | null>(null);

	const launchConfetti = useCallback((originX?: number, originY?: number) => {
		if (typeof confetti !== "function") return

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

	const handleCopyUrl = async (url: string, variantKey: string, event?: React.MouseEvent) => {
		if (!isClipboardAvailable()) {
			toast.error("Clipboard not available", {
				description: "Your browser does not support clipboard operations. Please copy manually.",
			})
			return
		}

		try {
			await navigator.clipboard.writeText(url)
			setCopiedUrlKey(variantKey)
			setTimeout(() => {
				setCopiedUrlKey(null)
			}, 2000)

			if (event) {
				launchConfetti(event.clientX, event.clientY)
			} else {
				launchConfetti()
			}

			toast.success("URL copied", {
				description: "The icon URL has been copied to your clipboard. Ready to use!",
			})
		} catch (error) {
			console.error("Error copying URL:", error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			toast.error("Copy failed", {
				description: `Could not copy URL: ${errorMessage}`,
			})
		}
	}

	const handleCopyImage = async (imageUrl: string, format: string, variantKey: string, event?: React.MouseEvent) => {
		if (!isClipboardAvailable()) {
			toast.error("Clipboard not available", {
				description: "Your browser does not support clipboard operations. Please copy manually.",
			})
			return
		}

		try {
			toast.loading("Copying image...")

			if (format === "svg") {
				const response = await fetch(imageUrl)
				if (!response.ok) {
					throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`)
				}
				const svgText = await response.text()
				if (!svgText || svgText.trim().length === 0) {
					throw new Error("SVG content is empty")
				}

				await navigator.clipboard.writeText(svgText)

				setCopiedImageKey(variantKey)
				setTimeout(() => {
					setCopiedImageKey(null)
				}, 2000)

				if (event) {
					launchConfetti(event.clientX, event.clientY)
				} else {
					launchConfetti()
				}

				toast.dismiss()
				toast.success("SVG Markup Copied", {
					description: "The SVG code has been copied to your clipboard.",
				})
			} else if (format === "png" || format === "webp") {
				const mimeType = `image/${format}`
				const response = await fetch(imageUrl)
				if (!response.ok) {
					throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
				}
				const blob = await response.blob()

				if (!blob || blob.size === 0) {
					throw new Error("Failed to generate image blob or blob is empty")
				}

				await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })])

				setCopiedImageKey(variantKey)
				setTimeout(() => {
					setCopiedImageKey(null)
				}, 2000)

				if (event) {
					launchConfetti(event.clientX, event.clientY)
				} else {
					launchConfetti()
				}

				toast.dismiss()
				toast.success("Image copied", {
					description: `The ${format.toUpperCase()} image has been copied to your clipboard.`,
				})
			} else {
				throw new Error(`Unsupported format for image copy: ${format}`)
			}
		} catch (error) {
			console.error("Copy error:", error)
			toast.dismiss()
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
			toast.error("Copy failed", {
				description: `Could not copy image: ${errorMessage}`,
			})
		}
	}

	const handleDownload = async (event: React.MouseEvent, url: string, filename: string) => {
		event.preventDefault()
		launchConfetti(event.clientX, event.clientY)

		try {
			toast.loading("Preparing download...")
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
			}
			const blob = await response.blob()
			if (!blob || blob.size === 0) {
				throw new Error("Downloaded file is empty")
			}

			const blobUrl = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = blobUrl
			// Sanitize filename
			const sanitizedFilename = filename
				.replace(/[^a-z0-9.-]/gi, "-")
				.replace(/-+/g, "-")
				.replace(/^-+|-+$/g, "")
			link.download = sanitizedFilename || "icon"
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
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
			toast.error("Download failed", {
				description: `There was an error downloading the file: ${errorMessage}`,
			})
		}
	}

	const renderVariant = (format: string, iconName: string, theme?: "light" | "dark") => {
		let imageUrl: string
		let githubUrl: string

		if (isCommunityIcon && mainIconUrl) {
			const formatExt = format === "svg" ? "svg" : format === "png" ? "png" : "webp"

			// Try to find a specific asset URL that matches the requested variant filename
			// This is important because assetUrls contains all variants (base, dark, light)
			let matchingUrl: string | undefined

			if (theme && iconName && iconName !== icon) {
				// If a theme is specified, iconName holds the specific filename for that variant
				matchingUrl = assetUrls.find(
					(url: string) => typeof url === "string" && url.includes(iconName) && url.toLowerCase().endsWith(`.${formatExt}`),
				)
			}

			if (!matchingUrl) {
				// Fallback: find any asset with the matching extension
				matchingUrl = assetUrls.find((url: string) => typeof url === "string" && url.toLowerCase().endsWith(`.${formatExt}`))
			}

			const _variantKey = `${format}-${theme || "default"}`

			imageUrl = matchingUrl || mainIconUrl
			githubUrl = ""
		} else {
			imageUrl = `${BASE_URL}/${format}/${iconName}.${format}`
			githubUrl = `${REPO_PATH}/tree/main/${format}/${iconName}.${format}`
		}

		const variantKey = `${format}-${theme || "default"}`
		const isCopied = copiedVariants[variantKey] || false

		return (
			<TooltipProvider key={variantKey} delayDuration={500}>
				<MagicCard className="p-0 rounded-md">
					<div className="flex flex-col items-center p-4 transition-all">
						<Tooltip>
							<TooltipTrigger asChild>
								<motion.div
									className="relative w-28 h-28 mb-3 ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10 cursor-pointer rounded-xl overflow-hidden group"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={(e) => handleCopyUrl(imageUrl, variantKey, e)}
									aria-label={`Copy ${format.toUpperCase()} URL for ${iconName}${theme ? ` (${theme} theme)` : ""}`}
								>
									<div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-xl z-10 transition-colors" />

									<motion.div
										className="absolute inset-0 bg-primary/10 flex items-center justify-center z-20 rounded-xl"
										initial={{ opacity: 0 }}
										animate={{ opacity: isCopied ? 1 : 0 }}
										transition={{ duration: 0.2 }}
									>
										<motion.div
											initial={{ scale: 0.5, opacity: 0 }}
											animate={{
												scale: isCopied ? 1 : 0.5,
												opacity: isCopied ? 1 : 0,
											}}
											transition={{
												type: "spring",
												stiffness: 300,
												damping: 20,
											}}
										>
											<Check className="w-8 h-8 text-primary" />
										</motion.div>
									</motion.div>

									<Image
										src={imageUrl}
										alt={`${iconName} in ${format} format${theme ? ` (${theme} theme)` : ""}`}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
										loading="eager"
										priority
										className="object-contain p-4"
									/>
								</motion.div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Click to copy direct URL to clipboard</p>
							</TooltipContent>
						</Tooltip>

						<p className="text-sm font-medium">{format.toUpperCase()}</p>

						<IconActions
							imageUrl={imageUrl}
							githubUrl={githubUrl}
							iconName={iconName}
							format={format}
							variantKey={variantKey}
							copiedUrlKey={copiedUrlKey}
							copiedImageKey={copiedImageKey}
							handleDownload={handleDownload}
							handleCopyUrl={handleCopyUrl}
							handleCopyImage={handleCopyImage}
						/>
					</div>
				</MagicCard>
			</TooltipProvider>
		)
	}

	const formatedIconName = formatIconName(icon)

	const getSvgUrl = (): string | null => {
		if (isCommunityIcon && mainIconUrl) {
			if (mainIconUrl.toLowerCase().endsWith(".svg")) {
				return mainIconUrl
			}
			const svgUrl = assetUrls.find((url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg"))
			return svgUrl || null
		}
		if (iconData.base === "svg") {
			const iconName = iconData.colors?.light || icon
			if (iconName) {
				return `${BASE_URL}/svg/${iconName}.svg`
			}
		}
		return null
	}

	const svgUrl = getSvgUrl()

	useEffect(() => {
		if (!svgUrl) {
			setHasGradients(null);
			return;
		}

		const checkForGradients = async () => {
			try {
				const response = await fetch(svgUrl);
				if (!response.ok) {
					setHasGradients(null);
					return;
				}
				const text = await response.text();
				const hasLinearGradient = /<linearGradient[\s\/>]/i.test(text);
				const hasRadialGradient = /<radialGradient[\s\/>]/i.test(text);
				setHasGradients(hasLinearGradient || hasRadialGradient);
			} catch {
				setHasGradients(null);
			}
		};

		checkForGradients();
	}, [svgUrl]);

	const canCustomize =
		svgUrl !== null &&
		availableFormats.includes("svg") &&
		hasGradients === false;

	return (
		<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<div className="lg:col-span-1">
					<Card className="h-full bg-background/50 border shadow-lg">
						<CardHeader className="pb-4">
							<div className="flex flex-col items-center bg-background">
								<div className="relative w-32 h-32 rounded-xl ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10 overflow-hidden flex items-center justify-center p-3">
								<Image
									src={
										isCommunityIcon && mainIconUrl
											? mainIconUrl
											: `${BASE_URL}/${iconData.base}/${icon}.${iconData.base}`
									}
										priority
										width={96}
										height={96}
										placeholder="empty"
										alt={`High quality ${formatedIconName} icon in ${iconData.base.toUpperCase()} format`}
										className="w-full h-full object-contain"
									/>
								</div>
								<CardTitle className="text-2xl font-bold capitalize text-center mb-2">
									<h1>{formatedIconName}</h1>
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<p className="text-sm">
												<span className="font-medium">Updated on:</span> <time dateTime={iconData.update.timestamp}>{formattedDate}</time>
											</p>
										</div>
										<div className="flex items-center gap-2">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium">By:</p>
												<Avatar className="h-6 w-6 border">
													<AvatarImage src={authorData.avatar_url} alt={`${authorName}'s avatar`} />
													<AvatarFallback>{authorName?.slice(0, 1).toUpperCase()}</AvatarFallback>
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
												{!authorData.html_url && <span className="text-sm">{authorName}</span>}
											</div>
										</div>
									</div>
								</div>

								{iconData.categories && iconData.categories.length > 0 && (
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Categories</h3>
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
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Aliases</h3>
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
									<h3 className="text-sm font-semibold text-muted-foreground mb-2">About this icon</h3>
									<div className="text-xs text-muted-foreground space-y-2">
										<p>
											Available in{" "}
											{availableFormats.length > 1
												? `${availableFormats.length} formats (${availableFormats.map((f) => f.toUpperCase()).join(", ")}) `
												: `${availableFormats[0].toUpperCase()} format `}
											with a base format of {iconData.base.toUpperCase()}.
											{iconData.colors && " Includes both light and dark theme variants for better integration with different UI designs."}
											{iconData.wordmark && " Wordmark variants are also available for enhanced branding options."}
										</p>
										<p>
											Perfect for adding to dashboards, app directories, documentation, or anywhere you need the {formatIconName(icon)}{" "}
											logo.
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
							<CardTitle>
								<h2>Icon variants</h2>
							</CardTitle>
							<CardDescription>Click on any icon to copy its URL to your clipboard</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-10">
								{shouldShowBaseIcon() && (
									<IconVariantsSection
										title="Base Icon"
										description="Original icon version"
										iconElement={<FileType className="w-4 h-4 text-blue-500" />}
										aavailableFormats={availableFormats}
										icon={icon}
										iconData={iconData}
										handleCopy={handleCopyUrl}
										handleDownload={handleDownload}
										copiedVariants={copiedVariants}
										renderVariant={renderVariant}
									/>
								)}

								{iconData.colors?.light && (
									<IconVariantsSection
										title="Light theme"
										description="Icon variants optimized for light backgrounds (typically darker icon colors)"
										iconElement={<Sun className="w-4 h-4 text-amber-500" />}
										aavailableFormats={availableFormats}
										icon={icon}
										theme="light"
										iconData={iconData}
										handleCopy={handleCopyUrl}
										handleDownload={handleDownload}
										copiedVariants={copiedVariants}
										renderVariant={renderVariant}
									/>
								)}

								{iconData.colors?.dark && (
									<IconVariantsSection
										title="Dark theme"
										description="Icon variants optimized for dark backgrounds (typically lighter icon colors)"
										iconElement={<Moon className="w-4 h-4 text-indigo-500" />}
										aavailableFormats={availableFormats}
										icon={icon}
										theme="dark"
										iconData={iconData}
										handleCopy={handleCopyUrl}
										handleDownload={handleDownload}
										copiedVariants={copiedVariants}
										renderVariant={renderVariant}
									/>
								)}

								{iconData.wordmark && (
									<WordmarkSection
										iconData={iconData}
										icon={icon}
										aavailableFormats={availableFormats}
										handleCopy={handleCopyUrl}
										handleDownload={handleDownload}
										copiedVariants={copiedVariants}
										renderVariant={renderVariant}
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
								{status && statusDisplayName && statusColor && (
									<div className="space-y-2">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Status</h3>
										<Badge variant="outline" className={statusColor}>
											{statusDisplayName}
										</Badge>
										{status === "rejected" && rejectionReason && (
											<div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary dark:border-primary/20 dark:text-primary">
												<p className="whitespace-pre-line break-words leading-relaxed">Rejected: {rejectionReason}</p>
											</div>
										)}
									</div>
								)}
								<div className="">
									<h3 className="text-sm font-semibold text-muted-foreground mb-2">Base format</h3>
									<div className="flex items-center gap-2">
										<FileType className="w-4 h-4 text-blue-500" />
										<div className="px-3 py-1.5  border border-border rounded-lg text-sm font-medium">{iconData.base.toUpperCase()}</div>
									</div>
								</div>

								<div className="">
									<h3 className="text-sm font-semibold text-muted-foreground mb-2">Available formats</h3>
									<div className="flex flex-wrap gap-2">
										{availableFormats.map((format: string) => (
											<div key={format} className="px-3 py-1.5  border border-border rounded-lg text-xs font-medium">
												{format.toUpperCase()}
											</div>
										))}
									</div>
								</div>

								{iconData.colors && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Color variants</h3>
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

								{!isCommunityIcon && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
										<Button variant="outline" className="w-full" asChild>
											<Link href={`${REPO_PATH}/blob/main/meta/${icon}.json`} target="_blank" rel="noopener noreferrer">
												<Github className="w-4 h-4 mr-2" />
												View on GitHub
											</Link>
										</Button>
									</div>
								)}

								{canCustomize && svgUrl && (
									<>
										<Separator />
										<AnimatePresence mode="wait">
											{isCustomizerOpen ? (
												<IconCustomizerInline
													key="customizer"
													svgUrl={svgUrl}
													iconName={formatedIconName}
													onClose={() => setIsCustomizerOpen(false)}
												/>
											) : (
												<motion.div
													key="button"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													transition={{ duration: 0.2 }}
													exit={{ opacity: 0 }}
													className="relative"
												>
													<Button onClick={() => setIsCustomizerOpen(true)} variant="outline" className="w-full" size="sm">
														<Palette className="w-4 h-4 mr-2" />
														Customize Icon
													</Button>
													<Badge
														variant="default"
														className="absolute -top-2 -right-2 h-5 px-1.5 text-[10px] font-bold bg-primary text-primary-foreground shadow-md"
													>
														NEW
													</Badge>
												</motion.div>
											)}
										</AnimatePresence>
									</>
								)}
							</div>
						</CardContent>
						<Carbon />
					</Card>
				</div>
			</div>
			{iconData.categories &&
				iconData.categories.length > 0 &&
				(() => {
					const MAX_RELATED_ICONS = 16
					const currentCategories = iconData.categories || []

					const relatedIconsWithScore = Object.entries(allIcons)
						.map(([name, data]) => {
							if (name === icon) return null // Exclude the current icon

							const otherCategories = data.categories || []
							const commonCategories = currentCategories.filter((cat) => otherCategories.includes(cat))
							const score = commonCategories.length

							return score > 0 ? { name, data, score } : null
						})
						.filter((item): item is { name: string; data: Icon; score: number } => item !== null) // Type guard
						.sort((a, b) => b.score - a.score) // Sort by score DESC

					const topRelatedIcons = relatedIconsWithScore.slice(0, MAX_RELATED_ICONS)

					const viewMoreUrl = `/icons?${currentCategories.map((cat) => `category=${encodeURIComponent(cat)}`).join("&")}`

					if (topRelatedIcons.length === 0) return null

					return (
						<section className="container mx-auto mt-12" aria-labelledby="related-icons-title">
							<Card className="bg-background/50 border shadow-lg">
								<CardHeader>
									<CardTitle>
										<h2 id="related-icons-title">Related Icons</h2>
									</CardTitle>
									<CardDescription>
										Other icons from {currentCategories.map((cat) => cat.replace(/-/g, " ")).join(", ")} categories
									</CardDescription>
								</CardHeader>
								<CardContent>
									<IconsGrid filteredIcons={topRelatedIcons} matchedAliases={{}} />
									{relatedIconsWithScore.length > MAX_RELATED_ICONS && (
										<div className="mt-6 text-center">
											<Button
												asChild
												variant="link"
												className="text-muted-foreground hover:text-primary transition-colors duration-200 hover:no-underline"
											>
												<Link href={viewMoreUrl} className="no-underline">
													View all related icons
													<ArrowRight className="ml-2 h-4 w-4" />
												</Link>
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						</section>
					)
				})()}
		</main>
	)
}
