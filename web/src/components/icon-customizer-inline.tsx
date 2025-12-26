"use client"

import confetti from "canvas-confetti"
import { motion } from "framer-motion"
import { Copy, Download, Info, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/ui/color-picker"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
	applyColorMappingsToSvg,
	type ColorMapping,
	ensureSvgAttributes,
	extractColorsFromSvg,
	hexToHsl,
	hslToHex,
	isClipboardAvailable,
} from "@/lib/svg-color-utils"

type IconCustomizerInlineProps = {
	svgUrl: string
	iconName: string
	onClose: () => void
}

export function IconCustomizerInline({ svgUrl, iconName, onClose }: IconCustomizerInlineProps) {
	const [svgContent, setSvgContent] = useState<string>("")
	const [originalColors, setOriginalColors] = useState<string[]>([])
	const [colorMappings, setColorMappings] = useState<ColorMapping>({})
	const [isLoading, setIsLoading] = useState(false)

	const fetchSvgContent = useCallback(async () => {
		if (!svgUrl) {
			toast.error("Invalid SVG URL", {
				description: "No SVG URL provided.",
			})
			return
		}

		setIsLoading(true)
		try {
			const response = await fetch(svgUrl)
			if (!response.ok) {
				throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`)
			}
			const text = await response.text()
			if (!text || text.trim().length === 0) {
				throw new Error("SVG content is empty")
			}
			setSvgContent(text)
		} catch (error) {
			console.error("Error fetching SVG:", error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
			toast.error("Failed to load SVG", {
				description: `Could not load the icon: ${errorMessage}`,
			})
			setSvgContent("")
		} finally {
			setIsLoading(false)
		}
	}, [svgUrl])

	useEffect(() => {
		if (svgUrl) {
			fetchSvgContent()
		}
	}, [svgUrl, fetchSvgContent])

	useEffect(() => {
		if (svgContent) {
			const colors = extractColorsFromSvg(svgContent)
			setOriginalColors(colors)

			const initialMappings: ColorMapping = {}
			colors.forEach((color) => {
				initialMappings[color] = color
			})
			setColorMappings(initialMappings)
		}
	}, [svgContent])

	const customizedSvg = useMemo(() => {
		if (!svgContent || Object.keys(colorMappings).length === 0) {
			return ""
		}

		const customized = applyColorMappingsToSvg(svgContent, colorMappings)
		if (!customized) {
			return ""
		}

		return ensureSvgAttributes(customized)
	}, [svgContent, colorMappings])

	const handleColorChange = (originalColor: string, newColor: string) => {
		setColorMappings((prev) => ({
			...prev,
			[originalColor]: newColor,
		}))
	}

	const handleCopySvg = async () => {
		if (!customizedSvg) {
			toast.error("No SVG to copy", {
				description: "Please wait for the SVG to load.",
			})
			return
		}

		if (!isClipboardAvailable()) {
			toast.error("Clipboard not available", {
				description: "Your browser does not support clipboard operations. Please copy manually.",
			})
			return
		}

		try {
			await navigator.clipboard.writeText(customizedSvg)
			toast.success("SVG Copied", {
				description: "The customized SVG code has been copied to your clipboard.",
			})
			confetti({
				particleCount: 50,
				spread: 180,
				origin: { x: 0.5, y: 0.5 },
				colors: ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1bd", "#f9bec7"],
			})
		} catch (error) {
			console.error("Error copying SVG:", error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			toast.error("Copy Failed", {
				description: `Could not copy the SVG to clipboard: ${errorMessage}`,
			})
		}
	}

	const handleDownloadSvg = () => {
		if (!customizedSvg) {
			toast.error("No SVG to download", {
				description: "Please wait for the SVG to load.",
			})
			return
		}

		try {
			const blob = new Blob([customizedSvg], { type: "image/svg+xml" })
			const blobUrl = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = blobUrl
			const sanitizedName = iconName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")
			link.download = `${sanitizedName || "icon"}-customized.svg`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

			toast.success("Download started", {
				description: "Your customized SVG is being downloaded.",
			})
			confetti({
				particleCount: 50,
				spread: 180,
				origin: { x: 0.5, y: 0.5 },
				colors: ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1bd", "#f9bec7"],
			})
		} catch (error) {
			console.error("Error downloading SVG:", error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			toast.error("Download Failed", {
				description: `Could not download the SVG file: ${errorMessage}`,
			})
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-6">
				<div className="text-muted-foreground text-sm">Loading icon...</div>
			</div>
		)
	}

	if (originalColors.length === 0) {
		return (
			<div className="p-6 text-center">
				<div className="text-muted-foreground text-sm">
					<p>No fill colors found in this SVG.</p>
					<p className="text-xs mt-2">This icon may use strokes or other styling methods.</p>
				</div>
			</div>
		)
	}

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			exit={{ opacity: 0, height: 0 }}
			className="space-y-4"
		>
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<Label className="text-sm font-semibold">Customize Colors</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-5 w-5 p-0"
								aria-label="Learn more about color customization"
							>
								<Info className="h-4 w-4 text-muted-foreground" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80" align="center">
							<p className="text-sm text-muted-foreground">
								This feature extracts and allows you to customize fill and
								stroke colors found in the SVG. Colors can be defined in various
								ways: as attributes (fill="white"), inline styles
								(style="fill:#2396ed"), or within style tags. Each unique color
								gets its own color picker for easy customization.
							</p>
						</PopoverContent>
					</Popover>
				</div>
				<Button
					id="close-customizer"
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="h-6 w-6 p-0"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="space-y-4">
				{originalColors.map((originalColor, index) => {
					const currentColor = colorMappings[originalColor] || originalColor;
					const hslColor = hexToHsl(currentColor);

					return (
						<div key={originalColor} className="space-y-2">
							<div className="flex items-center gap-2">
								<div
									className="w-4 h-4 rounded border-2 border-border flex-shrink-0"
									style={{ backgroundColor: originalColor }}
									title={`Original: ${originalColor}`}
								/>
								<Label className="text-xs text-muted-foreground">
									Color {index + 1}
								</Label>
							</div>
							<ColorPicker
								color={hslColor}
								onChange={(newColor) => {
									const hex = hslToHex(newColor);
									handleColorChange(originalColor, hex);
								}}
							/>
						</div>
					);
				})}
			</div>

			<Separator />

			<div
				id="customized-svg-preview"
				className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg border min-h-[120px]"
			>
				{customizedSvg ? (
					<div
						className="w-[120px] h-[120px]"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: We need to render the customized SVG
						dangerouslySetInnerHTML={{ __html: customizedSvg }}
					/>
				) : (
					<div className="text-muted-foreground text-xs">
						Preview loading...
					</div>
				)}
			</div>

			<div className="grid grid-cols-2 gap-2">
				<Button
					onClick={handleCopySvg}
					variant="outline"
					className="w-full"
					size="sm"
				>
					<Copy className="w-4 h-4 mr-2" />
					Copy
				</Button>
				<Button onClick={handleDownloadSvg} className="w-full" size="sm">
					<Download className="w-4 h-4 mr-2" />
					Download
				</Button>
			</div>
		</motion.div>
	);
}
