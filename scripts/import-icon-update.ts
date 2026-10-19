import { createHash } from "node:crypto"
import path from "node:path"
import {
	canonical,
	destination,
	type IconUpdate,
	mergeMetadata,
	revisionContent,
	type UpdateMetadata,
	type UpdateTarget,
	type UpdateVariantKey,
	validateDelta,
	variantFiles,
} from "../web/backend/pb_hooks/icon-update-policy.js"
import { snapshotVariantMetadata } from "../web/backend/pb_hooks/submission-assets.js"
import { addStemOwnership, stemCollisionError, stemOwnership, submissionVariantStems } from "../web/backend/pb_hooks/variant-policy.js"
import { persistIconAsset } from "./persist-icon-asset"

interface UpdateSubmission {
	id: string
	name: string
	assets: string[]
	icon_update: IconUpdate
}

interface ActiveSubmission {
	id: string
	name: string
	extras?: UpdateMetadata
	icon_update?: IconUpdate
}

export async function importIconUpdate(
	pbUrl: string,
	token: string,
	submission: UpdateSubmission,
	dryRun: boolean,
	author: { id: string | number; name?: string; login?: string },
) {
	const root = process.cwd()
	const metadataPath = path.join(root, "metadata.json")
	const update = submission.icon_update
	if (update.target.kind === "published" && !update.target.source)
		throw new Error("The published source snapshot is missing. Create a fresh proposal.")
	const checkedStems = new Set(Object.values(update.target.files).filter((stem): stem is string => typeof stem === "string"))
	const expectedBlobs = { ...update.target.source?.blobs }
	const readBlobs = async (stems: Set<string>) => {
		const blobs: Record<string, string> = {}
		for (const stem of stems) {
			if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(stem)) throw new Error("Unsafe published Variant file stem")
			for (const format of ["svg", "png", "webp"]) {
				const name = `${format}/${stem}.${format}`
				const file = Bun.file(path.join(root, name))
				if (!(await file.exists())) continue
				const bytes = await file.arrayBuffer()
				blobs[name] = createHash("sha1").update(`blob ${bytes.byteLength}\0`).update(new Uint8Array(bytes)).digest("hex")
			}
		}
		return blobs
	}
	const headers = { Authorization: token }
	const request = async <T>(url: string): Promise<T> => {
		const response = await fetch(url, { headers })
		if (!response.ok) throw new Error(`Could not verify Update proposal (${response.status})`)
		return response.json() as Promise<T>
	}
	const verify = async () => {
		const metadata = (await Bun.file(metadataPath).json()) as Record<string, UpdateMetadata>
		const baseline = update.target
		let content: Omit<UpdateTarget, "revision">
		if (baseline.kind === "published") {
			if (!Object.hasOwn(metadata, submission.name)) throw new Error("Published target no longer exists")
			content = {
				kind: "published",
				id: "",
				name: submission.name,
				metadata: metadata[submission.name],
				files: variantFiles(submission.name, metadata[submission.name]),
				updated: "",
				status: "published",
				source: baseline.source,
			}
			if (canonical(await readBlobs(checkedStems)) !== canonical(expectedBlobs))
				throw new Error("Target Icon artwork changed. Create a fresh proposal against the current source files.")
		} else {
			if (Object.hasOwn(metadata, submission.name))
				throw new Error("Community target was already published. Create a fresh proposal against the published Icon.")
			const target = await request<{
				id: string
				name: string
				status: string
				updated: string
				assets: string[]
				extras: UpdateMetadata
				icon_update?: IconUpdate
			}>(`${pbUrl}/api/collections/submissions/records/${baseline.id}`)
			if (target.name !== submission.name || target.status !== "pending" || target.icon_update)
				throw new Error("Community target changed. Create a fresh proposal.")
			const resolved = snapshotVariantMetadata(
				target.extras,
				target.assets,
				Object.fromEntries(target.assets.map((file) => [file, file])),
				target.name,
			)
			const targetMetadata = { ...resolved.extras, aliases: target.extras.aliases || [], categories: target.extras.categories || [] }
			const files = Object.fromEntries(Object.entries(resolved.asset_variants).map(([file, variant]) => [variant, file]))
			if (!targetMetadata.base) targetMetadata.base = files.base?.split(".").pop() || "svg"
			content = {
				kind: "submission",
				id: target.id,
				name: target.name,
				metadata: targetMetadata,
				files,
				updated: target.updated,
				status: target.status,
			}
			const unassigned = target.assets.filter((file) => !Object.hasOwn(resolved.asset_variants, file))
			if (unassigned.length || resolved.unresolved_variants.length || !files.base)
				content.unresolved = { assets: unassigned, references: resolved.unresolved_variants }
		}
		const current = {
			...content,
			revision: createHash("sha256")
				.update(canonical(revisionContent(content)))
				.digest("hex"),
		}
		const error = validateDelta(update, current, submission.assets)
		if (error) throw new Error(error)
		const index = stemOwnership(metadata)
		let page = 1
		while (true) {
			const query = new URLSearchParams({
				page: String(page),
				perPage: "500",
				filter: 'status = "pending" || status = "approved"',
				fields: "id,name,extras,icon_update",
			})
			const pending = await request<{ items: ActiveSubmission[]; totalPages: number }>(
				`${pbUrl}/api/collections/submissions/records?${query}`,
			)
			for (const item of pending.items) {
				if (item.id === submission.id) continue
				let stems = submissionVariantStems(item.name, item.extras)
				if (item.icon_update) stems = item.icon_update.variants.map((change) => [change.key, change.destination])
				addStemOwnership(index, item.name, stems)
			}
			if (page >= pending.totalPages) break
			page++
		}
		const stems: [string, string][] = update.variants.map((change) => [change.key, change.destination])
		if (baseline.kind === "submission")
			for (const key of Object.keys(baseline.files))
				if (!update.variants.some((change) => change.key === key))
					stems.push([key, destination(submission.name, key as UpdateVariantKey, baseline)])
		const collision = stemCollisionError(submission.name, stems, index)
		if (collision) throw new Error(collision)
		return metadata
	}
	await verify()
	const writes = update.variants.map((change) => ({ key: change.key, stem: change.destination, file: change.file, id: submission.id }))
	let baseline = update.target.metadata
	if (update.target.kind === "submission") {
		baseline = { ...baseline, colors: {}, wordmark: {}, variants: {} }
		const preserved: IconUpdate = { ...update, variants: [] }
		for (const [key, file] of Object.entries(update.target.files)) {
			if (!file || update.variants.some((change) => change.key === key)) continue
			const stem = destination(submission.name, key as UpdateVariantKey, update.target)
			writes.push({ key: key as (typeof writes)[number]["key"], stem, file, id: update.target.id })
			preserved.variants.push({ key: key as (typeof writes)[number]["key"], file, destination: stem, action: "add" })
		}
		baseline = mergeMetadata(baseline, preserved)
	}
	for (const item of writes) {
		const extension = item.file.split(".").pop()
		if (!extension || !["svg", "png"].includes(extension) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.stem))
			throw new Error("Unsafe Variant destination")
		console.log(`[icon-update] ${item.file} -> ${item.stem}.${extension}`)
		if (dryRun) continue
		await persistIconAsset(pbUrl, token, item.id, item.file, item.stem, verify)
		if (update.target.kind === "published") {
			checkedStems.add(item.stem)
			for (const format of ["svg", "png", "webp"]) delete expectedBlobs[`${format}/${item.stem}.${format}`]
			Object.assign(expectedBlobs, await readBlobs(new Set([item.stem])))
		}
	}
	const metadata = await verify()
	if (!dryRun) {
		metadata[submission.name] = { ...mergeMetadata(baseline, update), update: { timestamp: new Date().toISOString(), author } }
		await Bun.write(metadataPath, `${JSON.stringify(metadata, null, 4)}\n`)
	}
}
