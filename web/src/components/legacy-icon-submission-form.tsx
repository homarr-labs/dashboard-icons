"use client"

import { FileType, FolderOpen, Plus, Send, Sparkles, Tag, Upload, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { CustomVariantInput } from "@/components/custom-variant-input"
import { IconPreviewCard } from "@/components/icon-card"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { IconSubmissionGuidelines } from "@/components/icon-submission-guidelines"
import { MagicCardPointerProvider } from "@/components/magicui/magic-card-pointer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/shadcn-io/dropzone"
import { Textarea } from "@/components/ui/textarea"
import { VariantPreview } from "@/components/variant-preview"
import { ACCEPTED_FILE_TYPES, AVAILABLE_CATEGORIES, MAX_FILE_SIZE, useIconSubmissionForm } from "@/hooks/use-icon-submission-form"
import { useIsMobile } from "@/hooks/use-mobile"
import type { IconNameOption } from "@/hooks/use-submissions"
import { cn } from "@/lib/utils"

export function IconSubmissionContent() {
	return (
		<div className="flex flex-col gap-6">
			<div className="text-center space-y-2">
				<h3 className="text-2xl font-semibold">
					It looks like we don't have that one yet...
					<br />
				</h3>
				<p className="text-muted-foreground">
					Thankfully, this website is made by people just like you.
					<br />
					You can submit your icons using{" "}
					<Link href="/submit" className="text-primary underline">
						our submission form
					</Link>{" "}
					directly on the website.
				</p>
			</div>
		</div>
	)
}

export function LegacyIconSubmissionForm({ initialIcon }: { initialIcon?: IconNameOption }) {
	const isMobile = useIsMobile()
	const {
		form,
		filePreviews,
		isSubmitting,
		handleFileDrop,
		handleAddAlias,
		handleRemoveAlias,
		toggleCategory,
		resetForm,
		iconNameValidator,
		setSelectedIcon,
		variants,
		customNames,
		addCustomVariant,
		removeCustomVariant,
	} = useIconSubmissionForm(initialIcon)

	const hasAnyPreview = Object.keys(filePreviews).length > 0

	return (
		<div
			className={cn(
				"w-full max-w-7xl mx-auto [&_button]:min-h-11 [&_button]:min-w-11 [&_input:not([type=file])]:min-h-11 [&_[role=option]]:min-h-11 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-ring [&_button:focus-visible]:outline-offset-2",
				isMobile && "pb-24",
			)}
			data-submission-form
		>
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
							<CardHeader className="px-4 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 flex items-center justify-center shrink-0">
										<Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-lg sm:text-xl">Icon Identity</CardTitle>
										<CardDescription className="text-xs sm:text-sm">
											Choose an icon name or select a submission to propose an update
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4 px-4 sm:px-6">
								<form.Field name="iconName" validators={{ onChange: iconNameValidator }}>
									{(field) => (
										<div className="space-y-2">
											<Label className="text-sm font-medium">Icon Name / ID</Label>
											<IconNameCombobox
												value={field.state.value}
												onValueChange={field.handleChange}
												onIconSelected={setSelectedIcon}
												error={field.state.meta.errors.join(", ")}
												isInvalid={!field.state.meta.isValid && field.state.meta.isTouched}
											/>
											<p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and hyphens only (e.g., my-app-icon)</p>
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
											<p className="text-xs text-muted-foreground">This helps reviewers understand your submission</p>
										</div>
									)}
								</form.Field>
							</CardContent>
						</Card>

						<Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden border-t-4 border-t-blue-500 rounded-none">
							<CardHeader className="px-4 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-500/10 flex items-center justify-center shrink-0">
										<FileType className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
									</div>
									<div>
										<CardTitle className="text-lg sm:text-xl">File Uploads</CardTitle>
										<CardDescription className="text-xs sm:text-sm">Upload SVG or PNG icons (max 5MB each)</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4 px-4 sm:px-6">
								<IconSubmissionGuidelines />

								<form.Field name="files">
									{(field) => (
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
											{variants.map((variant) => {
												const files = field.state.value[variant.id]
												const preview = filePreviews[variant.id]
												const isBase = variant.id === "base"
												return (
													<div
														key={variant.id}
														className={cn(
															"relative flex min-w-0 flex-col p-4 transition-colors",
															files ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30 ring-1 ring-border",
														)}
													>
														<div className="mb-1 flex min-h-6 items-center gap-2 pr-10">
															<span className="break-all font-medium text-sm">{variant.label}</span>
															{isBase && <span className="bg-primary/20 px-1.5 py-0.5 font-medium text-[10px] text-primary">Required</span>}
														</div>
														<p className="mb-3 text-muted-foreground text-xs">{variant.description}</p>
														{(files || variant.id.startsWith("custom:")) && (
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => {
																	if (variant.id.startsWith("custom:")) removeCustomVariant(variant.id.slice(7))
																	else handleFileDrop(variant.id, [])
																}}
																aria-label={`Remove ${variant.label} variant`}
																className="absolute top-1 right-1 size-11 hover:bg-destructive/10 hover:text-destructive"
															>
																<X className="size-4" />
															</Button>
														)}
														<Dropzone
															accept={ACCEPTED_FILE_TYPES}
															maxSize={MAX_FILE_SIZE}
															maxFiles={1}
															onDrop={(dropped) => handleFileDrop(variant.id, dropped)}
															onError={(error) => toast.error(error.message)}
															src={files}
															className={cn(
																"mt-auto h-auto min-h-24 whitespace-normal p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
																files && "border-primary/30",
															)}
														>
															<DropzoneEmptyState>
																<div className="flex flex-col items-center gap-1">
																	<Upload className="size-4 text-muted-foreground" />
																	<span className="break-all font-medium text-sm">Upload {variant.label} file</span>
																	<span className="text-muted-foreground text-xs">SVG or PNG, drag and drop or click</span>
																</div>
															</DropzoneEmptyState>
															<DropzoneContent>
																<div className="flex w-full min-w-0 flex-col gap-2">
																	{preview && (
																		<VariantPreview
																			src={preview}
																			alt={`${variant.label} preview`}
																			background={variant.background}
																			className="h-20 w-full"
																		/>
																	)}
																	<span className="truncate font-medium text-xs">{files?.[0]?.name}</span>
																	<span className="text-muted-foreground text-xs">Drop or click to replace</span>
																</div>
															</DropzoneContent>
														</Dropzone>
													</div>
												)
											})}
										</div>
									)}
								</form.Field>
								<CustomVariantInput names={customNames} onAdd={addCustomVariant} />
							</CardContent>
						</Card>

						<Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden border-t-4 border-t-emerald-500 rounded-none">
							<CardHeader className="px-4 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-500/10 flex items-center justify-center shrink-0">
										<Tag className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
									</div>
									<div>
										<CardTitle className="text-lg sm:text-xl">Metadata</CardTitle>
										<CardDescription className="text-xs sm:text-sm">Add categories and aliases for discoverability</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-6 px-4 sm:px-6">
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
																	: "bg-muted hover:bg-muted/80",
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
													placeholder="Add alternative names..."
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault()
															handleAddAlias()
														}
													}}
												/>
												<Button type="button" variant="secondary" onClick={handleAddAlias} aria-label="Add alias">
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
														<Badge key={alias} variant="secondary" className="pr-1 bg-muted hover:bg-muted/80">
															{alias}
															<button
																type="button"
																onClick={() => handleRemoveAlias(alias)}
																aria-label={`Remove ${alias} alias`}
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
					<div className={cn("space-y-6", !isMobile && "sticky top-20")}>
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
											<MagicCardPointerProvider
												className={cn(
													"grid gap-3",
													isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-1",
												)}
											>
												{variants.map((variant) => {
													const preview = filePreviews[variant.id]
													if (!preview) return null
													return (
														<IconPreviewCard
															key={variant.id}
															preview={preview}
															label={variant.label}
															background={variant.background}
															name={iconName || "preview"}
														/>
													)
												})}
											</MagicCardPointerProvider>
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

						{!isMobile && (
							<Card className="border-0 shadow-lg overflow-hidden border-t-4 border-t-primary p-2 rounded-none">
								<CardContent className="px-2">
									<div className="flex flex-col gap-3">
										<form.Subscribe
											selector={(state) => ({
												canSubmit: state.canSubmit,
												hasBaseFile: Boolean(state.values.files.base?.[0]),
											})}
										>
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
						)}
					</div>
				</div>
			</div>

			{isMobile && (
				<div
					data-submission-actions
					className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3"
				>
					<div className="flex gap-2 max-w-7xl mx-auto">
						<Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} className="shrink-0">
							Clear form
						</Button>
						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								hasBaseFile: Boolean(state.values.files.base?.[0]),
							})}
						>
							{({ canSubmit, hasBaseFile }) => (
								<Button
									type="button"
									onClick={() => form.handleSubmit()}
									disabled={!canSubmit || !hasBaseFile || isSubmitting}
									className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
								>
									<Send className="h-4 w-4" />
									{isSubmitting ? "Submitting..." : "Submit Icon"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</div>
			)}
		</div>
	)
}
