"use client"

import { useForm } from "@tanstack/react-form"
import { FileImage, FileType } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import type { MultiSelectOption } from "@/components/ui/multi-select"
import { pb } from "@/lib/pb"

export interface VariantConfig {
	id: string
	label: string
	description: string
	field: "base" | "dark" | "light" | "wordmark" | "wordmark_dark"
}

export const VARIANTS: VariantConfig[] = [
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
		label: "Wordmark Light",
		description: "Wordmark optimized for light backgrounds",
		field: "wordmark",
	},
	{
		id: "wordmark_dark",
		label: "Wordmark Dark",
		description: "Wordmark optimized for dark backgrounds",
		field: "wordmark_dark",
	},
]

export const VARIANT_OPTIONS: MultiSelectOption[] = VARIANTS.map((variant) => ({
	label: variant.label,
	value: variant.id,
	icon: variant.id === "base" ? FileImage : FileType,
	disabled: variant.id === "base",
}))

export const AVAILABLE_CATEGORIES = [
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
	"utility"
]

export interface FormData {
	iconName: string
	selectedVariants: string[]
	files: Record<string, File[]>
	aliases: string[]
	aliasInput: string
	categories: string[]
	description: string
}

export const ACCEPTED_FILE_TYPES = {
	"image/svg+xml": [".svg"],
	"image/png": [".png"]
}

export const MAX_FILE_SIZE = 1024 * 1024 * 5

export function useIconSubmissionForm() {
	const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const isSubmittingRef = useRef(false)
	const router = useRouter()

	const form = useForm({
		defaultValues: {
			iconName: "",
			selectedVariants: ["base"],
			files: {} as Record<string, File[]>,
			aliases: [] as string[],
			aliasInput: "",
			categories: [] as string[],
			description: "",
		} satisfies FormData,
		onSubmit: async ({ value }) => {
			if (isSubmittingRef.current) return
			
			if (!pb.authStore.isValid) {
				toast.error("You must be logged in to submit an icon")
				return
			}

			const baseFile = value.files.base?.[0]
			if (!baseFile) {
				toast.error("Base icon is required", {
					description: "Please upload a base icon file before submitting",
				})
				return
			}

			isSubmittingRef.current = true
			setIsSubmitting(true)

			try {
				const assetFiles: File[] = [baseFile]

				const extras: any = {
					aliases: value.aliases,
					categories: value.categories,
					base: baseFile.name.split(".").pop() || "svg",
				}

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

				const submissionData = {
					name: value.iconName,
					assets: assetFiles,
					created_by: (pb.authStore.record as any)?.id ?? pb.authStore.record?.id,
					status: "pending",
					description: value.description,
					extras: extras,
				}

				const record = await pb.collection("submissions").create(submissionData)

				if (record.assets && record.assets.length > 0) {
					const updatedExtras = JSON.parse(JSON.stringify(extras))
					let assetIndex = 0

					// Skip base file at index 0, as it's already handled above
					// The order of asset files matches the order they were pushed to assetFiles array:
					// base (index 0), dark (if exists), light (if exists), wordmark (if exists), wordmark_dark (if exists)
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

				await revalidateAllSubmissions()

				toast.success("Icon submitted!", {
					description: `Your icon "${value.iconName}" has been submitted for review`,
				})

				router.push(`/community/${encodeURIComponent(record.name || value.iconName)}`)

				form.reset()
				setFilePreviews({})
			} catch (error: any) {
				console.error("Submission error:", error)
				toast.error("Failed to submit icon", {
					description: error?.message || "Please try again later",
				})
			} finally {
				isSubmittingRef.current = false
				setIsSubmitting(false)
			}
		},
	})

	const handleRemoveVariant = (variantId: string) => {
		if (variantId !== "base") {
			const currentVariants = form.getFieldValue("selectedVariants")
			form.setFieldValue(
				"selectedVariants",
				currentVariants.filter((v) => v !== variantId),
			)

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
		
		if (droppedFiles.length === 0) {
			const newFiles = { ...currentFiles }
			delete newFiles[variantId]
			form.setFieldValue("files", newFiles)
			
			setFilePreviews((prev) => {
				const newPreviews = { ...prev }
				delete newPreviews[variantId]
				return newPreviews
			})
			return
		}
		
		form.setFieldValue("files", {
			...currentFiles,
			[variantId]: droppedFiles,
		})

		const reader = new FileReader()
		reader.onload = (e) => {
			if (typeof e.target?.result === "string") {
				setFilePreviews((prev) => ({
					...prev,
					[variantId]: e.target!.result as string,
				}))
			}
		}
		reader.onerror = () => {
			toast.error("Failed to read file", {
				description: "Please try uploading again",
			})
		}
		reader.readAsDataURL(droppedFiles[0])
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

	const resetForm = () => {
		if (isSubmittingRef.current) return
		form.reset()
		setFilePreviews({})
	}

	const iconNameValidator = ({ value }: { value: string }) => {
		if (!value) return "Icon name is required"
		if (!/^[a-z0-9-]+$/.test(value)) {
			return "Icon name must contain only lowercase letters, numbers, and hyphens"
		}
		return undefined
	}

	return {
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
	}
}
