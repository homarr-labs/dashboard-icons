/**
 * Renders index.html frame by frame and encodes it with ffmpeg.
 * Run from web: node tools/showreel/render.mjs [--fps 60] [--from 0] [--to 22] [--stills 1,2.5] [--out showreel-silent.mp4]
 */
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, "out")
const args = {}
process.argv.slice(2).forEach((arg, i, all) => {
	if (arg.startsWith("--")) args[arg.slice(2)] = all[i + 1]
})

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--hide-scrollbars"] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(args.scale ?? 1) })
page.on("console", (message) => console.log(`[page] ${message.text()}`))
page.on("pageerror", (error) => console.error(`[page error] ${error.message}`))
await page.goto(pathToFileURL(resolve(here, "index.html")).href)
await page.evaluate(() => window.ready)
const duration = await page.evaluate(() => window.DURATION)
await writeFile(resolve(outDir, "events.json"), JSON.stringify({ duration, events: await page.evaluate(() => window.EVENTS) }, null, 1))

async function frameAt(t, options = { type: "png" }) {
	await page.evaluate((time) => window.render(time), t)
	return page.screenshot(options)
}

if (args.stills) {
	for (const t of args.stills.split(",").map(Number)) {
		await writeFile(resolve(outDir, `still-${t.toFixed(2)}.png`), await frameAt(t))
	}
	await browser.close()
	process.exit(0)
}

const fps = Number(args.fps ?? 60)
const from = Number(args.from ?? 0)
const to = Number(args.to ?? duration)
const out = resolve(outDir, args.out ?? "showreel-silent.mp4")
const ffmpeg = spawn(
	"ffmpeg",
	["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
	{ stdio: ["pipe", "inherit", "inherit"] },
)
const total = Math.round((to - from) * fps)
const started = Date.now()
for (let frame = 0; frame < total; frame++) {
	const buffer = await frameAt(from + frame / fps, { type: "jpeg", quality: 92 })
	if (!ffmpeg.stdin.write(buffer)) await new Promise((done) => ffmpeg.stdin.once("drain", done))
	if (frame % fps === 0) console.log(`frame ${frame}/${total} · ${((Date.now() - started) / 1000).toFixed(0)}s`)
}
ffmpeg.stdin.end()
await new Promise((done) => ffmpeg.on("close", done))
await browser.close()
console.log(`Wrote ${out}`)
