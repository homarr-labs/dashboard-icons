// @vitest-environment node
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

const source = readFileSync(new URL("../../../backend/pb_hooks/dashboard.js", import.meta.url), "utf8")
const hooks = runInNewContext(`${source}\nmodule.exports`, {
	module: { exports: {} },
	BadRequestError: Error,
	ForbiddenError: Error,
	$dbx: { hashExp: (value: unknown) => value },
}) as { guard: (event: unknown, creating: boolean) => void; reserve: (event: unknown) => void }

function record(values: Record<string, unknown>, previous: Record<string, unknown> = {}) {
	return {
		id: String(values.id || "proposal"),
		getString: (key: string) => String(values[key] || ""),
		set: vi.fn((key: string, value: unknown) => {
			values[key] = value
		}),
		original: () => record(previous),
	}
}

function proposalEvent(values: Record<string, unknown> = {}, previous?: Record<string, unknown>) {
	return {
		auth: {
			id: "proposer",
			getBool: () => false,
			getString: () => "proposer",
			collection: () => ({ name: "users" }),
		},
		hasSuperuserAuth: () => false,
		record: record({ name: "pdf", target_submission: "original", status: "pending", created_by: "proposer", ...values }, previous),
		app: {
			findRecordsByFilter: vi.fn(() => []),
			findRecordById: vi.fn(() => record({ name: "pdf", status: "added_to_collection", created_by: "other-contributor" })),
		},
		next: vi.fn(),
	}
}

describe("submission proposal guard", () => {
	it("rejects a proposal whose filename differs from the referenced submission", () => {
		const event = proposalEvent({ name: "ifc" })
		expect(() => hooks.guard(event, true)).toThrow("A proposal must use its target submission's icon name")
		expect(event.next).not.toHaveBeenCalled()
	})

	it.each([
		"pending",
		"approved",
		"rejected",
		"added_to_collection",
	])("accepts a matching target owned by another contributor with %s status", (status) => {
		const event = proposalEvent()
		const target = record({ name: "pdf", status, created_by: "other-contributor" })
		event.app.findRecordById.mockReturnValue(target)
		hooks.guard(event, true)
		expect(event.next).toHaveBeenCalledOnce()
		expect(target.set).not.toHaveBeenCalled()
	})

	it("allows new icons and collection updates without a submission target", () => {
		const event = proposalEvent({ target_submission: "" })
		hooks.guard(event, true)
		expect(event.app.findRecordById).not.toHaveBeenCalled()
		expect(event.next).toHaveBeenCalledOnce()
	})

	it("prevents an author from changing a proposal's target", () => {
		const previous = { name: "pdf", status: "pending", created_by: "proposer", target_submission: "original" }
		const event = proposalEvent({ target_submission: "other" }, previous)
		expect(() => hooks.guard(event, false)).toThrow("A proposal's target cannot be changed")
		expect(event.next).not.toHaveBeenCalled()
	})

	it("prevents an author from bypassing the name check by renaming an existing proposal", () => {
		const previous = { name: "pdf", status: "pending", created_by: "proposer", target_submission: "original" }
		const event = proposalEvent({ name: "ifc" }, previous)
		expect(() => hooks.guard(event, false)).toThrow("A proposal must use its target submission's icon name")
		expect(event.next).not.toHaveBeenCalled()
	})
})

it("rejects publishing two distinct proposals for the same filename in one batch", () => {
	const records = [
		record({ id: "first", name: "pdf", status: "approved", updated: "2026-10-12" }),
		record({ id: "second", name: "pdf", status: "approved", updated: "2026-10-12" }),
	]
	const transaction = {
		countRecords: () => 0,
		findRecordById: (_collection: string, id: string) => records.find((item) => item.id === id),
		findCollectionByNameOrId: vi.fn(),
		save: vi.fn(),
	}
	const event = {
		auth: { getBool: () => true },
		hasSuperuserAuth: () => false,
		requestInfo: () => ({ body: { items: records.map((item) => ({ id: item.id, updated: item.getString("updated") })) } }),
		app: { runInTransaction: (callback: (tx: typeof transaction) => void) => callback(transaction) },
	}
	expect(() => hooks.reserve(event)).toThrow("Publish only one proposal per icon name in a batch")
	expect(transaction.save).not.toHaveBeenCalled()
})
