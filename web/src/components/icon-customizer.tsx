"use client"

import confetti from "canvas-confetti"
import { ChevronDown, Copy, Palette } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
	applyColorMappingsToSvg,
	type ColorMapping,
	extractColorsFromSvg,
	hexToRgb,
	isClipboardAvailable,
	rgbToHex,
} from "@/lib/svg-color-utils"

const TAILWIND_COLORS = [
	{ name: "Red", value: "#ef4444", class: "bg-red-500" },
	{ name: "Orange", value: "#f97316", class: "bg-orange-500" },
	{ name: "Amber", value: "#f59e0b", class: "bg-amber-500" },
	{ name: "Yellow", value: "#eab308", class: "bg-yellow-500" },
	{ name: "Lime", value: "#84cc16", class: "bg-lime-500" },
	{ name: "Green", value: "#22c55e", class: "bg-green-500" },
	{ name: "Emerald", value: "#10b981", class: "bg-emerald-500" },
	{ name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
	{ name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
	{ name: "Sky", value: "#0ea5e9", class: "bg-sky-500" },
	{ name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
	{ name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
	{ name: "Violet", value: "#8b5cf6", class: "bg-violet-500" },
	{ name: "Purple", value: "#a855f7", class: "bg-purple-500" },
	{ name: "Fuchsia", value: "#d946ef", class: "bg-fuchsia-500" },
	{ name: "Pink", value: "#ec4899", class: "bg-pink-500" },
	{ name: "Rose", value: "#f43f5e", class: "bg-rose-500" },
	{ name: "Slate", value: "#64748b", class: "bg-slate-500" },
	{ name: "Gray", value: "#6b7280", class: "bg-gray-500" },
	{ name: "Zinc", value: "#71717a", class: "bg-zinc-500" },
	{ name: "Neutral", value: "#737373", class: "bg-neutral-500" },
	{ name: "Stone", value: "#78716c", class: "bg-stone-500" },
	{ name: "Black", value: "#000000", class: "bg-black" },
	{ name: "White", value: "#ffffff", class: "bg-white border" },
]

type RGB = {
	r: number
	g: number
	b: number
}

type IconCustomizerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	svgUrl: string
	iconName: string
}

type ColorPickerProps = {
	originalColor: string
	currentColor: string
	onColorChange: (color: string) => void
	index: number
}

function ColorPicker({ originalColor, currentColor, onColorChange, index }: ColorPickerProps) {
	const [rgb, setRgb] = useState<RGB>(() => {
		const rgbValue = hexToRgb(currentColor)
		return rgbValue || { r: 0, g: 0, b: 0 }
	})
	const [customHex, setCustomHex] = useState(currentColor)
	const [isPopoverOpen, setIsPopoverOpen] = useState(false)

	useEffect(() => {
		const newRgb = hexToRgb(currentColor)
		if (newRgb) {
			setRgb(newRgb)
			setCustomHex(currentColor)
		}
	}, [currentColor])

	const handleRgbChange = (component: "r" | "g" | "b", value: string) => {
		const numValue = Math.max(0, Math.min(255, parseInt(value, 10) || 0))
		const newRgb = { ...rgb, [component]: numValue }
		setRgb(newRgb)
		const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
		setCustomHex(hex)
		onColorChange(hex)
	}

	const handleHexChange = (value: string) => {
		setCustomHex(value)
		// Validate hex format (3 or 6 digits)
		if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
			const newRgb = hexToRgb(value)
			if (newRgb) {
				setRgb(newRgb)
				onColorChange(value)
			}
		}
	}

	const handlePaletteSelect = (color: string) => {
		onColorChange(color)
		setIsPopoverOpen(false)
	}

	return (
		<div className="space-y-4 p-4 border rounded-lg bg-card">
			<div className="flex items-center gap-3">
				<div
					className="w-10 h-10 rounded-md border-2 border-border flex-shrink-0 shadow-sm"
					style={{ backgroundColor: originalColor }}
					title={`Original: ${originalColor}`}
				/>
				<div className="flex-1">
					<Label className="text-sm font-semibold">Color {index + 1}</Label>
					{originalColor !== currentColor && <p className="text-xs text-muted-foreground">Customized</p>}
				</div>
			</div>

			<div className="space-y-3">
				<div>
					<Label className="text-xs text-muted-foreground mb-2 block">Current Color</Label>
					<div className="flex items-center gap-2">
						<div
							className="w-12 h-12 rounded-md border-2 border-border flex-shrink-0 shadow-sm"
							style={{ backgroundColor: currentColor }}
						/>
						<div className="flex-1">
							<Input
								type="text"
								value={customHex}
								onChange={(e) => handleHexChange(e.target.value)}
								className="font-mono text-sm"
								placeholder="#000000"
							/>
						</div>
					</div>
				</div>

				<div>
					<Label className="text-xs text-muted-foreground mb-2 block">RGB Values</Label>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<Label htmlFor={`r-${index}`} className="text-xs text-muted-foreground">
								R
							</Label>
							<Input
								id={`r-${index}`}
								type="number"
								min="0"
								max="255"
								value={rgb.r}
								onChange={(e) => handleRgbChange("r", e.target.value)}
								className="font-mono"
							/>
						</div>
						<div>
							<Label htmlFor={`g-${index}`} className="text-xs text-muted-foreground">
								G
							</Label>
							<Input
								id={`g-${index}`}
								type="number"
								min="0"
								max="255"
								value={rgb.g}
								onChange={(e) => handleRgbChange("g", e.target.value)}
								className="font-mono"
							/>
						</div>
						<div>
							<Label htmlFor={`b-${index}`} className="text-xs text-muted-foreground">
								B
							</Label>
							<Input
								id={`b-${index}`}
								type="number"
								min="0"
								max="255"
								value={rgb.b}
								onChange={(e) => handleRgbChange("b", e.target.value)}
								className="font-mono"
							/>
						</div>
					</div>
				</div>

				<div>
					<Label className="text-xs text-muted-foreground mb-2 block">Color Picker</Label>
					<input
						type="color"
						value={currentColor}
						onChange={(e) => onColorChange(e.target.value)}
						className="w-full h-12 rounded-md border-2 border-border cursor-pointer"
					/>
				</div>

				<div>
					<Label className="text-xs text-muted-foreground mb-2 block">Tailwind Palette</Label>
					<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-full justify-between">
								<span className="flex items-center gap-2">
									<div className="w-4 h-4 rounded border" style={{ backgroundColor: currentColor }} />
									Select from palette
								</span>
								<ChevronDown className="h-4 w-4 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80 p-4" align="start">
							<div className="grid grid-cols-6 gap-2">
								{TAILWIND_COLORS.map((color) => (
									<button
										key={color.value}
										type="button"
										onClick={() => handlePaletteSelect(color.value)}
										className={`w-10 h-10 rounded-md border-2 transition-all hover:scale-110 ${
											currentColor.toLowerCase() === color.value.toLowerCase()
												? "border-primary ring-2 ring-primary ring-offset-1"
												: "border-border"
										} ${color.class}`}
										title={color.name}
										aria-label={`Select ${color.name} color`}
									/>
								))}
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	)
}

export function IconCustomizer({ open, onOpenChange, svgUrl, iconName }: IconCustomizerProps) {
	const [svgContent, setSvgContent] = useState<string>("")
	const [originalColors, setOriginalColors] = useState<string[]>([])
	const [colorMappings, setColorMappings] = useState<ColorMapping>({})
	const [isLoading, setIsLoading] = useState(false)
	const [customizedSvg, setCustomizedSvg] = useState<string>("")

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
		if (open && svgUrl) {
			fetchSvgContent()
		} else {
			setSvgContent("")
			setOriginalColors([])
			setColorMappings({})
			setCustomizedSvg("")
		}
	}, [open, svgUrl, fetchSvgContent])

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

	useEffect(() => {
		if (svgContent && Object.keys(colorMappings).length > 0) {
			const customized = applyColorMappingsToSvg(svgContent, colorMappings)
			setCustomizedSvg(customized)
		} else {
			setCustomizedSvg("")
		}
	}, [colorMappings, svgContent])

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

	return (
		<Modal open={open} onOpenChange={onOpenChange}>
			<ModalContent size="full" className="flex flex-col p-0 gap-0">
				<ModalHeader className="px-6 pt-6 pb-4 border-b">
					<ModalTitle className="flex items-center gap-2 text-2xl">
						<Palette className="w-6 h-6" />
						Customize {iconName}
					</ModalTitle>
					<ModalDescription className="text-base">
						Customize each color found in the icon. Each unique fill color has its own color picker (up to 5 colors).
					</ModalDescription>
				</ModalHeader>

				<div className="flex-1 overflow-hidden grid grid-cols-[400px_1fr] gap-0">
					{isLoading ? (
						<div className="col-span-2 flex items-center justify-center">
							<div className="text-muted-foreground">Loading icon...</div>
						</div>
					) : originalColors.length === 0 ? (
						<div className="col-span-2 flex items-center justify-center">
							<div className="text-muted-foreground text-center">
								<p className="text-lg mb-2">No fill colors found in this SVG.</p>
								<p className="text-sm">This icon may use strokes or other styling methods.</p>
							</div>
						</div>
					) : (
						<>
							<div className="border-r overflow-y-auto p-6 space-y-4 bg-muted/20">
								{originalColors.map((originalColor, index) => {
									const currentColor = colorMappings[originalColor] || originalColor
									return (
										<ColorPicker
											key={originalColor}
											originalColor={originalColor}
											currentColor={currentColor}
											onColorChange={(newColor) => handleColorChange(originalColor, newColor)}
											index={index + 1}
										/>
									)
								})}
							</div>

							<div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-muted/30 to-muted/10 overflow-auto">
								<div className="w-full max-w-2xl space-y-6">
									<div className="flex flex-col items-center justify-center p-12 bg-background/50 rounded-xl border-2 border-dashed min-h-[400px] shadow-lg">
										<div
											className="w-full max-w-md h-96 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
											// biome-ignore lint/security/noDangerouslySetInnerHtml: We need to render the customized SVG
											dangerouslySetInnerHTML={{ __html: customizedSvg }}
										/>
									</div>

									<div className="flex justify-center">
										<Button onClick={handleCopySvg} size="lg" className="min-w-[200px]">
											<Copy className="w-5 h-5 mr-2" />
											Copy Customized SVG
										</Button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</ModalContent>
		</Modal>
	)
}
