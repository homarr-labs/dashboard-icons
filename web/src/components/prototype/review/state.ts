// PROTOTYPE (throwaway): pass 2 staged changeset — per-Submission approve/reject (+final), comment, reviewer fix-ups (rename, retag, drop, aliases/categories) and the final payload.
import { useCallback, useMemo, useState } from "react"
import { type Change, fileName, initialSubmissions, kindLabel, type Row, rows, type Submission, type Variant } from "./mock"

export type Decision = { outcome: "approve" } | { outcome: "reject"; reason: string; final: boolean }
export interface Fixups {
	slug?: string
	retag: Record<string, string>
	drop: string[]
	aliases?: string[]
	categories?: string[]
}
export interface EffectiveRow extends Row {
	originalKind: string
	dropped: boolean
}
export interface Effective {
	slug: string
	aliases: string[]
	categories: string[]
	rows: EffectiveRow[]
	issues: string[]
}
export interface PayloadItem {
	id: string
	slug: string
	contributor: string
	type: Submission["type"]
	round: number
	decision: "approve" | "reject"
	final?: boolean
	reason?: string
	comment?: string
	fixups: string[]
	files: string[]
	aliases: string[]
	categories: string[]
	message: string
}
export interface ReviewPayload {
	items: PayloadItem[]
	publishQueue: string[]
}

const emptyFixups: Fixups = { retag: {}, drop: [] }

export function useReview() {
	const subs = initialSubmissions
	const [decisions, setDecisions] = useState<Record<string, Decision>>({})
	const [comments, setComments] = useState<Record<string, string>>({})
	const [fixups, setFixups] = useState<Record<string, Fixups>>({})

	const patchFixups = useCallback((id: string, patch: (current: Fixups) => Fixups) => {
		setFixups((all) => ({ ...all, [id]: patch(all[id] || emptyFixups) }))
	}, [])
	const approve = useCallback((id: string) => setDecisions((all) => ({ ...all, [id]: { outcome: "approve" } })), [])
	const reject = useCallback(
		(id: string, reason: string, final: boolean) => setDecisions((all) => ({ ...all, [id]: { outcome: "reject", reason, final } })),
		[],
	)
	const setFinal = useCallback(
		(id: string, final: boolean) =>
			setDecisions((all) => {
				const current = all[id]
				if (current?.outcome !== "reject") return all
				return { ...all, [id]: { ...current, final } }
			}),
		[],
	)
	const unflag = useCallback((id: string) => {
		setDecisions((all) => {
			const next = { ...all }
			delete next[id]
			return next
		})
	}, [])
	const comment = useCallback((id: string, text: string) => setComments((all) => ({ ...all, [id]: text })), [])
	const rename = useCallback(
		(id: string, slug: string) =>
			patchFixups(id, (current) => ({
				...current,
				slug:
					slug
						.trim()
						.toLowerCase()
						.replace(/[^a-z0-9-]+/g, "-") || undefined,
			})),
		[patchFixups],
	)
	const retag = useCallback(
		(id: string, variantId: string, kind: string) =>
			patchFixups(id, (current) => ({ ...current, retag: { ...current.retag, [variantId]: kind } })),
		[patchFixups],
	)
	const toggleDrop = useCallback(
		(id: string, variantId: string) =>
			patchFixups(id, (current) => {
				if (current.drop.includes(variantId)) return { ...current, drop: current.drop.filter((entry) => entry !== variantId) }
				return { ...current, drop: [...current.drop, variantId] }
			}),
		[patchFixups],
	)
	const setAliases = useCallback((id: string, aliases: string[]) => patchFixups(id, (current) => ({ ...current, aliases })), [patchFixups])
	const setCategories = useCallback(
		(id: string, categories: string[]) => patchFixups(id, (current) => ({ ...current, categories })),
		[patchFixups],
	)
	const resetFixups = useCallback((id: string) => {
		setFixups((all) => {
			const next = { ...all }
			delete next[id]
			return next
		})
	}, [])
	const reset = useCallback(() => {
		setDecisions({})
		setComments({})
		setFixups({})
	}, [])

	const effective = useCallback(
		(sub: Submission): Effective => {
			const fix = fixups[sub.id] || emptyFixups
			const slug = fix.slug || sub.slug
			const effectiveRows = rows(sub).map((row) => {
				const id = row.proposed?.id || ""
				const kind = fix.retag[id] || row.kind
				return { ...row, kind, originalKind: row.kind, dropped: fix.drop.includes(id) }
			})
			const live = effectiveRows.filter((row) => row.proposed && !row.dropped)
			const issues: string[] = []
			if (!live.some((row) => row.kind === "base")) issues.push("No Base variant")
			const kinds = live.map((row) => row.kind)
			for (const kind of new Set(kinds))
				if (kinds.filter((entry) => entry === kind).length > 1) issues.push(`Two variants tagged ${kindLabel(kind)}`)
			return { slug, aliases: fix.aliases || sub.aliases, categories: fix.categories || sub.categories, rows: effectiveRows, issues }
		},
		[fixups],
	)
	const fixupLines = useCallback(
		(sub: Submission) => {
			const fix = fixups[sub.id]
			if (!fix) return []
			const lines: string[] = []
			if (fix.slug && fix.slug !== sub.slug) lines.push(`Renamed ${sub.slug} → ${fix.slug}`)
			const slug = fix.slug || sub.slug
			for (const row of rows(sub)) {
				if (!row.proposed) continue
				const kind = fix.retag[row.proposed.id]
				if (kind && kind !== row.kind)
					lines.push(`Marked ${fileName(sub.slug, row.proposed)} as ${kindLabel(kind)} (${fileName(slug, { ...row.proposed, kind })})`)
				if (fix.drop.includes(row.proposed.id)) lines.push(`Removed ${fileName(sub.slug, row.proposed)}`)
			}
			if (fix.aliases && fix.aliases.join() !== sub.aliases.join()) lines.push(`Aliases set to ${fix.aliases.join(", ") || "none"}`)
			if (fix.categories && fix.categories.join() !== sub.categories.join())
				lines.push(`Categories set to ${fix.categories.join(", ") || "none"}`)
			return lines
		},
		[fixups],
	)

	const payload = useMemo<ReviewPayload>(() => {
		const items: PayloadItem[] = []
		for (const sub of subs) {
			const decision = decisions[sub.id]
			if (!decision) continue
			const view = effective(sub)
			const lines = fixupLines(sub)
			const files = view.rows
				.filter((row) => row.proposed && !row.dropped)
				.map((row) => fileName(view.slug, { kind: row.kind, asset: (row.proposed as Variant).asset }))
			const text = comments[sub.id]?.trim()
			const message: string[] = []
			if (decision.outcome === "approve") {
				let what = `your icon “${view.slug}”`
				if (sub.type === "update") what = `your update to “${sub.slug}”`
				message.push(`Hi @${sub.contributor}, ${what} was approved. It will be published with the next release.`)
				if (lines.length) message.push("Before approving, a reviewer adjusted it:", ...lines.map((line) => `  • ${line}`))
			} else {
				message.push(`Hi @${sub.contributor}, your submission “${sub.slug}” was not accepted: ${decision.reason}`)
				if (decision.final) message.push("This decision is final.")
				else
					message.push(
						`Fix it and resubmit this same submission. It returns to review as round ${sub.round + 1}, with your changes shown to the reviewer.`,
					)
			}
			if (text) message.push(`Reviewer note: ${text}`)
			items.push({
				id: sub.id,
				slug: view.slug,
				contributor: sub.contributor,
				type: sub.type,
				round: sub.round,
				decision: decision.outcome,
				final: decision.outcome === "reject" ? decision.final : undefined,
				reason: decision.outcome === "reject" ? decision.reason : undefined,
				comment: text || undefined,
				fixups: decision.outcome === "approve" ? lines : [],
				files,
				aliases: view.aliases,
				categories: view.categories,
				message: message.join("\n"),
			})
		}
		const publishQueue = items.filter((item) => item.decision === "approve").flatMap((item) => item.files)
		return { items, publishQueue }
	}, [subs, decisions, comments, effective, fixupLines])

	return {
		subs,
		decisions,
		comments,
		fixups,
		approve,
		reject,
		setFinal,
		unflag,
		comment,
		rename,
		retag,
		toggleDrop,
		setAliases,
		setCategories,
		resetFixups,
		reset,
		effective,
		fixupLines,
		payload,
	}
}
export type Review = ReturnType<typeof useReview>
export const changeLabels: Record<Change, string> = { added: "added", replaced: "replaced", removed: "removed", unchanged: "unchanged" }
