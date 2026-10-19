"use client"

import { useQueryClient } from "@tanstack/react-query"
import { type SetStateAction, useMemo, useRef, useState } from "react"
import { revalidateAllSubmissions } from "@/app/actions/submissions"
import { useSubmissionCatalog, useSubmissionHints } from "@/hooks/use-submission-catalog"
import { addDraftFiles, draftInput, isEmptyDraft, newSubmissionDraft, type SubmissionDraft } from "@/lib/submission-drafts"
import { MAX_SEND_ASSET_BYTES, MAX_SUBMISSIONS_PER_SEND } from "@/lib/submission-limits"
import { prepareSubmission } from "@/lib/submission-service"
import { customVariantNameError } from "@/lib/submission-variants"
import { type SentSubmission, SubmissionSendError, submitMany } from "@/lib/submit-many"

export function useSubmissionDrafts() {
	const [drafts, setDraftState] = useState<SubmissionDraft[]>(() => [newSubmissionDraft()])
	const [selected, setSelected] = useState<string | null>(null)
	const [sending, setSending] = useState(false)
	const sendingRef = useRef(false)
	const [importing, setImporting] = useState(false)
	const importsRef = useRef(0)
	const [sendError, setSendError] = useState("")
	const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
	const [sent, setSent] = useState<SentSubmission[] | null>(null)
	const setDrafts = (action: SetStateAction<SubmissionDraft[]>) => {
		setDraftState(action)
		setServerErrors({})
		setSendError("")
	}
	const catalog = useSubmissionCatalog()
	const hints = useSubmissionHints()
	const queryClient = useQueryClient()
	const knownSlugs = useMemo(() => new Set(catalog.data?.names ?? []), [catalog.data])
	const filled = drafts.filter((draft) => !isEmptyDraft(draft))
	const current = drafts.find((draft) => draft.id === selected) ?? drafts[0]
	const cardErrors: Record<string, string> = {}
	for (const draft of filled) {
		const duplicate = draft.assets.find((asset, index) =>
			draft.assets.some((other, otherIndex) => otherIndex !== index && other.variant === asset.variant),
		)
		const validation = prepareSubmission("", draftInput(draft))
		if (!validation.ok) cardErrors[draft.id] = validation.error
		if (duplicate) cardErrors[draft.id] = "Two files occupy the same Variant slot. Choose which file to keep."
		if (filled.some((other) => other.id !== draft.id && other.name === draft.name))
			cardErrors[draft.id] = "Two cards use the same slug. Put this product’s files on one card."
		if (draft.customVariantName)
			cardErrors[draft.id] = customVariantNameError(draft.customVariantName) || "Choose a file for the Custom variant, or clear its name."
		if (knownSlugs.has(draft.name)) cardErrors[draft.id] = "This Icon is already published. Switch to Edit to propose an update."
		if (serverErrors[draft.id]) cardErrors[draft.id] = serverErrors[draft.id]
	}
	const fileCount = filled.reduce((total, draft) => total + draft.assets.length, 0)
	const bytes = filled.reduce((total, draft) => total + draft.assets.reduce((size, asset) => size + asset.file.size, 0), 0)
	let limitError = ""
	if (filled.length > MAX_SUBMISSIONS_PER_SEND)
		limitError = `Send at most ${MAX_SUBMISSIONS_PER_SEND} Icons at a time. Remove extra cards before sending.`
	if (bytes > MAX_SEND_ASSET_BYTES) limitError = "These files exceed 60 MB in total. Remove files before sending."
	const canSend = filled.length > 0 && Object.keys(cardErrors).length === 0 && !limitError && !sending && !importing
	const update = (id: string, patch: Partial<SubmissionDraft>) => {
		setDrafts((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
	}
	const addFiles = async (files: File[], targetId?: string) => {
		if (!files.length || sendingRef.current) return
		importsRef.current += 1
		setImporting(true)
		try {
			const data = catalog.data ?? (await catalog.refetch({ cancelRefetch: false })).data
			setDrafts((items) => addDraftFiles(items, files, data?.customVariantNames ?? [], new Set(data?.names ?? []), targetId))
		} finally {
			importsRef.current -= 1
			setImporting(importsRef.current > 0)
		}
	}
	const send = async () => {
		if (!canSend || sendingRef.current || importsRef.current > 0) return
		sendingRef.current = true
		setSending(true)
		setSendError("")
		try {
			const result = await submitMany(filled.map(draftInput))
			setSent(result)
			setDrafts([newSubmissionDraft()])
			await Promise.all([
				revalidateAllSubmissions(),
				queryClient.invalidateQueries({ queryKey: ["submission-hints"] }),
				queryClient.invalidateQueries({ queryKey: ["submission-catalog"] }),
				queryClient.invalidateQueries({ queryKey: ["submissions"] }),
			])
		} catch (error: unknown) {
			setSendError(error instanceof Error ? error.message : "The connection was interrupted. Check your Submissions before retrying.")
			if (error instanceof SubmissionSendError)
				setServerErrors(
					Object.fromEntries(
						Object.entries(error.cardErrors).flatMap(([index, message]) => {
							const draft = filled[Number(index)]
							return draft ? [[draft.id, message]] : []
						}),
					),
				)
		} finally {
			sendingRef.current = false
			setSending(false)
		}
	}
	return {
		drafts,
		setDrafts,
		selected,
		setSelected,
		sending,
		importing,
		sendError,
		sent,
		setSent,
		catalog,
		hints,
		knownSlugs,
		filled,
		current,
		cardErrors,
		fileCount,
		bytes,
		limitError,
		canSend,
		update,
		addFiles,
		send,
	}
}
