"use client"

import { useForm } from "@tanstack/react-form"
import { Check, FileImage, FileType, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { IconSubmissionGuidelines } from "@/components/icon-submission-guidelines"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone"
import { Textarea } from "@/components/ui/textarea"
import { REPO_PATH } from "@/constants"
import { useExistingIconNames } from "@/hooks/use-submissions"
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

// Convert VARIANTS to MultiSelect options
const VARIANT_OPTIONS: MultiSelectOption[] = VARIANTS.map((variant) => ({
	label: variant.label,
	value: variant.id,
	icon: variant.id === "base" ? FileImage : FileType,
	disabled: variant.id === "base", // Base is always required
}))

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
	selectedVariants: string[]
	files: Record<string, File[]>
	filePreviews: Record<string, string>
	aliases: string[]
	aliasInput: string
	categories: string[]
	description: string
}

export function AdvancedIconSubmissionFormTanStack() {
	const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const { data: existingIcons = [] } = useExistingIconNames()

	const form = useForm({
		defaultValues: {
			iconName: "",
			selectedVariants: ["base"], // Base is always selected by default
			files: {},
			filePreviews: {},
			aliases: [],
			aliasInput: "",
			categories: [],
			description: "",
		} as FormData,
		onSubmit: async ({ value }) => {
			if (!pb.authStore.isValid) {
				toast.error("You must be logged in to submit an icon")
				return
			}

			setShowConfirmDialog(true)
		},
	})

	const handleConfirmedSubmit = async () => {
		const value = form.state.values
		setShowConfirmDialog(false)

		try {
			const assetFiles: File[] = []

			if (value.files.base?.[0]) {
				// Add base file
				assetFiles.push(value.files.base[0])
			}

			// Build extras object
			const extras: any = {
				aliases: value.aliases,
				categories: value.categories,
				base: value.files.base[0]?.name.split(".").pop() || "svg",
			}

			if (value.files.dark?.[0] || value.files.light?.[0]) {
				// Add color variants if present
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

			if (value.files.wordmark?.[0] || value.files.wordmark_dark?.[0]) {
				// Add wordmark variants if present
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
				created_by: pb.authStore.record?.id,
				status: "pending",
				description: value.description,
				extras: extras,
			}

			const record = await pb.collection("submissions").create(submissionData)

			if (record.assets && record.assets.length > 0) {
				// Update extras with real filenames from PocketBase response
				// PocketBase sanitizes and renames files, so we need to update our references
				const updatedExtras = JSON.parse(JSON.stringify(extras))
				let assetIndex = 0

				// Skip base icon (first asset) as we track it by 'base' format string only
				assetIndex++

				if (value.files.dark?.[0] && updatedExtras.colors) {
					updatedExtras.colors.dark = record.assets[assetIndex]
					assetIndex++
				}

				if (value.files.light?.[0] && updatedExtras.colors) {
					updatedExtras.colors.light = record.assets[assetIndex]
					assetIndex++
				}

				if (value.files.wordmark?.[0] && updatedExtras.wordmark) {
					updatedExtras.wordmark.light = record.assets[assetIndex]
					assetIndex++
				}

				if (value.files.wordmark_dark?.[0] && updatedExtras.wordmark) {
					updatedExtras.wordmark.dark = record.assets[assetIndex]
					assetIndex++
				}

				await pb.collection("submissions").update(record.id, {
					extras: updatedExtras,
				})
			}

			// Revalidate Next.js cache for community pages
			await revalidateAllSubmissions()

			toast.success("Icon submitted!", {
				description: `Your icon "${value.iconName}" has been submitted for review`,
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
	}

	const handleRemoveVariant = (variantId: string) => {
		if (variantId !== "base") {
			// Remove from selected variants
			const currentVariants = form.getFieldValue("selectedVariants")
			form.setFieldValue(
				"selectedVariants",
				currentVariants.filter((v) => v !== variantId),
			)

			// Remove files
			const currentFiles = form.getFieldValue("files")
			const newFiles = { ...currentFiles }
			delete newFiles[variantId]
			form.setFieldValue("files", newFiles)

			// Remove previews
			const newPreviews = { ...filePreviews }
			delete newPreviews[variantId]
			setFilePreviews(newPreviews)
		}
	}

	const handleVariantSelectionChange = (selectedValues: string[]) => {
		// Ensure base is always included
		const finalValues = selectedValues.includes("base") ? selectedValues : ["base", ...selectedValues]
		return finalValues
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
				if (typeof e.target?.result === "string") {
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
		form.setFieldValue(
			"aliases",
			currentAliases.filter((a) => a !== alias),
		)
	}

	const toggleCategory = (category: string) => {
		const currentCategories = form.getFieldValue("categories")
		if (currentCategories.includes(category)) {
			form.setFieldValue(
				"categories",
				currentCategories.filter((c) => c !== category),
			)
		} else {
			form.setFieldValue("categories", [...currentCategories, category])
		}
	}

	return (
		<div className="max-w-4xl mx-auto">

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent className="bg-background">
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Submission</AlertDialogTitle>
						<AlertDialogDescription>
							This icon submission form is a work-in-progress and is currently in an experimentation phase. If you want a faster review,
							please submit your icon to the dashboard icons{" "}
							<a href={REPO_PATH} target="_blank">
								{" "}
								github repository{" "}
							</a>{" "}
							instead.
							<br />
							<br />
							Do you still want to proceed with submitting your icon?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmedSubmit}>Yes, Submit Anyway</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<Card>
					<CardHeader>
						<CardTitle>Submit an Icon</CardTitle>
						<CardDescription>Fill in the details below to submit your icon for review</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Icon Name Section */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-1">Icon Identification</h3>
								<p className="text-sm text-muted-foreground">Choose a unique identifier for your icon</p>
							</div>

							<form.Field
								name="iconName"
								validators={{
									onChange: ({ value }) => {
										if (!value) return "Icon name is required"
										if (!/^[a-z0-9-]+$/.test(value)) {
											return "Icon name must contain only lowercase letters, numbers, and hyphens"
										}
										// Check if icon already exists
										const iconExists = existingIcons.some((icon) => icon.value === value)
										if (iconExists) {
											return "This icon already exists. Icon updates are not yet supported. Please choose a different name."
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
											error={field.state.meta.errors.join(", ")}
											isInvalid={!field.state.meta.isValid && field.state.meta.isTouched}
										/>
										<p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
									</div>
								)}
							</form.Field>
						</div>

						{/* Icon Preview Section */}
						{Object.keys(filePreviews).length > 0 && (
							<form.Subscribe
								selector={(state) => ({
									iconName: state.values.iconName,
									categories: state.values.categories,
								})}
							>
								{(state) => (
									<div className="space-y-4">
										<div>
											<h3 className="text-lg font-semibold mb-1">Icon Preview</h3>
											<p className="text-sm text-muted-foreground">How your icon will appear</p>
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
											{Object.entries(filePreviews).map(([variantId, preview]) => (
												<div key={variantId} className="flex flex-col gap-2">
													<div className="relative aspect-square rounded-lg border bg-card p-4 flex items-center justify-center">
														<img alt={`${variantId} preview`} className="max-h-full max-w-full object-contain" src={preview} />
													</div>
													<div className="text-center">
														<p className="text-xs font-mono text-muted-foreground">{state.iconName || "preview"}</p>
														<p className="text-xs text-muted-foreground capitalize">{variantId}</p>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</form.Subscribe>
						)}

						{/* Icon Variants Section */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-1">Icon Variants</h3>
								<p className="text-sm text-muted-foreground">Select which variants you want to upload</p>
							</div>

							<IconSubmissionGuidelines />

							<form.Field name="selectedVariants">
								{(field) => (
									<>
										<div className="space-y-3">
											<Label>Variant Selection</Label>
											<MultiSelect
												options={VARIANT_OPTIONS}
												defaultValue={field.state.value}
												onValueChange={(values) => {
													const finalValues = handleVariantSelectionChange(values)
													field.handleChange(finalValues)
												}}
												placeholder="Select icon variants..."
												maxCount={5}
												searchable={false}
												hideSelectAll={true}
												resetOnDefaultValueChange={true}
											/>
											<p className="text-sm text-muted-foreground">
												Base icon is required and cannot be removed. Select additional variants as needed.
											</p>
										</div>

										{/* Upload zones for selected variants - using field.state.value for reactivity */}
										<div className="grid gap-3 mt-4">
											{field.state.value.map((variantId) => {
												const variant = VARIANTS.find((v) => v.id === variantId)
												if (!variant) return null

												const hasFile = form.getFieldValue("files")[variant.id]?.length > 0
												const isBase = variant.id === "base"

												return (
													<Card
														key={variantId}
														className={`relative transition-all ${hasFile ? "border-primary bg-primary/5" : "border-border"}`}
													>
														{/* Remove button at top-right corner */}
														{!isBase && (
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => handleRemoveVariant(variant.id)}
																className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive z-10"
																aria-label={`Remove ${variant.label}`}
															>
																<X className="h-4 w-4" />
															</Button>
														)}

														<div className="p-4">
															<div className="space-y-2">
																<div className="flex items-center gap-2">
																	<h4 className="text-sm font-semibold">{variant.label}</h4>
																	{isBase && (
																		<Badge variant="secondary" className="text-xs">
																			Required
																		</Badge>
																	)}
																	{hasFile && (
																		<Badge variant="default" className="text-xs">
																			<Check className="h-3 w-3 mr-1" />
																			Uploaded
																		</Badge>
																	)}
																</div>
																<p className="text-xs text-muted-foreground">{variant.description}</p>

																<Dropzone
																	accept={{
																		"image/svg+xml": [".svg"],
																		"image/png": [".png"],
																		"image/webp": [".webp"],
																	}}
																	maxSize={1024 * 1024 * 5}
																	maxFiles={1}
																	onDrop={(droppedFiles) => handleFileDrop(variant.id, droppedFiles)}
																	onError={(error) => toast.error(error.message)}
																	src={form.getFieldValue("files")[variant.id]}
																>
																	<DropzoneEmptyState />
																	<DropzoneContent>
																		{filePreviews[variant.id] && (
																			<div className="absolute inset-0 flex items-center justify-center p-2">
																				<img
																					alt={`${variant.label} preview`}
																					className="max-h-full max-w-full object-contain"
																					src={filePreviews[variant.id]}
																				/>
																			</div>
																		)}
																	</DropzoneContent>
																</Dropzone>
															</div>
														</div>
													</Card>
												)
											})}
										</div>
									</>
								)}
							</form.Field>
						</div>

						{/* Metadata Section */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-1">Icon Metadata</h3>
								<p className="text-sm text-muted-foreground">Provide additional information about your icon</p>
							</div>

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
						</div>

						{/* Submit Button */}
						<div className="flex justify-end gap-4 pt-4">
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
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							>
								{(state) => (
									<Button type="submit" disabled={!state.canSubmit || state.isSubmitting} size="lg">
										{state.isSubmitting ? "Submitting..." : "Submit New Icon"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	)
}
