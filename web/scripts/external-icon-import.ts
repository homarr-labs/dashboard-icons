import type PocketBase from "pocketbase"

const COLLECTION = "external_icons"

export type CollectionField = Record<string, unknown> & {
	name?: string
	values?: unknown
}

type StoredIcon = {
	id: string
	slug: string
}

type ImportIcon = Record<string, unknown> & {
	source: string
	slug: string
	aliases: string[]
}

type SchemaRepair = {
	id: string
	fields: CollectionField[]
	changedFields: string[]
}

type RecordChange =
	| { action: "create"; record: ImportIcon }
	| { action: "update"; id: string; record: ImportIcon }
	| { action: "delete"; id: string; slug: string }

type ImportPlan = {
	source: string
	schemaRepair?: SchemaRepair
	changes: RecordChange[]
	counts: { create: number; update: number; delete: number }
	alreadyCurrent: boolean
}

type ImportOptions<Row extends StoredIcon> = {
	source: string
	fields?: (keyof Row & string)[]
	mergeFields?: (fields: CollectionField[]) => CollectionField[]
	// Return null when the source's rows are already current.
	buildRecords: (existing: Row[], needsSchemaRepair: boolean) => ImportIcon[] | null
}

export async function planExternalIconImport<Row extends StoredIcon = StoredIcon>(
	pb: PocketBase,
	{ source, fields = [], mergeFields, buildRecords }: ImportOptions<Row>,
): Promise<ImportPlan> {
	let schemaRepair: SchemaRepair | undefined
	let readableFields = fields
	if (mergeFields) {
		const collection = await pb.collections.getOne<{ id: string; fields: CollectionField[] }>(COLLECTION)
		const storedFields = new Set(collection.fields.map((field) => field.name))
		readableFields = fields.filter((field) => storedFields.has(field))

		const mergedFields = mergeFields(collection.fields)
		const changedFields = mergedFields.flatMap((field, index) => {
			if (!field.name || JSON.stringify(field) === JSON.stringify(collection.fields[index])) return []
			return [field.name]
		})
		if (changedFields.length) schemaRepair = { id: collection.id, fields: mergedFields, changedFields }
	}

	const existing = await pb.collection(COLLECTION).getFullList<Row>({
		filter: pb.filter("source = {:source}", { source }),
		fields: ["id", "slug", ...readableFields].join(","),
		requestKey: null,
	})
	const records = buildRecords(existing, Boolean(schemaRepair))
	const changes: RecordChange[] = []
	const counts = { create: 0, update: 0, delete: 0 }
	const plan = { source, schemaRepair, changes, counts, alreadyCurrent: records === null }
	if (records === null) return plan

	const existingBySlug = new Map(existing.map(({ slug, id }) => [slug, id]))
	const importedSlugs = new Set<string>()
	for (const record of records) {
		if (record.source !== source) throw new Error(`Cannot import ${record.source}/${record.slug} into ${source}`)
		if (importedSlugs.has(record.slug)) throw new Error(`Duplicate import slug: ${source}/${record.slug}`)
		importedSlugs.add(record.slug)
		const id = existingBySlug.get(record.slug)
		if (id) {
			changes.push({ action: "update", id, record })
			counts.update++
		} else {
			changes.push({ action: "create", record })
			counts.create++
		}
	}

	for (const [slug, id] of existingBySlug) {
		if (importedSlugs.has(slug)) continue
		changes.push({ action: "delete", id, slug })
		counts.delete++
	}
	return plan
}

export async function executeExternalIconImport(pb: PocketBase, plan: ImportPlan, dryRun: boolean): Promise<void> {
	const { source, schemaRepair, changes } = plan
	if (dryRun) {
		if (schemaRepair) console.log(`[dry-run] repair ${COLLECTION} schema for ${source}: ${schemaRepair.changedFields.join(", ")}`)
		for (const change of changes) {
			if (change.action === "delete") console.log(`[dry-run] delete: ${change.slug}`)
			else console.log(`[dry-run] ${change.action}: ${change.record.slug} (aliases: ${change.record.aliases.join(", ") || "none"})`)
		}
		return
	}

	if (schemaRepair) await pb.collections.update(schemaRepair.id, { fields: schemaRepair.fields })
	const collection = pb.collection(COLLECTION)
	for (const change of changes) {
		switch (change.action) {
			case "create":
				await collection.create(change.record)
				break
			case "update":
				await collection.update(change.id, change.record)
				break
			case "delete":
				await collection.delete(change.id)
				break
		}
	}
}
