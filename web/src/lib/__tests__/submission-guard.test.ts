// @vitest-environment node
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/submissions/route"
import type { UpdateTarget } from "@/lib/icon-update"
import { createIconUpdate, type IconUpdateInput } from "@/lib/icon-update-service"
import { RESERVED_VARIANT_NAMES } from "@/lib/icons/variants"
import * as pocketbase from "@/lib/pb"
import { customVariantNameError, labelledAssets, variantKind } from "@/lib/submission-variants"
import * as authentication from "@/mcp/auth/pocketbase"
import { matchingAssetNames, resolveSubmissionAssets, snapshotVariantMetadata } from "../../../backend/pb_hooks/submission-assets.js"
import * as policy from "../../../backend/pb_hooks/variant-policy.js"

vi.mock("@/lib/icons/service", () => ({ getAllIcons: vi.fn() }))

const source = readFileSync(new URL("../../../backend/pb_hooks/dashboard.js", import.meta.url), "utf8")
const customSource = readFileSync(new URL("../../../backend/pb_hooks/custom-variants.js", import.meta.url), "utf8")
const metadata = {
	"proton-mail": {},
	sonarr: { variants: { "4k": "sonarr-4k" } },
	demo: { variants: { "a-b": "demo-a-b" } },
	"control-d": { colors: { dark: "control-d-dark" } },
	brand: { wordmark: { default: "brand-identity" } },
}
const customHooks = runInNewContext(`${customSource}\nmodule.exports`, {
	module: { exports: {} },
	BadRequestError: Error,
	$os: { getenv: () => "" },
	$http: { send: () => ({ statusCode: 200, json: metadata }) },
	toString: (value: unknown) => JSON.stringify(value),
	require: () => policy,
}) as {
	nameError: (name: string) => string
	suggestions: (event: unknown) => unknown
	validate: (app: unknown, record: unknown, extras: unknown, published?: unknown) => void
}
const hooks = runInNewContext(`${source}\nmodule.exports`, {
	module: { exports: {} },
	BadRequestError: Error,
	ForbiddenError: Error,
	$dbx: { hashExp: (value: unknown) => value },
	__hooks: "hooks",
	require: () => customHooks,
	toString: (value: unknown) => JSON.stringify(value),
}) as {
	guard: (event: unknown, creating: boolean) => void
	audit: (event: unknown, creating: boolean) => void
	reserve: (event: unknown) => void
}

function record(values: Record<string, unknown>, previous: Record<string, unknown> = {}) {
	return {
		id: String(values.id || "proposal"),
		get: (key: string) => values[key] ?? null,
		getString: (key: string) => String(values[key] || ""),
		getUnsavedFiles: () => [],
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
			store: () => ({ get: () => null, set: vi.fn() }),
			findRecordsByFilter: vi.fn((_collection: string, _filter: string): unknown[] => []),
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

	it.each(["pending", "approved"])("prevents an owner from renaming the target of another contributor's %s proposal", (status) => {
		const previous = { name: "pdf", status: "pending", created_by: "proposer", target_submission: "" }
		const event = proposalEvent({ id: "original", name: "renamed-pdf", target_submission: "" }, previous)
		const proposal = record({ name: "pdf", target_submission: "original", status, created_by: "other-contributor" })
		event.app.findRecordsByFilter.mockImplementation((collection) => (collection === "submissions" ? [proposal] : []))
		expect(() => hooks.guard(event, false)).toThrow("A submission with active update proposals cannot be renamed")
		expect(event.next).not.toHaveBeenCalled()
		expect(proposal.getString("name")).toBe("pdf")
	})

	it("revalidates a rejected proposal when reopening it after its inactive target was renamed", () => {
		const previous = { name: "pdf", status: "rejected", created_by: "proposer", target_submission: "original" }
		const event = proposalEvent({}, previous)
		event.app.findRecordById.mockReturnValue(record({ name: "renamed-pdf" }))
		expect(() => hooks.guard(event, false)).toThrow("A proposal must use its target submission's icon name")
		expect(event.next).not.toHaveBeenCalled()
	})
})

describe("Custom variant rules at the direct PocketBase boundary", () => {
	it.each([
		["demo-a", { variants: { b: "custom.svg" } }, "demo-a-b"],
		["demo-a-b", {}, "demo-a-b"],
		["control", { variants: { "d-dark": "custom.svg" } }, "control-d-dark"],
		["brand-identity", {}, "brand-identity"],
	])("rejects cross-owner published stems for %s", (name, extras, stem) => {
		const event = proposalEvent({ name, target_submission: "", extras, assets: ["base.svg", "custom.svg"] })
		expect(() => hooks.guard(event, true)).toThrow(stem)
		expect(event.next).not.toHaveBeenCalled()
	})

	it("permits replacing a stem owned by the same Icon", () => {
		const event = proposalEvent({
			name: "demo",
			target_submission: "",
			extras: { variants: { "a-b": "custom.svg" } },
			assets: ["base.svg", "custom.svg"],
		})
		hooks.guard(event, true)
		expect(event.next).toHaveBeenCalledOnce()
	})

	it("rejects two namespace aliases targeting the same destination", () => {
		expect(
			policy.stemCollisionError(
				"demo",
				[
					["dark", "demo-dark"],
					["custom:dark", "demo-dark"],
				],
				new Map(),
			),
		).toContain("share destination demo-dark")
	})

	it.each([
		["new-a", { variants: { b: "custom.svg" } }, "new", { variants: { "a-b": "other.svg" } }],
		["new", { variants: { "a-b": "custom.svg" } }, "new-a", { variants: { b: "other.svg" } }],
		["new-a-b", {}, "new", { variants: { "a-b": "other.svg" } }],
	])("rejects pending ownership collisions in both orderings for %s", (name, extras, pendingName, pendingExtras) => {
		const event = proposalEvent({ name, target_submission: "", extras, assets: ["base.svg", "custom.svg"] })
		event.app.findRecordsByFilter.mockImplementation((collection) =>
			collection === "submissions" ? [record({ id: "other", name: pendingName, extras: pendingExtras })] : [],
		)
		expect(() => hooks.guard(event, true)).toThrow("new-a-b")
	})

	it("allows unchanged status-only rejection after a published collision arose", () => {
		const previous = {
			name: "proton",
			target_submission: "",
			extras: { variants: { mail: "custom.svg" } },
			assets: ["base.svg", "custom.svg"],
			status: "pending",
			created_by: "proposer",
		}
		const event = proposalEvent({ ...previous, status: "rejected" }, previous)
		const transaction = { ...event.app, findRecordById: () => record(previous), findCollectionByNameOrId: vi.fn(), save: vi.fn() }
		const Entry = class {
			load() {}
		}
		const auditHooks = runInNewContext(`${source}\nmodule.exports`, {
			module: { exports: {} },
			BadRequestError: Error,
			ForbiddenError: Error,
			Record: Entry,
			$dbx: { hashExp: (value: unknown) => value },
			__hooks: "hooks",
			require: () => customHooks,
			toString: (value: unknown) => JSON.stringify(value),
		}) as typeof hooks
		auditHooks.audit(
			{ ...event, app: { ...event.app, runInTransaction: (callback: (app: typeof transaction) => void) => callback(transaction) } },
			false,
		)
		expect(event.next).toHaveBeenCalledOnce()
	})

	it.each(["approved", "rejected"])("keeps ownership validation for %s when required", (status) => {
		const previous = {
			name: "proton",
			target_submission: "",
			extras: { variants: { mail: "custom.svg" } },
			assets: ["base.svg", "custom.svg"],
			status: "pending",
			created_by: "proposer",
			description: "Original",
		}
		let description = previous.description
		if (status === "rejected") description = "Changed content"
		const event = proposalEvent({ ...previous, status, description }, previous)
		const transaction = { ...event.app, findRecordById: () => record(previous) }
		expect(() =>
			hooks.audit(
				{ ...event, app: { ...event.app, runInTransaction: (callback: (app: typeof transaction) => void) => callback(transaction) } },
				false,
			),
		).toThrow("proton-mail")
		expect(event.next).not.toHaveBeenCalled()
	})

	it.each([
		"Invalid",
		"two--words",
		"white_icon",
		"-animated",
		"animated-",
		"x".repeat(33),
		...RESERVED_VARIANT_NAMES,
	])("rejects %s consistently with the shared web service", (name) => {
		expect(customVariantNameError(name)).toBeTruthy()
		expect(customHooks.nameError(name)).toBe(customVariantNameError(name))
		const event = proposalEvent({ extras: { variants: { [name]: "animated.svg" } }, assets: ["base.svg", "animated.svg"] })
		expect(() => hooks.guard(event, true)).toThrow()
		expect(event.next).not.toHaveBeenCalled()
	})

	it("blocks a published slug collision even when writing directly", () => {
		const event = proposalEvent({
			name: "proton",
			target_submission: "",
			extras: { variants: { mail: "mail.svg" } },
			assets: ["base.svg", "mail.svg"],
		})
		expect(() => hooks.guard(event, true)).toThrow("existing Icon proton-mail")
		expect(event.next).not.toHaveBeenCalled()
	})

	it("also rejects a collision inside the model write transaction, without a request guard", () => {
		const values = {
			name: "proton",
			target_submission: "",
			extras: { variants: { mail: "mail.svg" } },
			assets: ["base.svg", "mail.svg"],
			status: "pending",
			created_by: "proposer",
		}
		const event = proposalEvent(values, values)
		const transaction = { ...event.app, findRecordById: () => record(values) }
		const runInTransaction = vi.fn((callback: (app: typeof transaction) => void) => callback(transaction))
		expect(() => hooks.audit({ ...event, app: { ...event.app, runInTransaction } }, false)).toThrow("existing Icon proton-mail")
		expect(runInTransaction).toHaveBeenCalledOnce()
		expect(event.next).not.toHaveBeenCalled()
	})

	it("blocks a pending Icon collision on rename", () => {
		const extras = { variants: { animated: "animated.svg" } }
		const event = proposalEvent(
			{ target_submission: "", extras, assets: ["base.svg", "animated.svg"] },
			{ name: "old", status: "pending", created_by: "proposer" },
		)
		event.app.findRecordsByFilter.mockImplementation((collection, filter) =>
			collection === "submissions" && filter.includes("id !=") ? [record({ name: "pdf-animated" })] : [],
		)
		expect(() => hooks.guard(event, false)).toThrow("existing Icon pdf-animated")
	})

	it("accepts opaque names and labels the right background without stealing Base", () => {
		const extras = { variants: { "animated-dark": "dark.svg", "animated-light": "light.svg" } }
		const event = proposalEvent({ target_submission: "", extras, assets: ["dark.svg", "base.svg", "light.svg"] })
		hooks.guard(event, true)
		expect(event.next).toHaveBeenCalledOnce()
		expect(labelledAssets(extras, ["dark.svg", "base.svg", "light.svg"])).toEqual([
			{ file: "base.svg", variant: "base" },
			{ file: "dark.svg", variant: "custom:animated-dark" },
			{ file: "light.svg", variant: "custom:animated-light" },
		])
		expect(variantKind("custom:animated-dark")).toMatchObject({ label: "animated-dark", background: "light", suffix: "-animated-dark" })
		expect(variantKind("custom:animated-light").background).toBe("dark")
	})

	it("labels unambiguous legacy filenames before assigning the Base", () => {
		expect(
			labelledAssets({ colors: { light: "demo-light.svg" }, variants: { outlined: "demo-outlined.png" } }, [
				"demo_abcdefghij.svg",
				"demo_light_0123456789.svg",
				"demo_outlined_abcdefghij.png",
			]),
		).toEqual([
			{ file: "demo_abcdefghij.svg", variant: "base" },
			{ file: "demo_light_0123456789.svg", variant: "light" },
			{ file: "demo_outlined_abcdefghij.png", variant: "custom:outlined" },
		])
	})

	it("does not guess a Base or legacy slot when multiple files remain unassigned", () => {
		expect(
			labelledAssets({ colors: { light: "demo-light.svg" } }, ["demo_light_abcdefghij.svg", "demo_light_0123456789.svg", "unknown.png"]),
		).toEqual([
			{ file: "demo_light_abcdefghij.svg", variant: null },
			{ file: "demo_light_0123456789.svg", variant: null },
			{ file: "unknown.png", variant: null },
		])
	})

	it("matches exact files first without confusing a longer filename prefix for a legacy slot", () => {
		expect(matchingAssetNames("demo-light.svg", ["demo-light.svg", "demo_light_abcdefghij.svg"])).toEqual(["demo-light.svg"])
		expect(matchingAssetNames("demo-light.svg", ["demo_lightning_abcdefghij.svg"])).toEqual([])
		expect(matchingAssetNames("demo-outlined.svg", ["demo_outlined_abcdefghij.png"])).toEqual([])
	})

	it("does not assign a single file to two conflicting legacy references", () => {
		const resolved = resolveSubmissionAssets({ colors: { light: "demo-light.svg", dark: "demo_light.svg" } }, ["demo_light_abcdefghij.svg"])
		expect(resolved.assets).toEqual([{ file: "demo_light_abcdefghij.svg", variant: null }])
		expect(resolved.references.every((reference) => !reference.file)).toBe(true)
	})

	it("keeps an unambiguous Base separate from every ambiguous original file regardless of file order", () => {
		const files = ["demo_light_abcdefghij.svg", "demo_abcdefghij.svg", "demo_light_0123456789.svg"]
		for (const assets of [files, [...files].reverse()]) {
			const resolved = resolveSubmissionAssets({ colors: { light: "demo-light.svg" } }, assets, "demo")
			expect(resolved.assets.find((asset) => asset.variant === "base")?.file).toBe("demo_abcdefghij.svg")
			expect(
				resolved.assets
					.filter((asset) => !asset.variant)
					.map((asset) => asset.file)
					.sort(),
			).toEqual(["demo_light_0123456789.svg", "demo_light_abcdefghij.svg"])
		}
	})

	it("normalizes legacy references before remapping rejected snapshot files and keeps all slot identities", () => {
		const extras = {
			colors: { light: "demo-light.svg" },
			wordmark: { default: "demo-wordmark.svg" },
			variants: { outlined: "demo-outlined.png" },
		}
		const files = ["demo_abcdefghij.svg", "demo_light_abcdefghij.svg", "demo_wordmark_abcdefghij.svg", "demo_outlined_abcdefghij.png"]
		const copies = Object.fromEntries(files.map((file) => [file, `reviewed_${file}`]))
		const snapshot = snapshotVariantMetadata(extras, files, copies, "demo")
		expect(snapshot.extras.colors.light).toBe(copies[files[1]])
		expect(snapshot.extras.wordmark.default).toBe(copies[files[2]])
		expect(snapshot.extras.variants.outlined).toBe(copies[files[3]])
		expect(Object.values(snapshot.asset_variants)).toEqual(["base", "light", "wordmark", "custom:outlined"])
		expect(snapshot.unresolved_variants).toEqual([])
		expect(extras.colors.light).toBe("demo-light.svg")
	})

	it("retains all ambiguous snapshot candidates and their original label reference without dangling links", () => {
		const extras = { colors: { light: "demo-light.svg" } }
		const files = ["demo_abcdefghij.svg", "demo_light_abcdefghij.svg", "demo_light_0123456789.svg"]
		const copies = Object.fromEntries(files.map((file) => [file, `reviewed_${file}`]))
		const snapshot = snapshotVariantMetadata(extras, files, copies, "demo")
		expect(snapshot.extras.colors).toEqual({})
		expect(snapshot.asset_variants).toEqual({ [copies[files[0]]]: "base" })
		expect(snapshot.unresolved_variants).toEqual([
			{ variant: "light", reference: "demo-light.svg", assets: [copies[files[1]], copies[files[2]]] },
		])
		expect(Object.keys(snapshot.asset_sources)).toEqual(Object.values(copies))
		expect(Object.values(snapshot.asset_sources)).toEqual(files)
		expect(JSON.stringify(snapshot)).not.toContain("undefined")
	})

	it("combines published and pending names on the server", () => {
		const event = proposalEvent()
		event.app.findRecordsByFilter.mockReturnValue([record({ extras: { variants: { animated: "animated.svg", "4k": "4k.svg" } } })])
		const json = vi.fn()
		customHooks.suggestions({ app: event.app, json })
		expect(json).toHaveBeenCalledWith(200, { names: ["4k", "a-b", "animated"] })
	})

	it("rechecks collisions at publication when another Icon claimed the stem after approval", () => {
		const approved = record({
			id: "approved",
			name: "demo",
			status: "approved",
			updated: "now",
			extras: { variants: { animated: "animated.svg" } },
		})
		const transaction = {
			store: () => ({ get: () => null, set: vi.fn() }),
			countRecords: () => 0,
			findRecordById: () => approved,
			findRecordsByFilter: () => [record({ name: "demo-animated" })],
		}
		const event = {
			auth: { getBool: () => true },
			hasSuperuserAuth: () => false,
			requestInfo: () => ({ body: { items: [{ id: approved.id, updated: "now" }] } }),
			app: { ...transaction, runInTransaction: (callback: (app: typeof transaction) => void) => callback(transaction) },
		}
		expect(() => hooks.reserve(event)).toThrow("existing Icon demo-animated")
	})
})

it("rejects publishing two distinct proposals for the same filename in one batch", () => {
	const records = [
		record({ id: "first", name: "pdf", status: "approved", updated: "2026-10-12" }),
		record({ id: "second", name: "pdf", status: "approved", updated: "2026-10-12" }),
	]
	const transaction = {
		store: () => ({ get: () => null, set: vi.fn() }),
		countRecords: () => 0,
		findRecordsByFilter: () => [],
		findRecordById: (_collection: string, id: string) => records.find((item) => item.id === id),
		findCollectionByNameOrId: vi.fn(),
		save: vi.fn(),
	}
	const event = {
		auth: { getBool: () => true },
		hasSuperuserAuth: () => false,
		requestInfo: () => ({ body: { items: records.map((item) => ({ id: item.id, updated: item.getString("updated") })) } }),
		app: { ...transaction, runInTransaction: (callback: (tx: typeof transaction) => void) => callback(transaction) },
	}
	expect(() => hooks.reserve(event)).toThrow("Publish only one proposal per icon name in a batch")
	expect(transaction.save).not.toHaveBeenCalled()
})

it("migrates a production-named unique index without dropping custom gallery metadata", () => {
	const uniqueName = "CREATE UNIQUE INDEX `idx_tYwjb2WXCZ` ON `submissions` (`name`)"
	const otherIndex = "CREATE INDEX idx_dashboard_submissions_updated ON submissions (updated DESC, id DESC)"
	const compositeIndex = "CREATE UNIQUE INDEX idx_example_composite ON submissions (name, created_by)"
	const submissions = { id: "submissions", indexes: [uniqueName, otherIndex, compositeIndex], fields: { add: vi.fn() }, updateRule: "" }
	const gallery = {
		viewQuery:
			"SELECT s.id, s.name, s.admin_comment, s.description, u.github_id AS created_by_github_id, u.username AS created_by FROM submissions s JOIN users u ON s.created_by = u.id;",
	}
	let upgrade: (app: unknown) => void = () => {
		throw new Error("Migration callback was not registered")
	}
	const migration = readFileSync(new URL("../../../backend/pb_migrations/1791800000_submission_proposals.js", import.meta.url), "utf8")
	runInNewContext(migration, {
		migrate: (up: typeof upgrade) => {
			upgrade = up
		},
		RelationField: class {
			constructor(options: Record<string, unknown>) {
				Object.assign(this, options)
			}
		},
	})
	upgrade({ findCollectionByNameOrId: (name: string) => (name === "submissions" ? submissions : gallery), save: vi.fn() })
	expect(submissions.indexes).not.toContain(uniqueName)
	expect(submissions.indexes).toContain(otherIndex)
	expect(submissions.indexes).toContain(compositeIndex)
	expect(gallery.viewQuery).toContain("s.target_submission")
	expect(gallery.viewQuery).toContain("s.admin_comment")
	expect(gallery.viewQuery).toContain("s.description")
	expect(gallery.viewQuery).toContain("u.github_id AS created_by_github_id")
})

describe("Update removal payload validation", () => {
	const target: UpdateTarget = {
		kind: "published",
		name: "demo",
		id: "",
		revision: "current",
		updated: "",
		status: "published",
		metadata: { base: "svg", aliases: [], categories: [] },
		files: { base: "demo", dark: "demo-dark" },
		source: { commit: "a".repeat(40), blobs: {} },
	}
	const invalid: unknown[] = [
		false,
		0,
		null,
		"",
		true,
		1,
		{},
		"dark",
		[null],
		[false],
		[0],
		[""],
		[[]],
		[{ key: 0 }],
		[{ key: "dark", note: false }],
	]
	let pb: ReturnType<typeof pocketbase.createServerPB>
	let create: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		pb = pocketbase.createServerPB()
		vi.spyOn(pb, "send").mockResolvedValue(target)
		create = vi
			.spyOn(pb.collection("submissions"), "create")
			.mockResolvedValue({ id: "saved", collectionId: "submissions", collectionName: "submissions" })
		vi.spyOn(pocketbase, "createServerPB").mockReturnValue(pb)
		vi.spyOn(authentication, "refreshPocketBaseSession").mockResolvedValue({
			ok: true,
			token: "test-token",
			user: { id: "contributor", username: "contributor", admin: false },
		})
	})

	afterEach(() => vi.restoreAllMocks())

	function input(): IconUpdateInput {
		return {
			kind: "update",
			name: "demo",
			revision: "current",
			targetSubmission: "",
			description: "",
			assets: {},
			aliases: ["alias"],
			categories: [],
		}
	}

	function multipart(value?: string) {
		const body = new FormData()
		body.set("kind", "update")
		body.set("name", "demo")
		body.set("revision", "current")
		body.append("aliases", "alias")
		if (value !== undefined) body.set("remove_variants", value)
		return new Request("http://localhost/api/submissions", { method: "POST", headers: { Authorization: "test-token" }, body })
	}

	it.each(invalid)("returns a validation outcome for direct service payload %j", async (value) => {
		const proposal = input()
		Reflect.set(proposal, "removeVariants", value)
		expect(await createIconUpdate(pb, "contributor", proposal)).toEqual({ ok: false, error: expect.any(String) })
		expect(create).not.toHaveBeenCalled()
	})

	it.each(invalid)("returns 400, not 502, for multipart payload %j", async (value) => {
		const response = await POST(multipart(JSON.stringify(value)))
		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({ error: expect.any(String) })
		expect(create).not.toHaveBeenCalled()
	})

	it("rejects an explicitly empty multipart field rather than treating it as omitted", async () => {
		const response = await POST(multipart(""))
		expect(response.status).toBe(400)
		expect(create).not.toHaveBeenCalled()
	})

	it.each([undefined, []])("allows direct metadata-only updates with removal payload %j", async (value) => {
		expect(await createIconUpdate(pb, "contributor", { ...input(), removeVariants: value })).toMatchObject({ ok: true })
		expect(create).toHaveBeenCalledOnce()
	})

	it.each([undefined, "[]"])("allows multipart metadata-only updates with removal field %j", async (value) => {
		const response = await POST(multipart(value))
		expect(response.status).toBe(201)
		expect(create).toHaveBeenCalledOnce()
	})
})
