import { createHash } from "node:crypto"
import { lstat, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"

export async function readPublicationFile(filename: string): Promise<Buffer | undefined> {
	try {
		const stat = await lstat(filename)
		if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Publication target must be a regular file: ${filename}`)
		return await readFile(filename)
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined
		throw error
	}
}

function hash(bytes: Buffer | undefined) {
	if (!bytes) return "missing"
	return createHash("sha256").update(bytes).digest("hex")
}

export async function publishIconUpdate(
	root: string,
	staging: string,
	before: Map<string, Buffer | undefined>,
	metadata: string,
	verify: () => Promise<unknown>,
) {
	await verify()
	for (const [relative, bytes] of before) {
		if (hash(await readPublicationFile(path.join(root, relative))) !== hash(bytes))
			throw new Error(`Publication target changed: ${relative}`)
	}
	const metadataPath = path.join(root, "metadata.json")
	const metadataBefore = await readFile(metadataPath)
	const metadataStaged = path.join(staging, "metadata.json")
	await writeFile(metadataStaged, metadata)
	const published: string[] = []
	try {
		for (const relative of before.keys()) {
			if (relative === "metadata.json") continue
			const output = path.join(root, relative)
			const staged = path.join(staging, relative)
			const bytes = await readPublicationFile(staged)
			published.push(relative)
			if (bytes) await rename(staged, output)
			else await rm(output, { force: true })
		}
		await rename(metadataStaged, metadataPath)
	} catch (error) {
		const failures: unknown[] = [error]
		for (const relative of published.reverse()) {
			try {
				const bytes = before.get(relative)
				if (bytes) await writeFile(path.join(root, relative), bytes)
				else await rm(path.join(root, relative), { force: true })
			} catch (rollbackError) {
				failures.push(rollbackError)
			}
		}
		if (hash(await readPublicationFile(metadataPath)) !== hash(metadataBefore))
			failures.push(new Error("Metadata changed during publication"))
		if (failures.length > 1) throw new AggregateError(failures, "Publication failed; inspect rollback errors before retrying")
		throw error
	}
}
