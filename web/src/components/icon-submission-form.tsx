"use client"

import { Check, FileType, FolderOpen, Plus, Send, Sparkles, Tag, Upload, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { IconPreviewCard } from "@/components/icon-card"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { IconSubmissionGuidelines } from "@/components/icon-submission-guidelines"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone"
import { Textarea } from "@/components/ui/textarea"
import {
	ACCEPTED_FILE_TYPES,
	AVAILABLE_CATEGORIES,
	MAX_FILE_SIZE,
	VARIANTS,
	useIconSubmissionForm,
} from "@/hooks/use-icon-submission-form"
import { cn } from "@/lib/utils"

export function IconSubmissionContent() {
	return (
		<div className="flex flex-col gap-6">
			<div className="text-center space-y-2">
				<h3 className="text-2xl font-semibold">
					It looks like we don't have that one yet...<br />
				</h3>
				<p className="text-muted-foreground">
					Thankfully, this website is made by people just like you.<br />
					You can submit your icons using <Link href="/submit" className="text-primary underline">our submission form</Link> directly on the website.
				</p>
			</div>
		</div>
	)
}

export function IconSubmissionForm() {
	const {
		form,
		filePreviews,
		isSubmitting,
		handleRemoveVariant,
		handleFileDrop,
		handleAddAlias,
		handleRemoveAlias,
		toggleCategory,
		resetForm,
		iconNameValidator,
	} = useIconSubmissionForm()

	const addVariant = (variantId: string) => {
		const current = form.getFieldValue("selectedVariants")
		if (!current.includes(variantId)) {
			form.setFieldValue("selectedVariants", [...current, variantId])
		}
	}

	const hasAnyPreview = Object.keys(filePreviews).length > 0

	return (
		<div className="w-full max-w-7xl mx-auto">
			<div className="grid lg:grid-cols-4 gap-6">
				<div className="lg:col-span-3 space-y-6">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							form.handleSubmit()
						}}
						className="space-y-6"
					>
						<Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden border-t-4 border-t-primary rounded-none">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-primary/10 flex items-center justify-center">
										<Sparkles className="h-5 w-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-xl">Icon Identity</CardTitle>
										<CardDescription>Choose a unique identifier for your icon submission</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<form.Field name="iconName" validators={{ onChange: iconNameValidator }}>
									{(field) => (
										<div className="space-y-2">
											<Label className="text-sm font-medium">Icon Name / ID</Label>
											<IconNameCombobox
												value={field.state.value}
												onValueChange={field.handleChange}
												error={field.state.meta.errors.join(", ")}
												isInvalid={!field.state.meta.isValid && field.state.meta.isTouched}
											/>
											<p className="text-xs text-muted-foreground">
												Use lowercase letters, numbers, and hyphens only (e.g., my-app-icon)
											</p>
										</div>
									)}
								</form.Field>

								<form.Field name="description">
									{(field) => (
										<div className="space-y-2">
											<Label className="text-sm font-medium">Description (Optional)</Label>
											<Textarea
												placeholder="Brief description of the icon or the service/application it represents..."
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												rows={2}
												className="resize-none"
											/>
											<p className="text-xs text-muted-foreground">
												This helps reviewers understand your submission
											</p>
										</div>
									)}
								</form.Field>
							</CardContent>
						</Card>

						<Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden border-t-4 border-t-blue-500 rounded-none">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-blue-500/10 flex items-center justify-center">
										<FileType className="h-5 w-5 text-blue-500" />
									</div>
									<div>
										<CardTitle className="text-xl">File Uploads</CardTitle>
										<CardDescription>Upload your icon files in SVG or PNG format (max 5MB each)</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<IconSubmissionGuidelines />

								<form.Field name="selectedVariants">
									{(field) => (
										<>
											<div className="space-y-2">
												<Label className="text-sm font-medium">Select Variants to Upload</Label>
												<div className="flex flex-wrap gap-2 p-3 bg-muted/50">
													{VARIANTS.map((variant) => {
														const isSelected = field.state.value.includes(variant.id)
														const isBase = variant.id === "base"
														const hasFile = form.getFieldValue("files")[variant.id]?.length > 0
														return (
															<button
																key={variant.id}
																type="button"
																disabled={isBase}
																onClick={() => !isBase && (isSelected ? handleRemoveVariant(variant.id) : addVariant(variant.id))}
																aria-label={isBase ? `${variant.label} - Required` : `Select ${variant.label}`}
																aria-pressed={isSelected}
																className={cn(
																	"inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
																	isSelected
																		? "bg-primary text-primary-foreground shadow-sm"
																		: "bg-background border hover:border-primary/50",
																	isBase && "opacity-100"
																)}
															>
																{hasFile && <Check className="h-3 w-3" />}
																{variant.label}
															</button>
														)
													})}
												</div>
												<p className="text-xs text-muted-foreground">
													Base icon is required. Click to add/remove optional variants (Dark, Light, Wordmarks).
												</p>
											</div>

											<div className="space-y-2">
												<Label className="text-sm font-medium">Upload Files</Label>
												<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
													{field.state.value.map((variantId) => {
														const variant = VARIANTS.find((v) => v.id === variantId)
														if (!variant) return null

														const hasFile = form.getFieldValue("files")[variant.id]?.length > 0
														const isBase = variant.id === "base"

														return (
															<div
																key={variantId}
																className={cn(
																	"relative p-4 transition-all",
																	hasFile
																		? "bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20"
																		: "bg-muted/30 ring-1 ring-border"
																)}
															>
																{!isBase && (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		onClick={() => handleRemoveVariant(variant.id)}
																		className="absolute top-2 right-2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
																	>
																		<X className="h-3 w-3" />
																	</Button>
																)}

																<div className="flex items-center gap-2 mb-1">
																	<span className="font-medium text-sm">{variant.label}</span>
																	{isBase && (
																		<span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary font-medium">
																			Required
																		</span>
																	)}
																</div>
																<p className="text-xs text-muted-foreground mb-3">{variant.description}</p>

																<Dropzone
																	accept={ACCEPTED_FILE_TYPES}
																	maxSize={MAX_FILE_SIZE}
																	maxFiles={1}
																	onDrop={(files) => handleFileDrop(variant.id, files)}
																	onError={(error) => toast.error(error.message)}
																	src={form.getFieldValue("files")[variant.id]}
																	className={cn("h-24", hasFile && "border-primary/30")}
																>
																	<DropzoneEmptyState />
																	<DropzoneContent />
																</Dropzone>
															</div>
														)
													})}
												</div>
											</div>
										</>
									)}
								</form.Field>
							</CardContent>
						</Card>

						<Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden border-t-4 border-t-emerald-500 rounded-none">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center">
										<Tag className="h-5 w-5 text-emerald-500" />
									</div>
									<div>
										<CardTitle className="text-xl">Metadata</CardTitle>
										<CardDescription>Add categories and aliases to help users discover your icon</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-6">
								<form.Field name="categories">
									{(field) => (
										<div className="space-y-3">
											<div className="flex items-center gap-2">
												<FolderOpen className="h-4 w-4 text-muted-foreground" />
												<Label className="text-sm font-medium">Categories</Label>
											</div>
											<div className="flex flex-wrap gap-2">
												{AVAILABLE_CATEGORIES.map((category) => {
													const isSelected = field.state.value.includes(category)
													return (
														<button
															key={category}
															type="button"
															onClick={() => toggleCategory(category)}
															aria-pressed={isSelected}
															aria-label={`${category.replace(/-/g, " ")} category`}
															className={cn(
																"px-3 py-1.5 text-sm transition-all cursor-pointer",
																isSelected
																	? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
																	: "bg-muted hover:bg-muted/80"
															)}
														>
															{category.replace(/-/g, " ")}
														</button>
													)
												})}
											</div>
											<p className="text-xs text-muted-foreground">
												Select all categories that apply to your icon. This improves discoverability.
											</p>
										</div>
									)}
								</form.Field>

								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<Tag className="h-4 w-4 text-muted-foreground" />
										<Label className="text-sm font-medium">Aliases</Label>
									</div>
									<form.Field name="aliasInput">
										{(field) => (
											<div className="flex gap-2">
												<Input
													placeholder="Add alternative names users might search for..."
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault()
															handleAddAlias()
														}
													}}
												/>
												<Button type="button" variant="secondary" onClick={handleAddAlias}>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										)}
									</form.Field>

									<form.Field name="aliases">
										{(field) =>
											field.state.value.length > 0 && (
												<div className="flex flex-wrap gap-2">
													{field.state.value.map((alias) => (
														<Badge
															key={alias}
															variant="secondary"
															className="pr-1 bg-muted hover:bg-muted/80"
														>
															{alias}
															<button
																type="button"
																onClick={() => handleRemoveAlias(alias)}
																className="ml-1.5 hover:text-destructive transition-colors"
															>
																<X className="h-3 w-3" />
															</button>
														</Badge>
													))}
												</div>
											)
										}
									</form.Field>
									<p className="text-xs text-muted-foreground">
										Add alternative names or abbreviations (e.g., "VS Code" for "visual-studio-code")
									</p>
								</div>
							</CardContent>
						</Card>
					</form>
				</div>

				<div className="lg:col-span-1">
					<div className="sticky top-20 space-y-6">
						<Card className="border-0 shadow-lg overflow-hidden border-t-4 border-t-violet-500 rounded-none">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 bg-violet-500/10 flex items-center justify-center">
										<Upload className="h-5 w-5 text-violet-500" />
									</div>
									<div>
										<CardTitle className="text-lg">Preview</CardTitle>
										<CardDescription>How your icons will appear</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{hasAnyPreview ? (
									<form.Subscribe selector={(state) => state.values.iconName}>
										{(iconName) => (
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-1 gap-3">
												{Object.entries(filePreviews).map(([variantId, preview]) => {
													const variant = VARIANTS.find((v) => v.id === variantId)
													return (
														<IconPreviewCard
															key={variantId}
															preview={preview}
															label={variant?.label || variantId}
															name={iconName || "preview"}
														/>
													)
												})}
											</div>
										)}
									</form.Subscribe>
								) : (
									<div className="flex flex-col items-center justify-center py-12 text-center">
										<div className="h-16 w-16 bg-muted/50 flex items-center justify-center mb-4">
											<Upload className="h-8 w-8 text-muted-foreground/50" />
										</div>
										<p className="text-sm text-muted-foreground">Upload icons to see preview</p>
										<p className="text-xs text-muted-foreground/70 mt-1">Your icons will appear here</p>
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-0 shadow-lg overflow-hidden border-t-4 border-t-primary p-2 rounded-none">
							<CardContent className="px-2">
								<div className="flex flex-col gap-3">
									<form.Subscribe selector={(state) => ({
										canSubmit: state.canSubmit,
										hasBaseFile: Boolean(state.values.files.base?.[0]),
									})}>
										{({ canSubmit, hasBaseFile }) => (
											<Button
												type="button"
												onClick={() => form.handleSubmit()}
												disabled={!canSubmit || !hasBaseFile || isSubmitting}
												className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
											>
												<Send className="h-4 w-4" />
												{isSubmitting ? "Submitting..." : "Submit Icon"}
											</Button>
										)}
									</form.Subscribe>
									<Button type="button" variant="outline" onClick={resetForm} className="w-full" disabled={isSubmitting}>
										Clear Form
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
