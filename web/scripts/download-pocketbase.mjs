import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const { values } = parseArgs({
	options: {
		platform: { type: "string", default: process.platform },
		arch: { type: "string", default: process.arch === "x64" ? "amd64" : process.arch },
		output: { type: "string", default: fileURLToPath(new URL("../backend/pocketbase", import.meta.url)) },
	},
})
const release = JSON.parse(await readFile(new URL("../backend/pocketbase-release.json", import.meta.url), "utf8"))
const platform = `${values.platform}_${values.arch}`
const expected = release.checksums[platform]
if (!expected) throw new Error(`Unsupported PocketBase platform: ${platform}. Supported: ${Object.keys(release.checksums).join(", ")}`)

const archive = `pocketbase_${release.version}_${platform}.zip`
const response = await fetch(`https://github.com/pocketbase/pocketbase/releases/download/v${release.version}/${archive}`)
if (!response.ok) throw new Error(`PocketBase download failed: HTTP ${response.status}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error(`PocketBase checksum mismatch for ${archive}`)

const temporary = await mkdtemp(join(tmpdir(), "dashboard-icons-pocketbase-"))
try {
	const zip = join(temporary, archive)
	await writeFile(zip, bytes)
	execFileSync("unzip", ["-j", zip, "pocketbase", "-d", temporary], { stdio: "pipe" })
	const output = resolve(values.output)
	await mkdir(dirname(output), { recursive: true })
	await copyFile(join(temporary, "pocketbase"), output)
	await chmod(output, 0o755)
	console.log(`Installed PocketBase ${release.version} (${platform}) at ${output}; SHA-256 verified.`)
} finally {
	await rm(temporary, { recursive: true, force: true })
}
