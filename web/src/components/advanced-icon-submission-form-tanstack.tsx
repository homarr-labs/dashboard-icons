"use client"

import { AlertCircle, Check, Plus, X } from "lucide-react"
import { useForm } from "@tanstack/react-form"
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
import { useState } from "react"

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

interface FormData {
	iconName: string
	isExistingIcon: boolean
	activeVariants: string[]
	files: Record<string, File[]>
	filePreviews: Record<string, string>
	aliases: string[]
	aliasInput: string
	categories: string[]
	description: string
}

export function AdvancedIconSubmissionFormTanStack() {
	const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})

	const form = useForm<FormData>({
		defaultValues: {
			iconName: "",
			isExistingIcon: false,
			activeVariants: ["base"],
			files: {},
			filePreviews: {},
			aliases: [],
			aliasInput: "",
			categories: [],
			description: "",
		},
		validators: {
			onChange: ({ value }) => {
				const errors: Partial<Record<keyof FormData, string>> = {}
				
				if (!value.iconName.trim()) {
					errors.iconName = "Icon name is required"
				} else if (!/^[a-z0-9-]+$/.test(value.iconName)) {
					errors.iconName = "Icon name must contain only lowercase letters, numbers, and hyphens"
				}
				
				if (!value.files.base || value.files.base.length === 0) {
					errors.files = "At least the base icon is required"
				}
				
				if (value.categories.length === 0) {
					errors.categories = "At least one category is required"
				}
				
				return Object.keys(errors).length > 0 ? errors : undefined
			},
		},
		onSubmit: async ({ value }) => {
			if (!pb.authStore.isValid) {
				toast.error("You must be logged in to submit an icon")
				return
			}

			try {
				const assetFiles: File[] = []

				// Add base file
				if (value.files.base?.[0]) {
					assetFiles.push(value.files.base[0])
				}

				// Build extras object
				const extras: any = {
					aliases: value.aliases,
					categories: value.categories,
					base: value.files.base[0]?.name.split(".").pop() || "svg",
				}

				// Add color variants if present
				if (value.files.dark?.[0] || value.files.light?.[0]) {
					extras.colors = {}
					if (value.files.dark?.[0]) {
						extras.colors.dark = value.files.dark[0].name
						assetFiles.push(value.files.dark[0])
					}
					if (value.files.light?.[0]) {
						extras.colors.light = value.files.light[0].name
						assetFiles.push(value.files.light[0])
					}
				}

				// Add wordmark variants if present
				if (value.files.wordmark?.[0] || value.files.wordmark_dark?.[0]) {
					extras.wordmark = {}
					if (value.files.wordmark?.[0]) {
						extras.wordmark.light = value.files.wordmark[0].name
						assetFiles.push(value.files.wordmark[0])
					}
					if (value.files.wordmark_dark?.[0]) {
						extras.wordmark.dark = value.files.wordmark_dark[0].name
						assetFiles.push(value.files.wordmark_dark[0])
					}
				}

				// Create submission
				const submissionData = {
					name: value.iconName,
					assets: assetFiles,
					created_by: pb.authStore.model?.id,
					status: "pending",
					extras: extras,
				}

				await pb.collection("submissions").create(submissionData)

				toast.success(value.isExistingIcon ? "Icon update submitted!" : "Icon submitted!", {
					description: value.isExistingIcon
						? `Your update for "${value.iconName}" has been submitted for review`
						: `Your icon "${value.iconName}" has been submitted for review`,
				})

				// Reset form
				form.reset()
				setFilePreviews({})
			} catch (error: any) {
				console.error("Submission error:", error)
				toast.error("Failed to submit icon", {
					description: error?.message || "Please try again later",
				})
			}
		},
	})

	const handleAddVariant = (variantId: string) => {
		const currentVariants = form.getFieldValue("activeVariants")
		if (!currentVariants.includes(variantId)) {
			form.setFieldValue("activeVariants", [...currentVariants, variantId])
		}
	}

	const handleRemoveVariant = (variantId: string) => {
		if (variantId !== "base") {
			const currentVariants = form.getFieldValue("activeVariants")
			form.setFieldValue("activeVariants", currentVariants.filter((id) => id !== variantId))
			
			const currentFiles = form.getFieldValue("files")
			const newFiles = { ...currentFiles }
			delete newFiles[variantId]
			form.setFieldValue("files", newFiles)
			
			const newPreviews = { ...filePreviews }
			delete newPreviews[variantId]
			setFilePreviews(newPreviews)
		}
	}

	const handleFileDrop = (variantId: string, droppedFiles: File[]) => {
		const currentFiles = form.getFieldValue("files")
		form.setFieldValue("files", {
			...currentFiles,
			[variantId]: droppedFiles,
		})
		
		// Generate preview for the first file
		if (droppedFiles.length > 0) {
			const reader = new FileReader()
			reader.onload = (e) => {
				if (typeof e.target?.result === 'string') {
					setFilePreviews({
						...filePreviews,
						[variantId]: e.target.result,
					})
				}
			}
			reader.readAsDataURL(droppedFiles[0])
		}
	}

	const handleAddAlias = () => {
		const aliasInput = form.getFieldValue("aliasInput")
		const trimmedAlias = aliasInput.trim()
		if (trimmedAlias) {
			const currentAliases = form.getFieldValue("aliases")
			if (!currentAliases.includes(trimmedAlias)) {
				form.setFieldValue("aliases", [...currentAliases, trimmedAlias])
			}
			form.setFieldValue("aliasInput", "")
		}
	}

	const handleRemoveAlias = (alias: string) => {
		const currentAliases = form.getFieldValue("aliases")
		form.setFieldValue("aliases", currentAliases.filter((a) => a !== alias))
	}

	const toggleCategory = (category: string) => {
		const currentCategories = form.getFieldValue("categories")
		if (currentCategories.includes(category)) {
			form.setFieldValue("categories", currentCategories.filter((c) => c !== category))
		} else {
			form.setFieldValue("categories", [...currentCategories, category])
		}
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				{/* Icon Name Section */}
				<Card>
					<CardHeader>
						<CardTitle>Icon Identification</CardTitle>
						<CardDescription>Choose a unique identifier for your icon</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field
							name="iconName"
							validators={{
								onChange: ({ value }) => {
									if (!value) return "Icon name is required"
									if (!/^[a-z0-9-]+$/.test(value)) {
										return "Icon name must contain only lowercase letters, numbers, and hyphens"
									}
									return undefined
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="icon-name">Icon Name / ID</Label>
									<IconNameCombobox 
										value={field.state.value} 
										onValueChange={field.handleChange} 
										onIsExisting={(isExisting) => form.setFieldValue("isExistingIcon", isExisting)} 
									/>
									<p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
									{!field.state.meta.isValid && field.state.meta.isTouched && (
										<p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="isExistingIcon">
							{(field) => (
								<>
									{field.state.value && (
										<Alert>
											<AlertCircle className="h-4 w-4" />
											<AlertDescription>
												This icon ID already exists. Your submission will be treated as an <strong>update</strong> to the
												existing icon.
											</AlertDescription>
										</Alert>
									)}

									{form.getFieldValue("iconName") && !field.state.value && (
										<Alert className="border-green-500/50 bg-green-500/10">
											<AlertDescription className="text-green-600 dark:text-green-400">
												This is a new icon submission.
											</AlertDescription>
										</Alert>
									)}
								</>
							)}
						</form.Field>
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
						<form.Field name="activeVariants">
							{(field) => (
								<>
									{field.state.value.map((variantId) => {
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
													src={form.getFieldValue("files")[variantId]}
												>
													<DropzoneEmptyState />
													<DropzoneContent>
														{filePreviews[variantId] && (
															<div className="h-[102px] w-full">
																<img
																	alt="Preview"
																	className="absolute top-0 left-0 h-full w-full object-cover"
																	src={filePreviews[variantId]}
																/>
															</div>
														)}
													</DropzoneContent>
												</Dropzone>
											</div>
										)
									})}
								</>
							)}
						</form.Field>

						<Separator />

						<div className="flex flex-wrap gap-2">
							<p className="text-sm text-muted-foreground w-full mb-2">Add variant:</p>
							{VARIANTS.filter((v) => !form.getFieldValue("activeVariants").includes(v.id)).map((variant) => (
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
						<form.Field name="categories">
							{(field) => (
								<div className="space-y-3">
									<Label>Categories</Label>
									<div className="flex flex-wrap gap-2">
										{AVAILABLE_CATEGORIES.map((category) => (
											<Badge
												key={category}
												variant={field.state.value.includes(category) ? "default" : "outline"}
												className="cursor-pointer hover:bg-primary/80"
												onClick={() => toggleCategory(category)}
											>
												{category.replace(/-/g, " ")}
											</Badge>
										))}
									</div>
									<p className="text-sm text-muted-foreground">Select all categories that apply to your icon</p>
									{!field.state.meta.isValid && field.state.meta.isTouched && (
										<p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
									)}
								</div>
							)}
						</form.Field>

						<Separator />

						{/* Aliases */}
						<div className="space-y-3">
							<Label htmlFor="alias-input">Aliases</Label>
							<form.Field name="aliasInput">
								{(field) => (
									<div className="flex gap-2">
										<Input
											id="alias-input"
											placeholder="Add alternative name..."
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
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
								)}
							</form.Field>
							
							<form.Field name="aliases">
								{(field) => (
									<>
										{field.state.value.length > 0 && (
											<div className="flex flex-wrap gap-2 mt-2">
												{field.state.value.map((alias) => (
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
									</>
								)}
							</form.Field>
							<p className="text-sm text-muted-foreground">Alternative names that users might search for</p>
						</div>

						<Separator />

						{/* Description */}
						<form.Field name="description">
							{(field) => (
								<div className="space-y-3">
									<Label htmlFor="description">Description (Optional)</Label>
									<Textarea
										id="description"
										placeholder="Brief description of the icon or service it represents..."
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										rows={3}
									/>
									<p className="text-sm text-muted-foreground">This helps reviewers understand your submission</p>
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							form.reset()
							setFilePreviews({})
						}}
					>
						Clear Form
					</Button>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]: [boolean, boolean]) => (
							<Button type="submit" disabled={!canSubmit || isSubmitting} size="lg">
								{isSubmitting ? "Submitting..." : form.getFieldValue("isExistingIcon") ? "Submit Update" : "Submit New Icon"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	)
}
