import { useEffect, useRef } from "react"
import { reviewReasons, variantRejection } from "@/components/dashboard/review-presentation"

export function useReviewShortcuts({
	disabled,
	queueOpen,
	recordId,
	reasonOpen,
	siblingName,
	canFixup,
	selectedFile,
	stage,
	onReason,
	onVariantPrompt,
	onRename,
	onDrop,
	move,
	clear,
	writeNote,
}: {
	disabled: boolean
	queueOpen: boolean
	recordId?: string
	reasonOpen: boolean
	siblingName?: string
	canFixup: boolean
	selectedFile?: string
	stage: (status: "approved" | "rejected", reason?: string) => void
	onReason: (id: string | null) => void
	onVariantPrompt: (id: string) => void
	onRename: () => void
	onDrop: (file: string) => void
	move: (direction: number) => void
	clear: (id: string) => void
	writeNote: () => void
}) {
	const heldKeys = useRef(new Set<string>())
	useEffect(() => {
		function keydown(event: KeyboardEvent) {
			const target = event.target
			if (
				disabled ||
				(queueOpen && window.matchMedia("(max-width: 1023px)").matches) ||
				event.defaultPrevented ||
				event.isComposing ||
				event.repeat ||
				heldKeys.current.has(event.code || event.key) ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				(target instanceof Element &&
					target.closest(
						"form,input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=dialog],[role=menu],[role=listbox],[role=combobox]",
					)) ||
				document.querySelector(
					"[role=menu][data-state=open],[role=dialog][data-state=open],[role=alertdialog][data-state=open],[role=listbox][data-state=open],dialog[open]",
				)
			)
				return
			heldKeys.current.add(event.code || event.key)
			const key = event.key.toLowerCase()
			if (reasonOpen && /^[1-9]$/.test(key)) {
				event.preventDefault()
				let reason = reviewReasons[Number(key) - 1]
				if (key === "9" && siblingName) reason = variantRejection(siblingName)
				stage("rejected", reason)
				return
			}
			if (key === "escape") {
				onReason(null)
				return
			}
			if (key === "p") {
				event.preventDefault()
				stage("approved")
				return
			}
			if (key === "x" && recordId) {
				event.preventDefault()
				if (reasonOpen) stage("rejected")
				else onReason(recordId)
				return
			}
			if (key === "v" && recordId) {
				event.preventDefault()
				if (siblingName) stage("rejected", variantRejection(siblingName))
				else onVariantPrompt(recordId)
				return
			}
			if (key === "c" && recordId) {
				event.preventDefault()
				writeNote()
				return
			}
			if (key === "e" && recordId && canFixup) {
				event.preventDefault()
				onReason(null)
				onRename()
				return
			}
			if (key === "d" && selectedFile && canFixup) {
				event.preventDefault()
				onDrop(selectedFile)
				return
			}
			if (key === "u" && recordId) {
				event.preventDefault()
				clear(recordId)
				return
			}
			if (["j", "k"].includes(key)) {
				event.preventDefault()
				let direction = 1
				if (key === "k") direction = -1
				move(direction)
			}
		}
		const keyup = (event: KeyboardEvent) => heldKeys.current.delete(event.code || event.key)
		const blur = () => heldKeys.current.clear()
		window.addEventListener("keydown", keydown)
		window.addEventListener("keyup", keyup)
		window.addEventListener("blur", blur)
		return () => {
			window.removeEventListener("keydown", keydown)
			window.removeEventListener("keyup", keyup)
			window.removeEventListener("blur", blur)
		}
	}, [
		disabled,
		queueOpen,
		recordId,
		reasonOpen,
		siblingName,
		canFixup,
		selectedFile,
		stage,
		onReason,
		onVariantPrompt,
		onRename,
		onDrop,
		move,
		clear,
		writeNote,
	])
}
