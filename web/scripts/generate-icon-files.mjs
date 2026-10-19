import { readdir, readFile, writeFile } from "node:fs/promises"

const formats = ["svg", "png", "webp"]
const files = new Map()
const skipped = []
let accepted = 0

function detectFormat(bytes) {
	if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png"
	if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp"
	let encoding = "utf-8"
	if (bytes[0] === 255 && bytes[1] === 254) encoding = "utf-16le"
	if (bytes[0] === 254 && bytes[1] === 255) encoding = "utf-16be"
	let markup = new TextDecoder(encoding).decode(bytes).trimStart()
	const preamble = /^(?:<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\s+svg\b(?:[^[>"']|"[^"]*"|'[^']*'|\[[\s\S]*?\])*>)/
	for (let match = markup.match(preamble); match; match = markup.match(preamble)) {
		markup = markup.slice(match[0].length).trimStart()
	}
	if (/^<(?:[A-Za-z_][\w.-]*:)?svg(?:\s|\/?>)/.test(markup)) return "svg"
	return "unknown"
}

for (const format of formats) {
	const directory = new URL(`../../${format}/`, import.meta.url)
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(`.${format}`)) continue
		const detected = detectFormat(await readFile(new URL(entry.name, directory)))
		if (detected !== format) {
			skipped.push({ path: `${format}/${entry.name}`, expected: format, detected })
			continue
		}
		const stem = entry.name.slice(0, -(format.length + 1))
		const available = files.get(stem) ?? []
		available.push(format)
		files.set(stem, available)
		accepted++
	}
}

const groups = {}
for (const stem of [...files.keys()].sort()) {
	const key = files.get(stem).join(",")
	groups[key] ??= []
	groups[key].push(stem)
}

const output = new URL("../src/lib/icons/native-icon-files.json", import.meta.url)
await writeFile(output, `${JSON.stringify(groups, null, "\t")}\n`)
console.log(`Recorded ${accepted} compatible assets across ${files.size} native Icon file stems.`)
if (skipped.length) {
	console.warn(`Skipped ${skipped.length} incompatible assets. Raw files were left unchanged:`)
	for (const asset of skipped.sort((a, b) => a.path.localeCompare(b.path))) {
		console.warn(`  ${asset.path}: expected ${asset.expected.toUpperCase()}, detected ${asset.detected.toUpperCase()}`)
	}
	console.warn(
		"Restore an asset matching its extension or publish it in the correct format directory, then rerun pnpm generate:icon-files.",
	)
}
