"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import type { IconNameOption } from "@/hooks/use-submissions"
import { pb } from "@/lib/pb"
import { ASSET_EXTENSIONS, MAX_ASSET_BYTES, type SubmissionInput } from "@/lib/submission-service"
import { SUBMISSION_VARIANTS, type SubmissionVariant, VARIANT_KINDS, type VariantKind } from "@/lib/submission-variants"
import { submitProposal } from "@/lib/submit-proposal"

export interface VariantConfig extends VariantKind {
	id: SubmissionVariant
}

export const VARIANTS: VariantConfig[] = SUBMISSION_VARIANTS.map((id) => ({ id, ...VARIANT_KINDS[id] }))

export { SUBMISSION_CATEGORIES as AVAILABLE_CATEGORIES } from "@/lib/submission-categories"

export interface FormData {
	iconName: string
	files: Record<string, File[]>
	aliases: string[]
	aliasInput: string
	categories: string[]
	description: string
}

export const ACCEPTED_FILE_TYPES: Record<string, string[]> = Object.fromEntries(
	Object.entries(ASSET_EXTENSIONS).map(([type, extension]) => [type, [`.${extension}`]]),
)

export const MAX_FILE_SIZE = MAX_ASSET_BYTES

export function useIconSubmissionForm() {
	const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [selectedIcon, setSelectedIcon] = useState<IconNameOption | null>(null)
	const isSubmittingRef = useRef(false)
	const router = useRouter()

	const form = useForm({
		defaultValues: {
			iconName: "",
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
				const assets: SubmissionInput["assets"] = {}
				for (const variant of SUBMISSION_VARIANTS) {
					const file = value.files[variant]?.[0]
					if (file) assets[variant] = file
				}

				const record = await submitProposal({
					name: value.iconName,
					description: value.description,
					aliases: value.aliases,
					categories: value.categories,
					targetSubmission: selectedIcon?.submissionId ?? "",
					assets,
				})

				await revalidateAllSubmissions()

				toast.success("Icon submitted!", {
					description: `Your icon "${value.iconName}" has been submitted for review`,
				})

				router.push(`/community/submissions/${record.id}`)

				form.reset()
				setFilePreviews({})
				setSelectedIcon(null)
			} catch (error: unknown) {
				console.error("Submission error:", error)
				toast.error("Failed to submit icon", {
					description: error instanceof Error ? error.message : "Please try again later",
				})
			} finally {
				isSubmittingRef.current = false
				setIsSubmitting(false)
			}
		},
	})

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
			const result = e.target?.result
			if (typeof result === "string") {
				setFilePreviews((prev) => ({
					...prev,
					[variantId]: result,
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
		setSelectedIcon(null)
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
		handleFileDrop,
		handleAddAlias,
		handleRemoveAlias,
		toggleCategory,
		resetForm,
		iconNameValidator,
		setSelectedIcon,
	}
}
