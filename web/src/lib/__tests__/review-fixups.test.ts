import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"
import type { ReviewRequest, ReviewResponse } from "@/lib/dashboard/types"
import * as assets from "../../../backend/pb_hooks/submission-assets.js"
import * as policy from "../../../backend/pb_hooks/variant-policy.js"

const source = (file: string) => readFileSync(resolve(process.cwd(), "backend/pb_hooks", file), "utf8")
const fixupHooks = runInNewContext(`${source("review-fixups.js")}\nmodule.exports`, {
	module: { exports: {} },
	BadRequestError: Error,
	toString: JSON.stringify,
	require: (file: string) => (file.includes("submission-assets") ? assets : policy),
}) as { validateItem: (item: unknown) => void; apply: (record: unknown, fixups: unknown) => string[] }

type Values = Record<string, unknown>
function record(values: Values, previous = structuredClone(values)) {
	return {
		id: String(values.id || "submission"),
		values,
		get: (key: string) => values[key] ?? null,
		getString: (key: string) => String(values[key] || ""),
		getBool: (key: string) => Boolean(values[key]),
		getUnsavedFiles: () => [],
		set: (key: string, value: unknown) => {
			values[key] = value
		},
		original: () => record(structuredClone(previous)),
	}
}
const pending = (id = "submission"): Values => ({
	id,
	name: "t8-demo",
	updated: "current",
	status: "pending",
	created_by: "contributor",
	assets: ["base.svg", "light.svg", "animated.svg"],
	extras: {
		base: "svg",
		aliases: ["Old alias"],
		categories: ["Tools"],
		colors: { light: "light.svg" },
		variants: { animated: "animated.svg" },
	},
	last_rejected: { name: "previous-round" },
	reviewed_assets: ["previous-round.svg"],
})

function reviewHarness(initial: Values[] = [pending()]) {
	let stored = new Map(initial.map((value) => [String(value.id), structuredClone(value)]))
	let events: Values[] = []
	let reserved = false
	let failAudit = false
	class Entry {
		values: Values = {}
		load(value: Values) {
			this.values = value
		}
	}
	const customHooks = runInNewContext(`${source("custom-variants.js")}\nmodule.exports`, {
		module: { exports: {} },
		BadRequestError: Error,
		$os: { getenv: () => "" },
		$http: { send: () => ({ statusCode: 200, json: { "t8-demo-dark": {} } }) },
		toString: JSON.stringify,
		require: () => policy,
	})
	const hooks = runInNewContext(`${source("dashboard.js")}\nmodule.exports`, {
		module: { exports: {} },
		BadRequestError: Error,
		ForbiddenError: class extends Error {
			status = 403
		},
		Record: Entry,
		$security: { randomString: () => "review-operation" },
		$os: { getenv: () => "1" },
		__hooks: "hooks",
		toString: JSON.stringify,
		require: (file: string) => (file.includes("review-fixups") ? fixupHooks : customHooks),
	}) as { review: (event: unknown) => ReviewResponse; audit: (event: unknown, creating: boolean) => void }
	const app = {
		store: () => ({ get: () => null, set: vi.fn() }),
		findCollectionByNameOrId: (name: string) => ({ name }),
		findRecordById: (_collection: string, id: string) => {
			const value = stored.get(id)
			if (!value) throw new Error("Not found")
			return record(structuredClone(value))
		},
		findRecordsByFilter: (
			collection: string,
			filter: string,
			_sort: string,
			_limit: number,
			_offset: number,
			bindings?: { id: string },
		) => {
			if (collection === "publish_batches") return reserved ? [record({ items: [{ id: "submission" }] })] : []
			return Array.from(stored.values())
				.filter((value) => {
					if (!["pending", "approved"].includes(String(value.status))) return false
					if (filter.includes("target_submission =")) return value.target_submission === bindings?.id
					return value.id !== bindings?.id
				})
				.map((value) => record(structuredClone(value)))
		},
		runInTransaction: (callback: (tx: unknown) => void) => {
			const previous = structuredClone(stored)
			const previousEvents = structuredClone(events)
			try {
				callback(app)
			} catch (error) {
				stored = previous
				events = previousEvents
				throw error
			}
		},
		save: (value: ReturnType<typeof record> | Entry) => {
			if (value instanceof Entry) {
				if (failAudit) throw new Error("Audit could not be saved")
				events.push(value.values)
			} else {
				hooks.audit(
					{
						app,
						record: value,
						next: () =>
							stored.set(
								value.id,
								structuredClone(Object.fromEntries(Object.entries(value.values).filter(([key]) => !key.startsWith("__")))),
							),
					},
					false,
				)
			}
		},
	}
	const auth = { id: "reviewer", getBool: () => true, getString: () => "Reviewer", collection: () => ({ name: "users" }) }
	return {
		stored: () => stored.get("submission"),
		events: () => events,
		reserve: () => {
			reserved = true
		},
		failAudit: () => {
			failAudit = true
		},
		run: (body: unknown, admin = true) =>
			hooks.review({
				app,
				auth: { ...auth, getBool: () => admin },
				hasSuperuserAuth: () => false,
				requestInfo: () => ({ body }),
				json: (_status: number, value: ReviewResponse) => value,
			}),
	}
}

const decision = (fixups: unknown = {}, status = "approved") => ({ status, items: [{ id: "submission", updated: "current", fixups }] })

describe("review fix-ups", () => {
	it("saves fix-ups, actor, feedback and decision as one audited operation without changing review snapshots", () => {
		const harness = reviewHarness()
		const body: ReviewRequest = {
			status: "approved",
			comment: "Corrected the labels",
			items: [
				{
					id: "submission",
					updated: "current",
					fixups: {
						name: "t8-renamed",
						aliases: ["New alias"],
						categories: ["Productivity"],
						variants: [
							{ action: "retag", file: "light.svg", variant: "wordmark_dark" },
							{ action: "drop", file: "animated.svg" },
						],
					},
				},
			],
		}
		const result = harness.run(body).results[0]
		expect(result.success).toBe(true)
		if (!result.success) throw new Error(result.error)
		expect(result.fixups).toHaveLength(5)
		expect(harness.stored()).toMatchObject({
			name: "t8-renamed",
			status: "approved",
			approved_by: "reviewer",
			admin_comment: body.comment,
			assets: ["base.svg", "light.svg"],
			extras: { aliases: ["New alias"], categories: ["Productivity"], wordmark: { dark: "light.svg" } },
			last_rejected: pending().last_rejected,
			reviewed_assets: pending().reviewed_assets,
		})
		expect(harness.events()).toHaveLength(1)
		expect(harness.events()[0]).toMatchObject({
			actor_id: "reviewer",
			actor_kind: "admin",
			action: "approved",
			feedback: body.comment,
			operation_id: "review-operation",
			changes: {
				name: { before: "t8-demo", after: "t8-renamed" },
				status: { before: "pending", after: "approved" },
				fixups: { before: [], after: result.fixups },
			},
		})
	})

	it.each([
		{ extras: [] },
		{ extras: true },
		{ extras: null },
	])("rejects malformed stored metadata before saving fix-ups or either decision: $extras", ({ extras }) => {
		for (const status of ["approved", "rejected"]) {
			const original = { ...pending(), extras }
			const harness = reviewHarness([original])
			const result = harness.run(decision({ name: "t8-renamed", aliases: ["Changed"], categories: ["Changed"] }, status)).results[0]
			expect(result).toMatchObject({ success: false, error: expect.stringContaining("Submission metadata must be a non-null object") })
			expect(result).not.toHaveProperty("fixups")
			expect(harness.stored()).toEqual(original)
			expect(harness.events()).toEqual([])
		}
	})

	it("persists metadata fix-ups from a valid empty object and audits only saved values", () => {
		const harness = reviewHarness([{ ...pending(), assets: ["base.svg"], extras: {} }])
		const result = harness.run(decision({ aliases: ["Changed"], categories: ["Tools"] })).results[0]
		expect(result.success).toBe(true)
		if (!result.success) throw new Error(result.error)
		expect(harness.stored()).toMatchObject({ status: "approved", extras: { aliases: ["Changed"], categories: ["Tools"] } })
		expect(result.fixups).toEqual(['Changed aliases from [] to ["Changed"].', 'Changed categories from [] to ["Tools"].'])
		expect(harness.events()[0]).toMatchObject({
			changes: { extras: { before: {}, after: { aliases: ["Changed"], categories: ["Tools"] } }, fixups: { after: result.fixups } },
		})
	})

	it.each([
		{ created_by: "attacker" },
		{ assets: ["replacement.svg"] },
		{ extras: {} },
		{ target_submission: "other" },
		{ name: "Invalid--slug" },
		{ name: "x".repeat(81) },
		{ aliases: "not-an-array" },
		{ categories: [" "] },
		{ variants: [{ action: "retag", file: "light.svg", variant: "custom:wordmark" }] },
		{ variants: [{ action: "retag", file: "light.svg", variant: "custom:Bad_Name" }] },
		{ variants: [{ action: "retag", file: "missing.svg", variant: "dark" }] },
		{ variants: [{ action: "drop", file: "base.svg" }] },
		{ variants: [{ action: "drop", file: "light.svg", bytes: "replacement" }] },
	])("rejects invalid or forbidden fix-ups without saving: %j", (fixups) => {
		const harness = reviewHarness()
		expect(harness.run(decision(fixups)).results[0].success).toBe(false)
		expect(harness.stored()).toEqual(pending())
		expect(harness.events()).toEqual([])
	})

	it("rejects arbitrary item fields and non-admin callers", () => {
		const harness = reviewHarness()
		expect(
			harness.run({ status: "approved", items: [{ id: "submission", updated: "current", status: "added_to_collection" }] }).results[0]
				.success,
		).toBe(false)
		expect(() => harness.run(decision(), false)).toThrow(expect.objectContaining({ status: 403 }))
		expect(harness.stored()).toEqual(pending())
	})

	it("locks stale and reserved records before applying fix-ups", () => {
		const harness = reviewHarness()
		expect(
			harness.run({ status: "approved", items: [{ id: "submission", updated: "stale", fixups: { name: "changed" } }] }).results[0],
		).toMatchObject({ success: false, error: expect.stringContaining("changed") })
		harness.reserve()
		expect(harness.run(decision({ name: "changed" })).results[0]).toMatchObject({
			success: false,
			error: expect.stringContaining("published"),
		})
		expect(harness.stored()).toEqual(pending())
	})

	it("retains authoritative stem ownership and rolls all fix-ups back on a collision", () => {
		const harness = reviewHarness()
		expect(
			harness.run(
				decision({
					aliases: ["Changed"],
					variants: [
						{ action: "drop", file: "animated.svg" },
						{ action: "retag", file: "light.svg", variant: "dark" },
					],
				}),
			).results[0],
		).toMatchObject({ success: false, error: expect.stringContaining("t8-demo-dark") })
		expect(harness.stored()).toEqual(pending())
		expect(harness.events()).toEqual([])
	})

	it("rolls the decision and fix-ups back if the audit write fails", () => {
		const harness = reviewHarness()
		harness.failAudit()
		expect(harness.run(decision({ name: "t8-renamed", variants: [{ action: "drop", file: "animated.svg" }] })).results[0]).toMatchObject({
			success: false,
			error: expect.stringContaining("Audit could not be saved"),
		})
		expect(harness.stored()).toEqual(pending())
		expect(harness.events()).toEqual([])
	})

	it("does not break active proposal destinations", () => {
		const harness = reviewHarness([pending(), { ...pending("proposal"), target_submission: "submission" }])
		expect(harness.run(decision({ name: "t8-renamed" })).results[0]).toMatchObject({
			success: false,
			error: expect.stringContaining("active update proposals"),
		})
		expect(harness.stored()).toEqual(pending())
	})

	it("rejects slot collisions while allowing simultaneous unambiguous swaps", () => {
		const value = record(pending())
		expect(() => fixupHooks.apply(value, { variants: [{ action: "retag", file: "animated.svg", variant: "light" }] })).toThrow(
			"same Variant slot",
		)
		const swapped = record(pending())
		fixupHooks.apply(swapped, {
			variants: [
				{ action: "retag", file: "light.svg", variant: "custom:animated" },
				{ action: "retag", file: "animated.svg", variant: "light" },
			],
		})
		expect(swapped.get("extras")).toMatchObject({ colors: { light: "animated.svg" }, variants: { animated: "light.svg" } })
	})

	it("supports reasonless rejection with transparent fix-ups and per-record partial success", () => {
		const harness = reviewHarness([pending(), { ...pending("other"), name: "other" }])
		const response = harness.run({
			status: "rejected",
			items: [
				{ id: "submission", updated: "current", fixups: { aliases: ["Fixed"] } },
				{ id: "other", updated: "stale" },
			],
		})
		expect(response.results.map((item) => item.success)).toEqual([true, false])
		expect(harness.stored()).toMatchObject({ status: "rejected", admin_comment: "", extras: { aliases: ["Fixed"] } })
		expect(harness.events()[0]).toMatchObject({ action: "rejected", changes: { fixups: { after: [expect.stringContaining("Fixed")] } } })
	})

	it("does not claim no-op changes or discard unrelated metadata", () => {
		const value = record(pending())
		expect(
			fixupHooks.apply(value, {
				name: "t8-demo",
				aliases: ["Old alias"],
				variants: [{ action: "retag", file: "light.svg", variant: "light" }],
			}),
		).toEqual([])
		expect(value.values).toEqual(pending())
	})
})

it.each(["approved", "rejected", "bulk-rejected"])("renders the actual %s contributor message locally without sending email", (status) => {
	const messages: { html: string; subject: string }[] = []
	const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
	const mailer = runInNewContext(`${source("submission-email.js")}\nmodule.exports`, {
		module: { exports: {} },
		$os: { getenv: () => "" },
		MailerMessage: class {
			constructor(value: object) {
				Object.assign(this, value)
			}
		},
		sleep: vi.fn(),
	}) as { notify: (event: unknown) => void; sendBulkRejectionEmails: (app: unknown, id: string, logger: unknown) => void }
	const app = {
		logger: () => ({ withGroup: () => logger }),
		findRecordById: () => record({ email: "local@example.test", username: "Local user" }),
		settings: () => ({ meta: {} }),
		newMailClient: () => ({ send: (message: (typeof messages)[number]) => messages.push(message) }),
	}
	const changes = [
		'Renamed slug from "old" to "new".',
		"Retagged Light as Dark (light.svg).",
		"Dropped Custom animated (animated.svg).",
		'Changed aliases from [] to ["<script>not html</script>"].',
	]
	const value = record({
		...pending(),
		status: status === "approved" ? "approved" : "rejected",
		__previous_status: "pending",
		__review_fixups: changes,
		__bulk_reject_id: status === "bulk-rejected" ? "operation" : "",
	})
	mailer.notify({ app, record: value })
	if (status === "bulk-rejected") mailer.sendBulkRejectionEmails(app, "operation", logger)
	const html = messages[0].html
	expect(messages).toHaveLength(1)
	expect(html).toContain("Reviewer fix-ups saved with this decision")
	expect(html).toContain("Retagged Light as Dark (light.svg).")
	expect(html).toContain("Dropped Custom animated (animated.svg).")
	expect(html).toContain("&lt;script&gt;not html&lt;/script&gt;")
	expect(html).not.toContain("<script>")
	if (status !== "approved") expect(html).toContain("Rejections are never final")
})
