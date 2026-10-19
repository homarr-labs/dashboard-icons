"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ExternalLink, FileType, Github, Moon, Palette, PaletteIcon, Sun, Type } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { IconsGrid } from "@/components/icon-grid"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UnoptimizedImage } from "@/components/unoptimized-image"
import { BASE_URL, EXTERNAL_SOURCES, type ExternalSourceId, REPO_PATH, SIMPLE_ICONS_DISCLAIMER_URL } from "@/constants"
import {
	canResolveExternalIconUrl,
	getExternalIconPreviewUrl,
	getExternalToneUrlKey,
	resolveExternalIconUrl,
} from "@/lib/external-icon-urls"
import { isIconAssetUrl } from "@/lib/icon-url"
import {
	buildIconAltText,
	getIconImageVariant,
	getIconVariantLabel,
	getToneDescription,
	getToneEntries,
	getToneLabel,
	ICON_TONES,
	type IconImageVariant,
	type IconTone,
	TONE_BACKGROUND,
	TONE_TITLE,
} from "@/lib/icon-variant-text"
import type { NativeIconVariant } from "@/lib/icons/files"
import { buildIconUrl } from "@/lib/icons/urls"
import { customVariantTone, variantToneClass } from "@/lib/icons/variants"
import { getLobehubVariants, getLobehubVariantUrlKey, type LobehubVariant } from "@/lib/lobehub-variants"
import { variantKind } from "@/lib/submission-variants"
import { isClipboardAvailable } from "@/lib/svg-color-utils"
import { cn, formatIconName } from "@/lib/utils"
import type { AuthorData, ExternalIcon, Icon } from "@/types/icons"
import { Carbon } from "./carbon"
import { IconActions } from "./icon-actions"
import { IconCustomizerInline } from "./icon-customizer-inline"
import { MagicCard } from "./magicui/magic-card"
import { Badge } from "./ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb"
import { Separator } from "./ui/separator"

type RenderVariantFn = (format: string, iconName: string, variant: IconImageVariant) => React.ReactNode

const COPY_SUPPORTED_FORMATS = new Set(["svg", "png", "webp"])

const TONE_ICON: Record<IconTone, React.ReactNode> = {
	light: <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />,
	dark: <Moon className="w-4 h-4 text-indigo-500" aria-hidden="true" />,
}

const LINK_TOUCH_TARGET = "inline-flex min-h-11 min-w-11 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring"

type IconVariantsSectionProps = {
	title: string
	description: string
	iconElement: React.ReactNode
	availableFormats: string[]
	iconName: string
	variant: IconImageVariant
	renderVariant: RenderVariantFn
	children?: React.ReactNode
}

function IconVariantsSection({
	title,
	description,
	iconElement,
	availableFormats,
	iconName,
	variant,
	renderVariant,
	children,
}: IconVariantsSectionProps) {
	return (
		<section id={variant.kind === "named" ? `variant-${variant.name}` : undefined} className="scroll-mt-24">
			<h3 className="text-lg font-semibold flex items-center gap-2 mb-1 text-balance break-words">
				{iconElement}
				<span className="min-w-0 break-words">{title}</span>
			</h3>
			<p className="text-sm text-muted-foreground mb-4">{description}</p>
			{children}
			<MagicCardPointerProvider className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{availableFormats.map((format) => renderVariant(format, iconName, variant))}
			</MagicCardPointerProvider>
		</section>
	)
}

type NamedVariantSectionProps = {
	externalIcon: ExternalIcon
	variant: LobehubVariant
	renderVariant: RenderVariantFn
}

function NamedVariantSection({ externalIcon, variant, renderVariant }: NamedVariantSectionProps) {
	const [selectedTone, setSelectedTone] = useState<IconTone>("dark")
	const tones = ICON_TONES.filter((tone) =>
		["png", "webp"].some((format) => getLobehubVariantUrlKey(externalIcon, format, variant.name, tone)),
	)
	let activeTone: IconTone | undefined = tones[0]
	if (tones.includes(selectedTone)) activeTone = selectedTone
	const formats = ["svg", "png", "webp"].filter((format) => getLobehubVariantUrlKey(externalIcon, format, variant.name, activeTone))
	const renderNamedVariant: RenderVariantFn = (format, fileName) => {
		let tone: IconTone | undefined
		if (format !== "svg") tone = activeTone
		let downloadName = fileName
		if (tone) downloadName += `-${tone}`
		return renderVariant(format, downloadName, { kind: "named", name: variant.name, label: variant.label, tone })
	}

	return (
		<IconVariantsSection
			title={variant.label}
			description={variant.description}
			iconElement={<Type className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
			availableFormats={formats}
			iconName={`${externalIcon.slug}-${variant.name}`}
			variant={{ kind: "named", name: variant.name, label: variant.label }}
			renderVariant={renderNamedVariant}
		>
			{tones.length > 0 && (
				<fieldset aria-label={`${variant.label} raster background`} className="space-y-2 mb-4">
					<legend className="text-sm font-medium">PNG and WebP background</legend>
					<div className="flex flex-wrap gap-2">
						{tones.map((tone) => (
							<Button
								key={tone}
								variant={activeTone === tone ? "secondary" : "outline"}
								className="min-h-11"
								aria-pressed={activeTone === tone}
								onClick={() => setSelectedTone(tone)}
							>
								Use {tone === "light" ? "dark" : "light"} background
							</Button>
						))}
					</div>
					{activeTone && <p className="text-sm text-muted-foreground">{getToneDescription(activeTone, false)} SVG artwork is unchanged.</p>}
				</fieldset>
			)}
		</IconVariantsSection>
	)
}

type WordmarkSectionProps = {
	iconData: Icon
	availableFormats: string[]
	renderVariant: RenderVariantFn
}

function WordmarkSection({ iconData, availableFormats, renderVariant }: WordmarkSectionProps) {
	if (!iconData.wordmark) return null

	return (
		<section>
			<h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
				<Type className="w-4 h-4 text-green-500" aria-hidden="true" />
				Wordmark
			</h3>
			<p className="text-sm text-muted-foreground mb-4">The logo with the brand name as text.</p>
			<div className="space-y-6">
				{iconData.wordmark.default && (
					<div>
						<h4 className="text-md font-medium flex items-center gap-2 mb-1">
							<Palette className="w-4 h-4 text-pink-500" />
							Wordmark
						</h4>
						<p className="text-sm text-muted-foreground mb-3">Colour brand name for any background</p>
						<MagicCardPointerProvider className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{availableFormats.map((format) => {
								if (!iconData.wordmark?.default) return null
								return renderVariant(format, iconData.wordmark.default, { kind: "wordmark", tone: "default" })
							})}
						</MagicCardPointerProvider>
					</div>
				)}
				{getToneEntries(iconData.wordmark).map(({ tone, fileName }) => (
					<div key={tone}>
						<h4 className="text-md font-medium flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
							{TONE_ICON[tone]}
							{TONE_TITLE[tone]} wordmark <span className="font-normal text-muted-foreground">for {TONE_BACKGROUND[tone]}</span>
						</h4>
						<MagicCardPointerProvider className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{availableFormats.map((format) => renderVariant(format, fileName, { kind: "wordmark", tone }))}
						</MagicCardPointerProvider>
					</div>
				))}
			</div>
		</section>
	)
}

type VariantFileRowProps = {
	icon: React.ReactNode
	tone: IconTone
	fileName: string
}

function VariantFileRow({ icon, tone, fileName }: VariantFileRowProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
			{icon}
			<span className="font-medium text-sm">{TONE_TITLE[tone]}:</span>
			<code className="min-w-0 break-all border border-border px-2 py-0.5 rounded-lg text-xs">{fileName}</code>
			<span className="basis-full pl-6 text-xs text-muted-foreground">For {TONE_BACKGROUND[tone]}</span>
		</div>
	)
}

export type RelatedIcon = {
	name: string
	data: Icon
}

export type IconDetailsBreadcrumbItem = {
	label: string
	href?: string
}

export type IconDetailsProps = {
	icon: string
	iconData: Icon
	nativeVariants?: NativeIconVariant[]
	authorData: AuthorData
	relatedIcons?: RelatedIcon[]
	relatedCategories?: string[]
	status?: string
	statusDisplayName?: string
	statusColor?: string
	rejectionReason?: string
	externalIcon?: ExternalIcon
	breadcrumbItems?: IconDetailsBreadcrumbItem[]
	relatedLinks?: React.ReactNode
	nameRelatedLinks?: React.ReactNode
	externalContent?: React.ReactNode
	externalBrandColor?: string
}

export function IconDetails({
	icon,
	iconData,
	nativeVariants,
	authorData,
	relatedIcons = [],
	relatedCategories = [],
	status,
	statusDisplayName,
	statusColor,
	rejectionReason,
	externalIcon,
	breadcrumbItems,
	relatedLinks,
	nameRelatedLinks,
	externalContent,
	externalBrandColor,
}: IconDetailsProps) {
	const authorName = authorData.name || authorData.login || ""
	const _iconColorVariants = iconData.colors
	const _iconWordmarkVariants = iconData.wordmark
	const updateDate = new Date(iconData.update.timestamp)
	const hasUpdateDate = Number.isFinite(updateDate.getTime()) && updateDate.getUTCFullYear() > 1970
	const formattedDate = updateDate.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	const isExternalIcon = !!externalIcon
	const isSimpleIcons = externalIcon?.source === "simpleicons"
	const externalSourceConfig = externalIcon ? EXTERNAL_SOURCES[externalIcon.source as ExternalSourceId] : undefined
	const externalPreviewUrl = externalIcon ? getExternalIconPreviewUrl(externalIcon) : null
	const iconDisplayName = externalIcon?.name ?? formatIconName(icon, { capitalize: true, aliases: iconData.aliases })
	const hasMonochromeTones = externalSourceConfig?.monochromeTones ?? false
	const namedVariants = useMemo(() => {
		if (!externalIcon) return []
		return getLobehubVariants(externalIcon)
	}, [externalIcon])

	type CommunityIconData = Icon & {
		mainIconUrl?: string
		assetUrls?: string[]
	}

	const communityData = iconData as CommunityIconData
	const isCommunityIcon = !isExternalIcon && (!!communityData.mainIconUrl || isIconAssetUrl(iconData.base))
	const mainIconUrl = communityData.mainIconUrl || (isCommunityIcon ? iconData.base : null)
	const assetUrls = communityData.assetUrls || []

	const nativeBase = nativeVariants?.find((variant) => variant.key === "default")
	const nativeHeroFormat = nativeBase?.formats.find((format) => format === iconData.base) ?? nativeBase?.formats[0]
	const nativeHeroTone = nativeBase?.keys.map((key) => variantToneClass({ ...nativeBase, key })).find(Boolean)
	let heroImageUrl = externalPreviewUrl ?? mainIconUrl ?? `${BASE_URL}/${iconData.base}/${icon}.${iconData.base}`
	if (nativeVariants) heroImageUrl = nativeBase && nativeHeroFormat ? buildIconUrl(nativeBase.stem, nativeHeroFormat) : ""

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

	const toneEntries = getToneEntries(iconData.colors)

	const getHeroFormat = () => {
		if (nativeVariants) return nativeHeroFormat
		if (!isIconAssetUrl(iconData.base)) return iconData.base
		const extension = iconData.base.split("?")[0].split(".").pop()?.toLowerCase()
		if (extension && COPY_SUPPORTED_FORMATS.has(extension)) return extension
		return undefined
	}

	const getAvailableFormats = (): string[] => {
		if (nativeVariants) return [...new Set(nativeVariants.flatMap((variant) => variant.formats))]
		if (isExternalIcon && externalIcon) {
			return (externalIcon.formats ?? []).filter((f) => COPY_SUPPORTED_FORMATS.has(f))
		}
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
	const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null)
	const [copiedImageKey, setCopiedImageKey] = useState<string | null>(null)
	const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
	const [selectedVariant, setSelectedVariant] = useState<string>("base")

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
			const copyableUrl = url.startsWith("/") ? new URL(url, window.location.origin).href : url
			await navigator.clipboard.writeText(copyableUrl)
			setCopiedUrlKey(variantKey)
			posthog.capture("icon_url_copied", {
				icon_name: icon,
				variant: variantKey,
				is_external: isExternalIcon,
			})
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

				posthog.capture("icon_image_copied", {
					icon_name: icon,
					format: "svg",
					variant: variantKey,
					is_external: isExternalIcon,
				})
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

				posthog.capture("icon_image_copied", {
					icon_name: icon,
					format,
					variant: variantKey,
					is_external: isExternalIcon,
				})
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
			const sanitizedFilename = filename
				.replace(/[^a-z0-9.-]/gi, "-")
				.replace(/-+/g, "-")
				.replace(/^-+|-+$/g, "")
			link.download = sanitizedFilename || "icon"
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

			const format = filename.split(".").pop() || "unknown"
			posthog.capture("icon_downloaded", {
				icon_name: icon,
				format,
				is_external: isExternalIcon,
			})

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

	const renderVariant = (format: string, iconName: string, variant: IconImageVariant) => {
		let imageUrl: string
		let githubUrl: string
		let theme: IconTone | undefined
		if (variant.kind === "tone") theme = variant.tone
		if (variant.kind === "named") theme = variant.tone
		if (variant.kind === "wordmark" && variant.tone !== "default") theme = variant.tone
		if (variant.kind === "custom") theme = customVariantTone(variant.name)
		const nativeVariant = nativeVariants?.find((item) => item.stem === iconName)
		const previewTone = nativeVariant?.keys.map((key) => variantToneClass({ ...nativeVariant, key })).find(Boolean)

		if (isExternalIcon && externalIcon) {
			let key: string | null = format
			if (variant.kind === "named") key = getLobehubVariantUrlKey(externalIcon, format, variant.name, theme)
			else if (theme) key = getExternalToneUrlKey(externalIcon, format, theme)
			else if (!externalIcon.formats?.includes(format)) key = null
			if (!key || !canResolveExternalIconUrl(externalIcon, key)) return null
			imageUrl = resolveExternalIconUrl(externalIcon, key)
			githubUrl = ""
		} else if (isCommunityIcon && mainIconUrl) {
			let matchingUrl: string | undefined
			if (variant.kind === "base") matchingUrl = mainIconUrl
			else matchingUrl = assetUrls.find((url) => new URL(url).pathname.endsWith(`/${encodeURIComponent(iconName)}`))
			if (!matchingUrl || !new URL(matchingUrl).pathname.toLowerCase().endsWith(`.${format}`)) return null
			imageUrl = matchingUrl
			githubUrl = ""
		} else {
			if (nativeVariants && !nativeVariant?.formats.some((available) => available === format)) return null
			imageUrl = `${BASE_URL}/${format}/${iconName}.${format}`
			githubUrl = `${REPO_PATH}/tree/main/${format}/${iconName}.${format}`
		}

		let variantKey = `${format}-${theme || "default"}`
		if (variant.kind === "wordmark") variantKey = `${format}-wordmark-${variant.tone}`
		if (variant.kind === "named") variantKey = `${format}-${variant.name}-${theme || "default"}`
		if (variant.kind === "custom") variantKey = `${format}-custom-${variant.name}`
		if (nativeVariant) variantKey = `${format}-${iconName}`
		const altText = buildIconAltText(iconDisplayName, variant, format)
		let tileBackground = "bg-primary/15 dark:bg-secondary/10"
		if (variant.kind === "named") tileBackground = "bg-white"
		if (theme === "light") tileBackground = "bg-zinc-950"
		if (theme === "dark") tileBackground = "bg-white"

		return (
			<TooltipProvider key={variantKey} delayDuration={500}>
				<MagicCard className="min-w-0 p-0 rounded-md">
					<figure className="flex min-w-0 flex-col items-center p-4">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className={cn(
										"relative flex h-28 w-full max-w-56 items-center justify-center mb-3 ring-1 ring-border cursor-pointer rounded-xl overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
										previewTone || tileBackground,
									)}
									onClick={(e) => handleCopyUrl(imageUrl, variantKey, e)}
									aria-label={`Copy URL for ${altText}`}
								>
									<div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-xl z-10 transition-colors" />

									<UnoptimizedImage src={imageUrl} alt={altText} width={88} height={88} className="h-full w-full object-contain p-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Click to copy direct URL to clipboard</p>
							</TooltipContent>
						</Tooltip>

						<figcaption className="w-full text-center text-sm">
							<span className="font-medium">{format === "webp" ? "WebP" : format.toUpperCase()}</span>
							{nativeVariant && (
								<code className="mt-1 block break-all text-sm text-muted-foreground">
									{iconName}.{format}
								</code>
							)}
						</figcaption>

						<IconActions
							imageUrl={imageUrl}
							githubUrl={githubUrl}
							iconName={iconName}
							label={altText}
							format={format}
							variantKey={variantKey}
							copiedUrlKey={copiedUrlKey}
							copiedImageKey={copiedImageKey}
							handleDownload={handleDownload}
							handleCopyUrl={handleCopyUrl}
							handleCopyImage={handleCopyImage}
						/>
					</figure>
				</MagicCard>
			</TooltipProvider>
		)
	}

	type VariantOption = {
		value: string
		label: string
		iconName: string
	}

	const availableVariants = useMemo((): VariantOption[] => {
		const variants: VariantOption[] = []
		if (nativeVariants) {
			return nativeVariants
				.filter((variant) => variant.formats.includes("svg"))
				.map((variant) => ({
					value: variant.key,
					label: getIconVariantLabel(variant),
					iconName: variant.stem,
				}))
		}

		if (isExternalIcon && externalIcon) {
			if (externalIcon.formats.includes("svg")) {
				variants.push({ value: "base", label: isSimpleIcons ? "Brand color" : "Base", iconName: externalIcon.slug })
			}
			for (const { tone, fileName } of getToneEntries(iconData.colors)) {
				const key = getExternalToneUrlKey(externalIcon, "svg", tone)
				if (key && canResolveExternalIconUrl(externalIcon, key)) {
					variants.push({ value: tone, label: getToneLabel(tone), iconName: fileName })
				}
			}
			for (const variant of namedVariants) {
				if (externalIcon.url_templates[`svg_${variant.name}`]) {
					variants.push({ value: variant.name, label: variant.label, iconName: `${externalIcon.slug}-${variant.name}` })
				}
			}
			return variants
		}

		if (isCommunityIcon) {
			const baseSvg = assetUrls.find((url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg"))
			if (baseSvg || mainIconUrl?.toLowerCase().endsWith(".svg")) {
				variants.push({
					value: "base",
					label: "Base",
					iconName: icon,
				})
			}

			const lightVariant = iconData.colors?.light
			if (lightVariant) {
				const lightSvg = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(lightVariant),
				)
				if (lightSvg) {
					variants.push({
						value: "light",
						label: getToneLabel("light"),
						iconName: lightVariant,
					})
				}
			}

			const darkVariant = iconData.colors?.dark
			if (darkVariant) {
				const darkSvg = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(darkVariant),
				)
				if (darkSvg) {
					variants.push({
						value: "dark",
						label: getToneLabel("dark"),
						iconName: darkVariant,
					})
				}
			}

			const wordmarkDefault = iconData.wordmark?.default
			if (wordmarkDefault) {
				const wordmarkDefaultSvg = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(wordmarkDefault),
				)
				if (wordmarkDefaultSvg) {
					variants.push({
						value: "wordmark",
						label: "Wordmark",
						iconName: wordmarkDefault,
					})
				}
			}

			const wordmarkLight = iconData.wordmark?.light
			if (wordmarkLight) {
				const wordmarkLightSvg = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(wordmarkLight),
				)
				if (wordmarkLightSvg) {
					variants.push({
						value: "wordmark-light",
						label: getToneLabel("light", "wordmark"),
						iconName: wordmarkLight,
					})
				}
			}

			const wordmarkDark = iconData.wordmark?.dark
			if (wordmarkDark) {
				const wordmarkDarkSvg = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(wordmarkDark),
				)
				if (wordmarkDarkSvg) {
					variants.push({
						value: "wordmark-dark",
						label: getToneLabel("dark", "wordmark"),
						iconName: wordmarkDark,
					})
				}
			}
		} else {
			if (iconData.base === "svg") {
				variants.push({
					value: "base",
					label: "Base",
					iconName: icon,
				})
			}

			if (iconData.colors?.light && iconData.base === "svg") {
				variants.push({
					value: "light",
					label: getToneLabel("light"),
					iconName: iconData.colors.light,
				})
			}

			if (iconData.colors?.dark && iconData.base === "svg") {
				variants.push({
					value: "dark",
					label: getToneLabel("dark"),
					iconName: iconData.colors.dark,
				})
			}

			if (iconData.wordmark?.default && iconData.base === "svg") {
				variants.push({
					value: "wordmark",
					label: "Wordmark",
					iconName: iconData.wordmark.default,
				})
			}

			if (iconData.wordmark?.light && iconData.base === "svg") {
				variants.push({
					value: "wordmark-light",
					label: getToneLabel("light", "wordmark"),
					iconName: iconData.wordmark.light,
				})
			}

			if (iconData.wordmark?.dark && iconData.base === "svg") {
				variants.push({
					value: "wordmark-dark",
					label: getToneLabel("dark", "wordmark"),
					iconName: iconData.wordmark.dark,
				})
			}
		}

		return variants
	}, [nativeVariants, isExternalIcon, externalIcon, isSimpleIcons, isCommunityIcon, assetUrls, mainIconUrl, icon, iconData, namedVariants])

	const getSvgUrl = useCallback(
		(variantValue?: string): string | null => {
			const variant = variantValue || selectedVariant
			const variantOption = availableVariants.find((v) => v.value === variant)

			if (!variantOption) {
				return null
			}

			if (isExternalIcon && externalIcon) {
				if (!externalIcon.formats.includes("svg")) return null
				if (variant === "base") return resolveExternalIconUrl(externalIcon, "svg")
				if (variant === "light" || variant === "dark") {
					const key = getExternalToneUrlKey(externalIcon, "svg", variant)
					if (key && canResolveExternalIconUrl(externalIcon, key)) return resolveExternalIconUrl(externalIcon, key)
				}
				const key = `svg_${variant}`
				if (canResolveExternalIconUrl(externalIcon, key)) return resolveExternalIconUrl(externalIcon, key)
				return null
			}

			if (isCommunityIcon) {
				if (variant === "base") {
					if (mainIconUrl?.toLowerCase().endsWith(".svg")) {
						return mainIconUrl
					}
					const communitySvgUrl = assetUrls.find((url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg"))
					return communitySvgUrl || null
				}

				const matchingUrl = assetUrls.find(
					(url: string) => typeof url === "string" && url.toLowerCase().endsWith(".svg") && url.includes(variantOption.iconName),
				)
				return matchingUrl || null
			}

			if (nativeVariants || iconData.base === "svg") {
				return `${BASE_URL}/svg/${variantOption.iconName}.svg`
			}

			return null
		},
		[selectedVariant, availableVariants, isExternalIcon, externalIcon, isCommunityIcon, mainIconUrl, assetUrls, iconData, nativeVariants],
	)

	const svgUrl = useMemo(() => getSvgUrl(selectedVariant), [selectedVariant, getSvgUrl])

	useEffect(() => {
		if (availableVariants.length > 0 && !availableVariants.find((v) => v.value === selectedVariant)) {
			setSelectedVariant(availableVariants[0].value)
		}
	}, [availableVariants, selectedVariant])

	const canCustomize = svgUrl !== null && availableFormats.includes("svg") && availableVariants.length > 0

	return (
		<div className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{breadcrumbItems && breadcrumbItems.length > 0 && (
					<div className="lg:col-span-4">
						<Breadcrumb className="justify-end">
							<BreadcrumbList>
								{breadcrumbItems.flatMap((item, index) => [
									<BreadcrumbItem key={index}>
										{item.href ? (
											<BreadcrumbLink asChild>
												<Link
													href={item.href}
													className="inline-flex min-h-11 min-w-11 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
												>
													{item.label}
												</Link>
											</BreadcrumbLink>
										) : (
											<BreadcrumbPage>{item.label}</BreadcrumbPage>
										)}
									</BreadcrumbItem>,
									...(index < breadcrumbItems.length - 1 ? [<BreadcrumbSeparator key={`sep-${index}`} />] : []),
								])}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				)}
				{relatedLinks}
				<div className="min-w-0 lg:col-span-1">
					<Card className="h-full gap-2 bg-background/50 border shadow-lg">
						<CardHeader className="pb-2">
							<div className="flex flex-col items-center bg-background">
								<div className="relative w-full">
									<div
										className={cn(
											"relative mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-xl ring-1 ring-border overflow-hidden p-3",
											nativeHeroTone || "bg-muted",
										)}
									>
										{isSimpleIcons && externalIcon ? (
											<UnoptimizedImage
												src={resolveExternalIconUrl(externalIcon, "svg_light")}
												priority
												width={96}
												height={96}
												alt={buildIconAltText(iconDisplayName, { kind: "base" }, "svg")}
												className="h-full w-full object-contain dark:invert"
											/>
										) : heroImageUrl ? (
											<UnoptimizedImage
												src={heroImageUrl}
												priority
												width={96}
												height={96}
												alt={buildIconAltText(iconDisplayName, { kind: "base" }, getHeroFormat())}
												className="h-full w-full object-contain"
											/>
										) : null}
									</div>
								</div>
								<CardTitle className="mt-3 text-3xl font-bold text-center tracking-wide break-words max-w-full">
									<h1>{iconDisplayName}</h1>
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{isExternalIcon && (
									<Button variant="outline" className="min-h-11 w-full" asChild>
										<a href="#icon-usage">Use this icon</a>
									</Button>
								)}
								<div>
									<div className="space-y-2">
										{hasUpdateDate && (
											<div className="flex items-center gap-2">
												<p className="text-sm">
													<span className="font-medium">Updated on:</span> <time dateTime={iconData.update.timestamp}>{formattedDate}</time>
												</p>
											</div>
										)}
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
														className={cn(LINK_TOUCH_TARGET, "text-primary hover:underline text-sm")}
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
											{iconData.categories.map((category) => {
												const badge = (
													<Badge
														key={category}
														variant="outline"
														className={cn(
															"inline-flex items-center border border-primary/20 px-2.5 py-0.5 text-sm",
															!isExternalIcon && "hover:border-primary",
														)}
													>
														{category
															.split("-")
															.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
															.join(" ")}
													</Badge>
												)
												if (isExternalIcon) return badge
												return (
													<Link
														key={category}
														href={`/icons?category=${encodeURIComponent(category)}`}
														className={cn(LINK_TOUCH_TARGET, "cursor-pointer")}
													>
														{badge}
													</Link>
												)
											})}
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
										{availableFormats.length > 0 && (
											<p>
												Available in{" "}
												{availableFormats.length > 1
													? `${availableFormats.length} formats (${availableFormats.map((f) => f.toUpperCase()).join(", ")}) `
													: `${availableFormats[0].toUpperCase()} format `}
												with a base format of {iconData.base.toUpperCase()}.
												{nativeVariants && nativeVariants.length > 1 && ` Includes ${nativeVariants.length} distinct Variants.`}
												{!nativeVariants &&
													!isExternalIcon &&
													iconData.colors &&
													" Includes light and dark variants for different backgrounds."}
												{!nativeVariants && !isExternalIcon && iconData.wordmark && " Wordmark variants are also available."}
											</p>
										)}
										{!isExternalIcon && (
											<p>
												Perfect for adding to dashboards, app directories, documentation, or anywhere you need the {iconDisplayName} logo.
											</p>
										)}
										{isExternalIcon && externalSourceConfig && <p>External icon provided by {externalSourceConfig.label}.</p>}
									</div>
								</div>
								{externalIcon && externalSourceConfig && (
									<section aria-labelledby="icon-license-title" className="space-y-2 rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
										<h3 id="icon-license-title" className="font-semibold">
											License and attribution
										</h3>
										<Link
											href={externalSourceConfig.authorUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex min-h-11 items-center rounded-sm text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
										>
											{externalIcon.attribution || `Icon by ${externalSourceConfig.label}`}
										</Link>
										{externalIcon.license && externalIcon.license_url ? (
											<Link
												href={externalIcon.license_url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex min-h-11 items-center justify-between gap-2 rounded-sm text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
											>
												<span>Read {externalIcon.license} artwork license</span>
												<ExternalLink className="size-4 shrink-0" aria-hidden="true" />
											</Link>
										) : (
											<p>Artwork license: {externalIcon.license || "Not specified by this source"}.</p>
										)}
										{isSimpleIcons && (
											<div className="space-y-2">
												<Link
													href={externalSourceConfig.licenseUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="flex min-h-11 items-center justify-between gap-2 rounded-sm text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
												>
													<span>Simple Icons collection: {externalSourceConfig.license}</span>
													<ExternalLink className="size-4 shrink-0" aria-hidden="true" />
												</Link>
												<p className="text-muted-foreground">
													The collection license does not cover every icon. Artwork rights may differ.
												</p>
												<Link
													href={SIMPLE_ICONS_DISCLAIMER_URL}
													target="_blank"
													rel="noopener noreferrer"
													className="flex min-h-11 items-center justify-between gap-2 rounded-sm text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
												>
													<span>Read Simple Icons disclaimer</span>
													<ExternalLink className="size-4 shrink-0" aria-hidden="true" />
												</Link>
											</div>
										)}
										<p className="text-muted-foreground">
											Brand names and marks belong to their owners. Check their trademark and usage terms before use.
										</p>
									</section>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="min-w-0 lg:col-span-2">
					<Card className="h-full bg-background/50 shadow-lg">
						<CardHeader>
							<CardTitle>
								<h2>Icon variants</h2>
							</CardTitle>
							<CardDescription>Click on any icon to copy its URL to your clipboard.</CardDescription>
							{namedVariants.length > 0 && (
								<nav aria-label="More icon variants" className="flex flex-wrap gap-2 pt-2">
									{namedVariants.map((variant) => (
										<Button key={variant.name} variant="outline" size="sm" className="min-h-11" asChild>
											<a href={`#variant-${variant.name}`}>View {variant.label}</a>
										</Button>
									))}
								</nav>
							)}
						</CardHeader>
						<CardContent>
							<div className="space-y-10">
								{nativeVariants?.length === 0 && (
									<p className="text-sm text-muted-foreground">File downloads are not available in this build yet.</p>
								)}
								{nativeVariants?.map((variant) => {
									const imageVariant = getIconImageVariant(variant)
									let description = "The original brand icon."
									let iconElement: React.ReactNode = <FileType className="w-4 h-4 shrink-0" aria-hidden="true" />
									if (imageVariant.kind === "tone") {
										description = getToneDescription(imageVariant.tone, false)
										iconElement = TONE_ICON[imageVariant.tone]
									}
									if (imageVariant.kind === "wordmark") {
										description = "The brand name as text, in colour."
										if (imageVariant.tone !== "default") description = getToneDescription(imageVariant.tone, false)
										iconElement = <Type className="w-4 h-4 shrink-0" aria-hidden="true" />
									}
									if (imageVariant.kind === "custom") description = variantKind(`custom:${variant.key}`).description
									return (
										<IconVariantsSection
											key={variant.stem}
											title={`${iconDisplayName} ${getIconVariantLabel(variant)}`}
											description={description}
											iconElement={iconElement}
											availableFormats={variant.formats}
											iconName={variant.stem}
											variant={imageVariant}
											renderVariant={renderVariant}
										/>
									)
								})}
								{!nativeVariants && shouldShowBaseIcon() && (
									<IconVariantsSection
										title={isSimpleIcons ? "Brand color" : "Base"}
										description={isSimpleIcons ? "Official brand color." : "The default variant."}
										iconElement={<FileType className="w-4 h-4 text-blue-500" aria-hidden="true" />}
										availableFormats={availableFormats}
										iconName={icon}
										variant={{ kind: "base" }}
										renderVariant={renderVariant}
									/>
								)}

								{!nativeVariants &&
									toneEntries.map(({ tone, fileName }) => (
										<IconVariantsSection
											key={tone}
											title={TONE_TITLE[tone]}
											description={getToneDescription(tone, hasMonochromeTones)}
											iconElement={TONE_ICON[tone]}
											availableFormats={availableFormats}
											iconName={fileName}
											variant={{ kind: "tone", tone, monochrome: hasMonochromeTones }}
											renderVariant={renderVariant}
										/>
									))}

								{!nativeVariants && iconData.wordmark && (
									<WordmarkSection iconData={iconData} availableFormats={availableFormats} renderVariant={renderVariant} />
								)}
								{externalIcon &&
									namedVariants.map((variant) => (
										<NamedVariantSection key={variant.name} externalIcon={externalIcon} variant={variant} renderVariant={renderVariant} />
									))}
								{!nativeVariants &&
									Object.entries(iconData.variants ?? {}).map(([name, file]) => (
										<IconVariantsSection
											key={`custom:${name}`}
											title={name}
											description={variantKind(`custom:${name}`).description}
											iconElement={<FileType className="size-4 shrink-0" aria-hidden="true" />}
											availableFormats={availableFormats}
											iconName={file}
											variant={{ kind: "custom", name }}
											renderVariant={renderVariant}
										/>
									))}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="min-w-0 lg:col-span-1">
					<Card className="h-full bg-background/50 border shadow-lg">
						<CardHeader>
							<CardTitle>Technical details</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								{externalBrandColor && /^#?[0-9a-f]{6}$/i.test(externalBrandColor) && (
									<div className="space-y-2">
										<h3 className="text-sm font-semibold">Brand color</h3>
										<div className="flex items-center gap-3">
											<span
												aria-hidden="true"
												className="size-8 shrink-0 rounded-md ring-1 ring-border"
												style={{ backgroundColor: `#${externalBrandColor.replace(/^#/, "")}` }}
											/>
											<code className="select-all text-base">#{externalBrandColor.replace(/^#/, "").toUpperCase()}</code>
										</div>
										<p className="text-sm text-foreground">Recorded by Simple Icons.</p>
									</div>
								)}
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

								{iconData.colors && !isSimpleIcons && !nativeVariants && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Color variants</h3>
										<div className="space-y-2">
											{toneEntries.map(({ tone, fileName }) => (
												<VariantFileRow
													key={tone}
													icon={<PaletteIcon className="w-4 h-4 shrink-0 text-purple-500" aria-hidden="true" />}
													tone={tone}
													fileName={fileName}
												/>
											))}
										</div>
									</div>
								)}

								{iconData.wordmark && !nativeVariants && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground">Wordmark variants</h3>
										<div className="space-y-2">
											{iconData.wordmark.default && (
												<div className="flex items-center gap-2">
													<Type className="w-4 h-4 shrink-0 text-green-500" />
													<span className="capitalize font-medium text-sm">Colour:</span>
													<code className="min-w-0 break-all border border-border px-2 py-0.5 rounded-lg text-xs">
														{iconData.wordmark.default}
													</code>
												</div>
											)}
											{getToneEntries(iconData.wordmark).map(({ tone, fileName }) => (
												<VariantFileRow
													key={tone}
													icon={<Type className="w-4 h-4 shrink-0 text-green-500" aria-hidden="true" />}
													tone={tone}
													fileName={fileName}
												/>
											))}
										</div>
									</div>
								)}

								{isExternalIcon && externalIcon && externalSourceConfig && (
									<div className="space-y-2">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
										<Button variant="outline" className="h-11 w-full gap-2" asChild>
											<Link href={externalIcon.source_url} target="_blank" rel="noopener noreferrer">
												<UnoptimizedImage src={externalSourceConfig.icon} alt="" width={16} height={16} className="shrink-0" />
												{externalIcon.source === "simpleicons" ? "View original source" : `View on ${externalSourceConfig.label}`}
												<ExternalLink className="w-4 h-4 ml-auto" />
											</Link>
										</Button>
										{externalIcon.guidelines_url && (
											<Button variant="outline" className="h-11 w-full gap-2" asChild>
												<Link href={externalIcon.guidelines_url} target="_blank" rel="noopener noreferrer">
													<FileType className="w-4 h-4" />
													Read brand guidelines
													<ExternalLink className="w-4 h-4 ml-auto" />
												</Link>
											</Button>
										)}
									</div>
								)}

								{!isCommunityIcon && !isExternalIcon && (
									<div className="">
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
										<Button variant="outline" className="min-h-11 w-full" asChild>
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
													key={`customizer-${selectedVariant}`}
													svgUrl={svgUrl}
													iconName={iconDisplayName}
													onClose={() => setIsCustomizerOpen(false)}
													availableVariants={availableVariants}
													selectedVariant={selectedVariant}
													onVariantChange={setSelectedVariant}
													previewOnLightBackground={namedVariants.some((variant) => variant.name === selectedVariant)}
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
													<Button onClick={() => setIsCustomizerOpen(true)} variant="outline" className="h-11 w-full">
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
				{externalContent}
			</div>
			{nameRelatedLinks}
			{relatedIcons.length > 0 && (
				<section className="container mx-auto mt-12" aria-labelledby="related-icons-title">
					<Card className="bg-background/50 border shadow-lg">
						<CardHeader>
							<CardTitle>
								<h2 id="related-icons-title">Related Icons</h2>
							</CardTitle>
							<CardDescription>
								Other icons from {relatedCategories.map((cat) => cat.replace(/-/g, " ")).join(", ")} categories
							</CardDescription>
						</CardHeader>
						<CardContent>
							<IconsGrid filteredIcons={relatedIcons} matchedAliases={{}} />
							<div className="mt-6 text-center">
								<Button
									asChild
									variant="link"
									className="min-h-11 text-muted-foreground hover:text-primary transition-colors duration-200 hover:no-underline"
								>
									<Link
										href={`/icons?${relatedCategories.map((cat) => `category=${encodeURIComponent(cat)}`).join("&")}`}
										className="no-underline"
									>
										View all related icons
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</section>
			)}
		</div>
	)
}
