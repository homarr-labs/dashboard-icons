// PROTOTYPE (throwaway): staged review changeset (decisions per Submission/Icon, variant drops, fix-ups, comments) shared by all variants, plus the final payload.
"use client"
import { useCallback, useMemo, useState } from "react"
import {
	type FixUp,
	fileName,
	type IconVariant,
	initialSubmissions,
	type MockSubmission,
	type ProposedIcon,
	smartMerge,
	type Tone,
	variantKind,
} from "./mock"

export type Outcome = "approve" | "changes" | "reject"
export interface Decision {
	outcome: Outcome
	reasons: string[]
}
export const outcomeLabels: Record<Outcome | "undecided", string> = {
	approve: "Approve",
	changes: "Request changes",
	reject: "Reject",
	undecided: "Undecided",
}

export interface PayloadVariant {
	file: string
	kind: string
	keep: boolean
	note?: string
	comments: string[]
}
export interface PayloadIcon {
	slug: string
	mode: ProposedIcon["mode"]
	outcome: Outcome | "undecided"
	reasons: string[]
	variants: PayloadVariant[]
}
export type SubmissionStatus = "approved" | "changes_requested" | "rejected" | "partially_approved" | "pending" | "closed_merged"
export interface PayloadSubmission {
	id: string
	contributor: string
	status: SubmissionStatus
	icons: PayloadIcon[]
	message: string
}
export interface ReviewPayload {
	submissions: PayloadSubmission[]
	fixups: FixUp[]
	publishQueue: string[]
}

export const statusText: Record<SubmissionStatus, string> = {
	approved: "Approved",
	changes_requested: "Changes requested",
	rejected: "Rejected",
	partially_approved: "Partially approved",
	pending: "Still pending",
	closed_merged: "Closed · merged",
}

export function useReview() {
	const [subs, setSubs] = useState<MockSubmission[]>(initialSubmissions)
	const [iconDecisions, setIconDecisions] = useState<Record<string, Decision>>({})
	const [subDecisions, setSubDecisions] = useState<Record<string, Decision>>({})
	const [dropped, setDropped] = useState<Record<string, string>>({})
	const [comments, setComments] = useState<Record<string, string[]>>({})
	const [fixups, setFixups] = useState<FixUp[]>([])
	const [closed, setClosed] = useState<{ id: string; contributor: string; into: string }[]>([])

	const findIcon = useCallback(
		(iconId: string) => {
			for (const sub of subs) {
				const found = sub.icons.find((entry) => entry.id === iconId)
				if (found) return { sub, icon: found }
			}
			return undefined
		},
		[subs],
	)
	const findVariant = useCallback(
		(variantId: string) => {
			for (const sub of subs)
				for (const entry of sub.icons) {
					const found = entry.variants.find((variant) => variant.id === variantId)
					if (found) return { sub, icon: entry, variant: found }
				}
			return undefined
		},
		[subs],
	)
	const decision = useCallback(
		(iconId: string): Decision | undefined => {
			if (iconDecisions[iconId]) return iconDecisions[iconId]
			const sub = subs.find((entry) => entry.icons.some((item) => item.id === iconId))
			if (sub) return subDecisions[sub.id]
			return undefined
		},
		[iconDecisions, subDecisions, subs],
	)
	const decideIcon = useCallback((iconId: string, outcome: Outcome | null, reason?: string) => {
		setIconDecisions((current) => {
			const next = { ...current }
			if (!outcome) delete next[iconId]
			else next[iconId] = { outcome, reasons: reason ? [reason] : [] }
			return next
		})
	}, [])
	const decideSubmission = useCallback(
		(subId: string, outcome: Outcome | null, reason?: string, clearOverrides = true) => {
			setSubDecisions((current) => {
				const next = { ...current }
				if (!outcome) delete next[subId]
				else next[subId] = { outcome, reasons: reason ? [reason] : [] }
				return next
			})
			const sub = subs.find((entry) => entry.id === subId)
			if (clearOverrides && sub)
				setIconDecisions((current) => {
					const next = { ...current }
					for (const entry of sub.icons) delete next[entry.id]
					return next
				})
		},
		[subs],
	)
	const addReason = useCallback(
		(iconId: string, reason: string) => {
			setIconDecisions((current) => {
				const base = current[iconId] || decision(iconId) || { outcome: "changes" as Outcome, reasons: [] }
				if (base.reasons.includes(reason)) return current
				return { ...current, [iconId]: { ...base, reasons: [...base.reasons, reason] } }
			})
		},
		[decision],
	)
	const toggleDrop = useCallback(
		(variantId: string, reason = "Dropped by reviewer") => {
			const found = findVariant(variantId)
			if (!found) return
			const file = fileName(found.icon.slug, found.variant)
			setDropped((current) => {
				const next = { ...current }
				if (next[variantId]) delete next[variantId]
				else next[variantId] = reason
				return next
			})
			setFixups((current) => {
				if (current.some((entry) => entry.kind === "drop" && entry.variantId === variantId))
					return current.filter((entry) => !(entry.kind === "drop" && entry.variantId === variantId))
				return [...current, { kind: "drop", variantId, file, reason }]
			})
		},
		[findVariant],
	)
	const rename = useCallback(
		(iconId: string, to: string) => {
			const found = findIcon(iconId)
			const slug = to
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]+/g, "-")
			if (!found || !slug || slug === found.icon.slug) return
			setSubs((current) =>
				current.map((sub) => ({ ...sub, icons: sub.icons.map((entry) => (entry.id === iconId ? { ...entry, slug } : entry)) })),
			)
			setFixups((current) => [...current, { kind: "rename", iconId, from: found.icon.slug, to: slug }])
		},
		[findIcon],
	)
	const retag = useCallback(
		(variantId: string, form: string, tone: Tone) => {
			const found = findVariant(variantId)
			if (!found) return
			const from = fileName(found.icon.slug, found.variant)
			const updated: IconVariant = { ...found.variant, form, tone }
			setSubs((current) =>
				current.map((sub) => ({
					...sub,
					icons: sub.icons.map((entry) => ({
						...entry,
						variants: entry.variants.map((variant) => (variant.id === variantId ? updated : variant)),
					})),
				})),
			)
			setFixups((current) => [...current, { kind: "retag", variantId, from, to: fileName(found.icon.slug, updated) }])
		},
		[findVariant],
	)
	const merge = useCallback(
		(ids: string[]) => {
			const targets = subs.filter((sub) => ids.includes(sub.id))
			if (targets.length < 2) return undefined
			const { merged, fixups: mergeFixups, drops } = smartMerge(targets)
			const firstIndex = subs.findIndex((sub) => ids.includes(sub.id))
			setSubs((current) => {
				const rest = current.filter((sub) => !ids.includes(sub.id))
				rest.splice(firstIndex, 0, merged)
				return rest
			})
			setDropped((current) => ({ ...current, ...drops }))
			setFixups((current) => [...current, ...mergeFixups])
			setClosed((current) => [...current, ...targets.map((sub) => ({ id: sub.id, contributor: sub.contributor, into: merged.id }))])
			return merged.id
		},
		[subs],
	)
	const split = useCallback(
		(iconId: string) => {
			const found = findIcon(iconId)
			if (!found || found.sub.icons.length < 2) return
			const into = `${found.sub.id}/${found.icon.slug}`
			setSubs((current) => {
				const index = current.findIndex((sub) => sub.id === found.sub.id)
				const next = current.map((sub) =>
					sub.id === found.sub.id ? { ...sub, icons: sub.icons.filter((entry) => entry.id !== iconId) } : sub,
				)
				next.splice(index + 1, 0, { ...found.sub, id: into, icons: [found.icon], mergedFrom: undefined })
				return next
			})
			setFixups((current) => [...current, { kind: "split", iconId, slug: found.icon.slug, from: found.sub.id, into }])
		},
		[findIcon],
	)
	const comment = useCallback((variantId: string, text: string) => {
		if (!text.trim()) return
		setComments((current) => ({ ...current, [variantId]: [...(current[variantId] || []), text.trim()] }))
	}, [])
	const undoFixup = useCallback((index: number) => {
		setFixups((current) => {
			const entry = current[index]
			if (entry?.kind === "drop")
				setDropped((drops) => {
					const next = { ...drops }
					delete next[entry.variantId]
					return next
				})
			if (entry?.kind === "rename")
				setSubs((list) =>
					list.map((sub) => ({
						...sub,
						icons: sub.icons.map((item) => (item.id === entry.iconId ? { ...item, slug: entry.from } : item)),
					})),
				)
			return current.filter((_, position) => position !== index)
		})
	}, [])
	const reset = useCallback(() => {
		setSubs(initialSubmissions)
		setIconDecisions({})
		setSubDecisions({})
		setDropped({})
		setComments({})
		setFixups([])
		setClosed([])
	}, [])

	const payload = useMemo<ReviewPayload>(() => {
		const touched = (sub: MockSubmission) =>
			!!subDecisions[sub.id] ||
			!!sub.mergedFrom ||
			sub.icons.some(
				(entry) =>
					iconDecisions[entry.id] ||
					fixups.some((fix) => fix.kind !== "merge" && "iconId" in fix && fix.iconId === entry.id) ||
					entry.variants.some((variant) => dropped[variant.id] || comments[variant.id]),
			)
		const submissions: PayloadSubmission[] = subs.filter(touched).map((sub) => {
			const icons: PayloadIcon[] = sub.icons.map((entry) => {
				const chosen = iconDecisions[entry.id] || subDecisions[sub.id]
				return {
					slug: entry.slug,
					mode: entry.mode,
					outcome: chosen?.outcome || "undecided",
					reasons: chosen?.reasons || [],
					variants: entry.variants.map((variant) => ({
						file: fileName(entry.slug, variant),
						kind: variantKind(variant),
						keep: !dropped[variant.id],
						note: dropped[variant.id],
						comments: comments[variant.id] || [],
					})),
				}
			})
			const outcomes = new Set(icons.map((entry) => entry.outcome))
			let status: SubmissionStatus = "pending"
			if (outcomes.has("changes")) status = "changes_requested"
			else if (outcomes.has("undecided")) status = "pending"
			else if (outcomes.size === 1 && outcomes.has("approve")) status = "approved"
			else if (outcomes.size === 1 && outcomes.has("reject")) status = "rejected"
			else status = "partially_approved"
			const lines = [
				`Hi @${sub.contributor}, your submission “${sub.icons.map((entry) => entry.slug).join(", ")}” was reviewed: ${statusText[status]}.`,
			]
			if (sub.mergedFrom) lines.push(`We combined your ${sub.mergedFrom.length} separate uploads into this one submission.`)
			for (const entry of icons) {
				const symbol = { approve: "✓", changes: "↺", reject: "✕", undecided: "·" }[entry.outcome]
				let line = `${symbol} ${entry.slug}: ${outcomeLabels[entry.outcome].toLowerCase()}`
				if (entry.reasons.length) line += ` — ${entry.reasons.join(" ")}`
				lines.push(line)
				for (const variant of entry.variants) {
					if (!variant.keep) lines.push(`   – ${variant.file} removed: ${variant.note}`)
					for (const text of variant.comments) lines.push(`   ${variant.file}: ${text}`)
				}
			}
			const renames = fixups.filter((fix) => fix.kind === "rename" && sub.icons.some((entry) => entry.id === fix.iconId))
			for (const fix of renames) if (fix.kind === "rename") lines.push(`We renamed ${fix.from} → ${fix.to}.`)
			if (status === "changes_requested")
				lines.push("Edit this submission to address the notes; it keeps its history and returns to review.")
			return { id: sub.id, contributor: sub.contributor, status, icons, message: lines.join("\n") }
		})
		for (const entry of closed)
			submissions.push({
				id: entry.id,
				contributor: entry.contributor,
				status: "closed_merged",
				icons: [],
				message: `Merged into ${entry.into}; review continues there.`,
			})
		const publishQueue = submissions.flatMap((sub) =>
			sub.icons
				.filter((entry) => entry.outcome === "approve")
				.flatMap((entry) => entry.variants.filter((variant) => variant.keep).map((variant) => variant.file)),
		)
		return { submissions, fixups, publishQueue }
	}, [subs, iconDecisions, subDecisions, dropped, comments, fixups, closed])

	const decidedIcons = subs.flatMap((sub) => sub.icons).filter((entry) => decision(entry.id)).length
	const totalIcons = subs.reduce((sum, sub) => sum + sub.icons.length, 0)

	return {
		subs,
		dropped,
		comments,
		fixups,
		iconDecisions,
		subDecisions,
		decision,
		decideIcon,
		decideSubmission,
		addReason,
		toggleDrop,
		rename,
		retag,
		merge,
		split,
		comment,
		undoFixup,
		reset,
		findIcon,
		findVariant,
		payload,
		decidedIcons,
		totalIcons,
	}
}
export type Review = ReturnType<typeof useReview>
