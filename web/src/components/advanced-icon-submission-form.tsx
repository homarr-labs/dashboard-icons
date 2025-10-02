"use client"

import { AlertCircle, Check, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone"
import { Textarea } from "@/components/ui/textarea"
import { pb } from "@/lib/pb"

interface VariantConfig {
	id: string
	label: string
	description: string
	field: "base" | "dark" | "light" | "wordmark" | "wordmark_dark"
}

const VARIANTS: VariantConfig[] = [
	{
		id: "base",
		label: "Base Icon",
		description: "Main icon file (required)",
		field: "base",
	},
	{
		id: "dark",
		label: "Dark Variant",
		description: "Icon optimized for dark backgrounds",
		field: "dark",
	},
	{
		id: "light",
		label: "Light Variant",
		description: "Icon optimized for light backgrounds",
		field: "light",
	},
	{
		id: "wordmark",
		label: "Wordmark",
		description: "Logo with text/wordmark",
		field: "wordmark",
	},
	{
		id: "wordmark_dark",
		label: "Wordmark Dark",
		description: "Wordmark optimized for dark backgrounds",
		field: "wordmark_dark",
	},
]

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

export function AdvancedIconSubmissionForm() {
	const [iconName, setIconName] = useState("")
	const [isExistingIcon, setIsExistingIcon] = useState(false)
	const [activeVariants, setActiveVariants] = useState<string[]>(["base"])
	const [files, setFiles] = useState<Record<string, File[]>>({})
	const [aliases, setAliases] = useState<string[]>([])
	const [aliasInput, setAliasInput] = useState("")
	const [categories, setCategories] = useState<string[]>([])
	const [description, setDescription] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleAddVariant = (variantId: string) => {
		if (!activeVariants.includes(variantId)) {
			setActiveVariants([...activeVariants, variantId])
		}
	}

	const handleRemoveVariant = (variantId: string) => {
		if (variantId !== "base") {
			setActiveVariants(activeVariants.filter((id) => id !== variantId))
			const newFiles = { ...files }
			delete newFiles[variantId]
			setFiles(newFiles)
		}
	}

	const handleFileDrop = (variantId: string, droppedFiles: File[]) => {
		setFiles({
			...files,
			[variantId]: droppedFiles,
		})
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

	const toggleCategory = (category: string) => {
		if (categories.includes(category)) {
			setCategories(categories.filter((c) => c !== category))
		} else {
			setCategories([...categories, category])
		}
	}

	const handleSubmit = async () => {
		if (!iconName.trim()) {
			toast.error("Please enter an icon name")
			return
		}

		if (!files.base || files.base.length === 0) {
			toast.error("Please upload at least the base icon")
			return
		}

		if (categories.length === 0) {
			toast.error("Please select at least one category")
			return
		}

		if (!pb.authStore.isValid) {
			toast.error("You must be logged in to submit an icon")
			return
		}

		setIsSubmitting(true)

		try {
			const assetFiles: File[] = []

			// Add base file
			if (files.base?.[0]) {
				assetFiles.push(files.base[0])
			}

			// Build extras object
			const extras: any = {
				aliases: aliases,
				categories: categories,
				base: files.base[0]?.name.split(".").pop() || "svg",
			}

			// Add color variants if present
			if (files.dark?.[0] || files.light?.[0]) {
				extras.colors = {}
				if (files.dark?.[0]) {
					extras.colors.dark = files.dark[0].name
					assetFiles.push(files.dark[0])
				}
				if (files.light?.[0]) {
					extras.colors.light = files.light[0].name
					assetFiles.push(files.light[0])
				}
			}

			// Add wordmark variants if present
			if (files.wordmark?.[0] || files.wordmark_dark?.[0]) {
				extras.wordmark = {}
				if (files.wordmark?.[0]) {
					extras.wordmark.light = files.wordmark[0].name
					assetFiles.push(files.wordmark[0])
				}
				if (files.wordmark_dark?.[0]) {
					extras.wordmark.dark = files.wordmark_dark[0].name
					assetFiles.push(files.wordmark_dark[0])
				}
			}

			// Create submission
			const submissionData = {
				name: iconName,
				assets: assetFiles,
				created_by: pb.authStore.model?.id,
				status: "pending",
				extras: extras,
			}

			await pb.collection("submissions").create(submissionData)

			toast.success(isExistingIcon ? "Icon update submitted!" : "Icon submitted!", {
				description: isExistingIcon
					? `Your update for "${iconName}" has been submitted for review`
					: `Your icon "${iconName}" has been submitted for review`,
			})

			// Reset form
			setIconName("")
			setFiles({})
			setActiveVariants(["base"])
			setAliases([])
			setCategories([])
			setDescription("")
		} catch (error: any) {
			console.error("Submission error:", error)
			toast.error("Failed to submit icon", {
				description: error?.message || "Please try again later",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Icon Name Section */}
			<Card>
				<CardHeader>
					<CardTitle>Icon Identification</CardTitle>
					<CardDescription>Choose a unique identifier for your icon</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="icon-name">Icon Name / ID</Label>
						<IconNameCombobox value={iconName} onValueChange={setIconName} onIsExisting={setIsExistingIcon} />
						<p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
					</div>

					{isExistingIcon && (
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								This icon ID already exists. Your submission will be treated as an <strong>update</strong> to the
								existing icon.
							</AlertDescription>
						</Alert>
					)}

					{iconName && !isExistingIcon && (
						<Alert className="border-green-500/50 bg-green-500/10">
							<AlertDescription className="text-green-600 dark:text-green-400">
								This is a new icon submission.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Icon Variants Section */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle>Icon Variants</CardTitle>
							<CardDescription>Upload different versions of your icon</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{activeVariants.map((variantId) => {
						const variant = VARIANTS.find((v) => v.id === variantId)
						if (!variant) return null

						return (
							<div key={variantId} className="space-y-3 p-4 border rounded-lg bg-background/50">
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<Label className="text-base font-semibold">{variant.label}</Label>
											{variant.id === "base" && <Badge variant="secondary">Required</Badge>}
										</div>
										<p className="text-sm text-muted-foreground mt-1">{variant.description}</p>
									</div>
									{variant.id !== "base" && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveVariant(variantId)}
											className="text-destructive"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
								</div>

								<Dropzone
									accept={{
										"image/svg+xml": [".svg"],
										"image/png": [".png"],
										"image/webp": [".webp"],
									}}
									maxSize={1024 * 1024 * 5}
									maxFiles={1}
									onDrop={(droppedFiles) => handleFileDrop(variantId, droppedFiles)}
									onError={(error) => toast.error(error.message)}
									src={files[variantId]}
								>
									<DropzoneEmptyState />
									<DropzoneContent />
								</Dropzone>
							</div>
						)
					})}

					<Separator />

					<div className="flex flex-wrap gap-2">
						<p className="text-sm text-muted-foreground w-full mb-2">Add variant:</p>
						{VARIANTS.filter((v) => !activeVariants.includes(v.id)).map((variant) => (
							<Button
								key={variant.id}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => handleAddVariant(variant.id)}
							>
								<Plus className="h-4 w-4 mr-2" />
								{variant.label}
							</Button>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Metadata Section */}
			<Card>
				<CardHeader>
					<CardTitle>Icon Metadata</CardTitle>
					<CardDescription>Provide additional information about your icon</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Categories */}
					<div className="space-y-3">
						<Label>Categories</Label>
						<div className="flex flex-wrap gap-2">
							{AVAILABLE_CATEGORIES.map((category) => (
								<Badge
									key={category}
									variant={categories.includes(category) ? "default" : "outline"}
									className="cursor-pointer hover:bg-primary/80"
									onClick={() => toggleCategory(category)}
								>
									{category.replace(/-/g, " ")}
								</Badge>
							))}
						</div>
						<p className="text-sm text-muted-foreground">Select all categories that apply to your icon</p>
					</div>

					<Separator />

					{/* Aliases */}
					<div className="space-y-3">
						<Label htmlFor="alias-input">Aliases</Label>
						<div className="flex gap-2">
							<Input
								id="alias-input"
								placeholder="Add alternative name..."
								value={aliasInput}
								onChange={(e) => setAliasInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault()
										handleAddAlias()
									}
								}}
							/>
							<Button type="button" onClick={handleAddAlias}>
								<Plus className="h-4 w-4 mr-2" />
								Add
							</Button>
						</div>
						{aliases.length > 0 && (
							<div className="flex flex-wrap gap-2 mt-2">
								{aliases.map((alias) => (
									<Badge key={alias} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
										{alias}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-4 w-4 p-0 hover:bg-transparent"
											onClick={() => handleRemoveAlias(alias)}
										>
											<X className="h-3 w-3" />
										</Button>
									</Badge>
								))}
							</div>
						)}
						<p className="text-sm text-muted-foreground">Alternative names that users might search for</p>
					</div>

					<Separator />

					{/* Description */}
					<div className="space-y-3">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							placeholder="Brief description of the icon or service it represents..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
						<p className="text-sm text-muted-foreground">This helps reviewers understand your submission</p>
					</div>
				</CardContent>
			</Card>

			{/* Submit Button */}
			<div className="flex justify-end gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						setIconName("")
						setFiles({})
						setActiveVariants(["base"])
						setAliases([])
						setCategories([])
						setDescription("")
					}}
				>
					Clear Form
				</Button>
				<Button type="button" onClick={handleSubmit} disabled={isSubmitting} size="lg">
					{isSubmitting ? "Submitting..." : isExistingIcon ? "Submit Update" : "Submit New Icon"}
				</Button>
			</div>
		</div>
	)
}

