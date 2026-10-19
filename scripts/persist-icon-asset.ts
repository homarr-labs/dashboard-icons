import { mkdir, rm } from "node:fs/promises"
import path from "node:path"

export async function persistIconAsset(
	pbUrl: string,
	token: string,
	id: string,
	file: string,
	stem: string,
	beforeWrite: () => Promise<unknown>,
	root = process.cwd(),
) {
	const extension = path.extname(file).slice(1).toLowerCase()
	if (!["svg", "png"].includes(extension) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(stem)) throw new Error("Unsafe Variant destination")
	const response = await fetch(`${pbUrl}/api/files/submissions/${id}/${encodeURIComponent(file)}`, { headers: { Authorization: token } })
	if (!response.ok) throw new Error(`Could not download ${file} (${response.status})`)
	const bytes = await response.arrayBuffer()
	await beforeWrite()
	const output = path.join(root, extension, `${stem}.${extension}`)
	await mkdir(path.dirname(output), { recursive: true })
	await Bun.write(output, bytes)
	if (extension === "png") await rm(path.join(root, "svg", `${stem}.svg`), { force: true })
	else await rm(path.join(root, "png", `${stem}.png`), { force: true })
	await rm(path.join(root, "webp", `${stem}.webp`), { force: true })
	const conversion = Bun.spawn(["python3", path.join(import.meta.dir, "convert-icon-asset.py"), output, root], {
		stdout: "inherit",
		stderr: "inherit",
	})
	if ((await conversion.exited) !== 0) throw new Error(`Variant conversion failed for ${stem}`)
}
