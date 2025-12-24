"use client"

import confetti from "canvas-confetti"
import { motion } from "framer-motion"
import { FileType, Moon, PaletteIcon, Plus, Sun, Type, Upload, X } from "lucide-react"
import Image from "next/image"
import type React from "react"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { pb } from "@/lib/pb"
import { formatIconName } from "@/lib/utils"
import { MagicCard } from "./magicui/magic-card"
import { Badge } from "./ui/badge"

interface VariantFile {
	file: File
	preview: string
	type: "base" | "light" | "dark" | "wordmark-light" | "wordmark-dark"
	label: string
}

interface EditableIconData {
	iconName: string
	variants: VariantFile[]
	categories: string[]
	aliases: string[]
	description: string
}

const AVAILABLE_CATEGORIES = [
	"automation",
	"cloud",
	"database",
	"development",
	"entertainment",
	"finance",
	"gaming",
	"home-automation",
	"media",
	"monitoring",
	"network",
	"security",
	"social",
	"storage",
	"tools",
	"utility",
	"other",
]

type AddVariantCardProps = {
	onAddVariant: (type: VariantFile["type"], label: string) => void
	existingTypes: VariantFile["type"][]
}

function AddVariantCard({ onAddVariant, existingTypes }: AddVariantCardProps) {
	const [showOptions, setShowOptions] = useState(false)

	const availableVariants = [
		{ type: "base" as const, label: "Base Icon", icon: FileType },
		{ type: "light" as const, label: "Light Theme", icon: Sun },
		{ type: "dark" as const, label: "Dark Theme", icon: Moon },
		{ type: "wordmark-light" as const, label: "Wordmark Light", icon: Type },
		{ type: "wordmark-dark" as const, label: "Wordmark Dark", icon: Type },
	].filter((v) => !existingTypes.includes(v.type))

	if (availableVariants.length === 0) return null

	return (
		<TooltipProvider delayDuration={500}>
			<MagicCard className="p-0 rounded-md">
				<div className="flex flex-col items-center justify-center p-4 h-full min-h-[280px]">
					{!showOptions ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<motion.button
									type="button"
									className="relative w-28 h-28 mb-3 cursor-pointer rounded-xl overflow-hidden group border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => setShowOptions(true)}
									aria-label="Add new variant"
								>
									<Plus className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
								</motion.button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Add a new variant</p>
							</TooltipContent>
						</Tooltip>
					) : (
						<div className="space-y-2 w-full">
							<p className="text-sm font-medium text-center mb-3">Select variant type:</p>
							{availableVariants.map(({ type, label, icon: Icon }) => (
								<Button
									key={type}
									type="button"
									variant="outline"
									size="sm"
									className="w-full justify-start"
									onClick={() => {
										onAddVariant(type, label)
										setShowOptions(false)
									}}
								>
									<Icon className="w-4 h-4 mr-2" />
									{label}
								</Button>
							))}
							<Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowOptions(false)}>
								Cancel
							</Button>
						</div>
					)}
					<p className="text-sm font-medium mt-2">Add Variant</p>
				</div>
			</MagicCard>
		</TooltipProvider>
	)
}

type VariantCardProps = {
	variant: VariantFile
	onRemove: () => void
	canRemove: boolean
}

function VariantCard({ variant, onRemove, canRemove }: VariantCardProps) {
	return (
		<TooltipProvider delayDuration={500}>
			<MagicCard className="p-0 rounded-md relative group">
				{canRemove && (
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
						onClick={onRemove}
					>
						<X className="h-4 w-4" />
					</Button>
				)}
				<div className="flex flex-col items-center p-4 transition-all">
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="relative w-28 h-28 mb-3 rounded-xl overflow-hidden">
								<div className="absolute inset-0 border-2 border-primary/20 rounded-xl z-10" />
								<Image src={variant.preview} alt={`${variant.label} preview`} fill className="object-contain p-4" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{variant.label}</p>
						</TooltipContent>
					</Tooltip>

					<p className="text-sm font-medium">{variant.label}</p>
					<p className="text-xs text-muted-foreground">{variant.file.name.split(".").pop()?.toUpperCase()}</p>
				</div>
			</MagicCard>
		</TooltipProvider>
	)
}

type EditableIconDetailsProps = {
	onSubmit?: (data: EditableIconData) => void
	initialData?: Partial<EditableIconData>
}

export function EditableIconDetails({ onSubmit, initialData }: EditableIconDetailsProps) {
	const [iconName, setIconName] = useState(initialData?.iconName || "")
	const [variants, setVariants] = useState<VariantFile[]>(initialData?.variants || [])
	const [categories, setCategories] = useState<string[]>(initialData?.categories || [])
	const [aliases, setAliases] = useState<string[]>(initialData?.aliases || [])
	const [aliasInput, setAliasInput] = useState("")
	const [description, setDescription] = useState(initialData?.description || "")

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

	const handleAddVariant = async (type: VariantFile["type"], label: string) => {
		// Create a file input to get the file
		const input = document.createElement("input")
		input.type = "file"
		input.accept = "image/svg+xml,image/png,image/webp"
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (file) {
				const preview = await new Promise<string>((resolve) => {
					const reader = new FileReader()
					reader.onload = (e) => resolve(e.target?.result as string)
					reader.readAsDataURL(file)
				})

				setVariants([...variants, { file, preview, type, label }])
				launchConfetti()
				toast.success("Variant added", {
					description: `${label} has been added to your submission`,
				})
			}
		}
		input.click()
	}

	const handleRemoveVariant = (index: number) => {
		setVariants(variants.filter((_, i) => i !== index))
		toast.info("Variant removed")
	}

	const toggleCategory = (category: string) => {
		setCategories(categories.includes(category) ? categories.filter((c) => c !== category) : [...categories, category])
	}

	const handleAddAlias = () => {
		const trimmedAlias = aliasInput.trim()
		if (trimmedAlias && !aliases.includes(trimmedAlias)) {
			setAliases([...aliases, trimmedAlias])
			setAliasInput("")
		}
	}

	const handleRemoveAlias = (alias: string) => {
		setAliases(aliases.filter((a) => a !== alias))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validation
		if (!iconName.trim()) {
			toast.error("Icon name is required")
			return
		}

		if (!/^[a-z0-9-]+$/.test(iconName)) {
			toast.error("Icon name must contain only lowercase letters, numbers, and hyphens")
			return
		}

		const baseVariant = variants.find((v) => v.type === "base")
		if (!baseVariant) {
			toast.error("Base icon variant is required")
			return
		}

		if (categories.length === 0) {
			toast.error("At least one category is required")
			return
		}

		if (!pb.authStore.isValid) {
			toast.error("You must be logged in to submit an icon")
			return
		}

		try {
			// Prepare submission data
			const assetFiles: File[] = []
			const extras: any = {
				aliases,
				categories,
				base: baseVariant.file.name.split(".").pop() || "svg",
			}

			// Add base variant
			assetFiles.push(baseVariant.file)

			// Check for color variants (light/dark)
			const lightVariant = variants.find((v) => v.type === "light")
			const darkVariant = variants.find((v) => v.type === "dark")

			if (lightVariant || darkVariant) {
				extras.colors = {}
				if (lightVariant) {
					extras.colors.light = lightVariant.file.name
					assetFiles.push(lightVariant.file)
				}
				if (darkVariant) {
					extras.colors.dark = darkVariant.file.name
					assetFiles.push(darkVariant.file)
				}
			}

			// Check for wordmark variants
			const wordmarkLight = variants.find((v) => v.type === "wordmark-light")
			const wordmarkDark = variants.find((v) => v.type === "wordmark-dark")

			if (wordmarkLight || wordmarkDark) {
				extras.wordmark = {}
				if (wordmarkLight) {
					extras.wordmark.light = wordmarkLight.file.name
					assetFiles.push(wordmarkLight.file)
				}
				if (wordmarkDark) {
					extras.wordmark.dark = wordmarkDark.file.name
					assetFiles.push(wordmarkDark.file)
				}
			}

			// Create submission
			const submissionData = {
				name: iconName,
				assets: assetFiles,
				created_by: pb.authStore.record?.id,
				status: "pending",
				extras: extras,
			}

			await pb.collection("submissions").create(submissionData)

			// Revalidate Next.js cache for community pages
			await revalidateAllSubmissions()

			launchConfetti()
			toast.success("Icon submitted!", {
				description: `Your icon "${iconName}" has been submitted for review`,
			})

			// Reset form
			setIconName("")
			setVariants([])
			setCategories([])
			setAliases([])
			setDescription("")

			if (onSubmit) {
				onSubmit({ iconName, variants, categories, aliases, description })
			}
		} catch (error: any) {
			console.error("Submission error:", error)
			toast.error("Failed to submit icon", {
				description: error?.message || "Please try again later",
			})
		}
	}

	const getAvailableFormats = () => {
		const baseVariant = variants.find((v) => v.type === "base")
		if (!baseVariant) return []

		const baseFormat = baseVariant.file.name.split(".").pop()?.toLowerCase()
		switch (baseFormat) {
			case "svg":
				return ["svg", "png", "webp"]
			case "png":
				return ["png", "webp"]
			default:
				return [baseFormat || ""]
		}
	}

	const availableFormats = getAvailableFormats()
	const formattedIconName = iconName ? formatIconName(iconName) : "Your Icon"
	const baseVariant = variants.find((v) => v.type === "base")

	return (
		<form onSubmit={handleSubmit}>
			<main className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Left Column - Icon Info & Metadata */}
					<div className="lg:col-span-1">
						<Card className="h-full bg-background/50 border shadow-lg">
							<CardHeader className="pb-4">
								<div className="flex flex-col items-center">
									{baseVariant ? (
										<div className="relative w-32 h-32 rounded-xl overflow-hidden border flex items-center justify-center p-3">
											<Image
												src={baseVariant.preview}
												priority
												width={96}
												height={96}
												alt={`${formattedIconName} icon preview`}
												className="w-full h-full object-contain"
											/>
										</div>
									) : (
										<div className="relative w-32 h-32 rounded-xl overflow-hidden border border-dashed border-muted-foreground/30 flex items-center justify-center p-3">
											<Upload className="w-12 h-12 text-muted-foreground" />
										</div>
									)}
									<div className="w-full mt-4">
										<Label htmlFor="icon-name" className="text-sm font-medium mb-2 block">
											Icon Name
										</Label>
										<IconNameCombobox value={iconName} onValueChange={setIconName} />
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Categories */}
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Categories</h3>
										<div className="flex flex-wrap gap-2">
											{AVAILABLE_CATEGORIES.map((category) => (
												<Badge
													key={category}
													variant={categories.includes(category) ? "default" : "outline"}
													className="cursor-pointer hover:bg-primary/80 text-xs"
													onClick={() => toggleCategory(category)}
												>
													{category
														.split("-")
														.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
														.join(" ")}
												</Badge>
											))}
										</div>
										{categories.length === 0 && <p className="text-xs text-destructive mt-2">At least one category required</p>}
									</div>

									{/* Aliases */}
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Aliases</h3>
										<div className="flex gap-2 mb-2">
											<Input
												placeholder="Add alias..."
												value={aliasInput}
												onChange={(e) => setAliasInput(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault()
														handleAddAlias()
													}
												}}
												className="h-8 text-xs"
											/>
											<Button type="button" size="sm" onClick={handleAddAlias} className="h-8">
												<Plus className="h-3 w-3" />
											</Button>
										</div>
										{aliases.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{aliases.map((alias) => (
													<Badge key={alias} variant="secondary" className="inline-flex items-center px-2.5 py-1 text-xs">
														{alias}
														<button type="button" onClick={() => handleRemoveAlias(alias)} className="ml-1 hover:text-destructive">
															<X className="h-3 w-3" />
														</button>
													</Badge>
												))}
											</div>
										)}
									</div>

									{/* About */}
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">About this icon</h3>
										<div className="text-xs text-muted-foreground space-y-2">
											<p>
												{variants.length > 0
													? `${variants.length} variant${variants.length > 1 ? "s" : ""} uploaded`
													: "No variants uploaded yet"}
											</p>
											{availableFormats.length > 0 && (
												<p>
													Available in{" "}
													{availableFormats.length > 1
														? `${availableFormats.length} formats (${availableFormats.map((f) => f.toUpperCase()).join(", ")})`
														: `${availableFormats[0].toUpperCase()} format`}
												</p>
											)}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Middle Column - Icon Variants */}
					<div className="lg:col-span-2">
						<Card className="h-full bg-background/50 shadow-lg">
							<CardHeader>
								<CardTitle>
									<h2>Icon Variants</h2>
								</CardTitle>
								<CardDescription>Add different versions of your icon for various themes</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-10">
									{/* Base/Default Variants */}
									<div>
										<h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
											<FileType className="w-4 h-4 text-blue-500" />
											Icon Variants
										</h3>
										<p className="text-sm text-muted-foreground mb-4">Upload your icon files. Base icon is required.</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
											{variants.map((variant, index) => (
												<VariantCard
													key={index}
													variant={variant}
													onRemove={() => handleRemoveVariant(index)}
													canRemove={variant.type !== "base" || variants.length > 1}
												/>
											))}
											<AddVariantCard onAddVariant={handleAddVariant} existingTypes={variants.map((v) => v.type)} />
										</div>
									</div>

									{/* Help Text */}
									<div className="bg-muted/50 p-4 rounded-lg space-y-2">
										<h4 className="text-sm font-semibold">Variant Types:</h4>
										<ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
											<li>
												<strong>Base Icon:</strong> Main icon file (required)
											</li>
											<li>
												<strong>Light Theme:</strong> Optimized for light backgrounds
											</li>
											<li>
												<strong>Dark Theme:</strong> Optimized for dark backgrounds
											</li>
											<li>
												<strong>Wordmark:</strong> Logo with text/brand name
											</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Technical Details & Actions */}
					<div className="lg:col-span-1">
						<Card className="h-full bg-background/50 border shadow-lg">
							<CardHeader>
								<CardTitle>Technical Details</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-6">
									<div>
										<h3 className="text-sm font-semibold text-muted-foreground mb-2">Base Format</h3>
										<div className="flex items-center gap-2">
											<FileType className="w-4 h-4 text-blue-500" />
											<div className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium">
												{baseVariant ? baseVariant.file.name.split(".").pop()?.toUpperCase() : "N/A"}
											</div>
										</div>
									</div>

									{availableFormats.length > 0 && (
										<div>
											<h3 className="text-sm font-semibold text-muted-foreground mb-2">Available Formats</h3>
											<div className="flex flex-wrap gap-2">
												{availableFormats.map((format) => (
													<div key={format} className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium">
														{format.toUpperCase()}
													</div>
												))}
											</div>
										</div>
									)}

									{variants.some((v) => v.type === "light" || v.type === "dark") && (
										<div>
											<h3 className="text-sm font-semibold text-muted-foreground mb-2">Color Variants</h3>
											<div className="space-y-2">
												{variants
													.filter((v) => v.type === "light" || v.type === "dark")
													.map((variant, index) => (
														<div key={index} className="flex items-center gap-2">
															<PaletteIcon className="w-4 h-4 text-purple-500" />
															<span className="capitalize font-medium text-sm">{variant.type}:</span>
															<code className="border border-border px-2 py-0.5 rounded-lg text-xs">{variant.file.name}</code>
														</div>
													))}
											</div>
										</div>
									)}

									{variants.some((v) => v.type.startsWith("wordmark")) && (
										<div>
											<h3 className="text-sm font-semibold text-muted-foreground mb-2">Wordmark Variants</h3>
											<div className="space-y-2">
												{variants
													.filter((v) => v.type.startsWith("wordmark"))
													.map((variant, index) => (
														<div key={index} className="flex items-center gap-2">
															<Type className="w-4 h-4 text-green-500" />
															<span className="capitalize font-medium text-sm">{variant.type.replace("wordmark-", "")}:</span>
															<code className="border border-border px-2 py-0.5 rounded-lg text-xs">{variant.file.name}</code>
														</div>
													))}
											</div>
										</div>
									)}

									<div className="pt-4 space-y-2">
										<Button type="submit" className="w-full" size="lg">
											Submit Icon
										</Button>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={() => {
												setIconName("")
												setVariants([])
												setCategories([])
												setAliases([])
												setDescription("")
											}}
										>
											Clear Form
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</form>
	)
}
