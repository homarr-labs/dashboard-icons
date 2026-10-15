import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomBytes, randomUUID } from "node:crypto"
import { once } from "node:events"
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..")

test("PocketBase replay consumption is authenticated, atomic, durable and fail-closed", async () => {
	const directory = await mkdtemp(join(tmpdir(), "mcp-replay-"))
	const hooks = join(directory, "hooks")
	const migrations = join(directory, "migrations")
	const data = join(directory, "data")
	await mkdir(hooks)
	await mkdir(migrations)
	await copyFile(join(web, "backend/pb_hooks/mcp_oauth_replay.pb.js"), join(hooks, "mcp_oauth_replay.pb.js"))
	await copyFile(join(web, "backend/pb_migrations/1792000000_mcp_oauth_replay.js"), join(migrations, "1792000000_mcp_oauth_replay.js"))
	const socket = createServer()
	socket.listen(0, "127.0.0.1")
	await once(socket, "listening")
	const address = socket.address()
	assert(address && typeof address !== "string")
	const port = address.port
	await new Promise((resolve) => socket.close(resolve))
	const origin = `http://127.0.0.1:${port}`
	const secret = randomBytes(48).toString("hex")
	let child
	async function stop() {
		if (!child || child.exitCode !== null) return
		const exited = once(child, "exit")
		child.kill("SIGTERM")
		await exited
	}
	async function start(key = secret) {
		child = spawn(join(web, "backend/pocketbase"), ["serve", `--http=127.0.0.1:${port}`, `--dir=${data}`, `--hooksDir=${hooks}`, `--migrationsDir=${migrations}`], {
			env: { ...process.env, MCP_OAUTH_REPLAY_SECRET: key }, stdio: "ignore",
		})
		for (let attempt = 0; attempt < 100; attempt++) {
			assert.equal(child.exitCode, null, "PocketBase exited before readiness")
			try {
				if ((await fetch(`${origin}/api/health`)).ok) return
			} catch {}
			await new Promise((resolve) => setTimeout(resolve, 50))
		}
		throw new Error("PocketBase did not start")
	}
	async function request(body, key = secret) {
		return fetch(`${origin}/api/dashboard/mcp-oauth-replay`, {
			method: "POST", headers: { "Content-Type": "application/json", "X-MCP-Replay-Key": key }, body: JSON.stringify(body),
		})
	}
	try {
		await start()
		assert.equal((await request({ purpose: "probe" }, "")).status, 401)
		assert.equal((await request({ purpose: "probe" }, "wrong")).status, 401)
		assert.deepEqual(await (await request({ purpose: "probe" })).json(), { ready: true })
		const expiry = Math.floor(Date.now() / 1000) + 3600
		const claims = ["code", "refresh"].map((purpose) => ({ purpose, id: randomUUID(), expiry }))
		for (const claim of claims) {
			const responses = await Promise.all(Array.from({ length: 16 }, () => request(claim)))
			assert.equal(responses.filter((response) => response.status === 200).length, 1)
			assert.equal(responses.filter((response) => response.status === 409).length, 15)
		}
		await stop()
		await start()
		for (const claim of claims) assert.equal((await request(claim)).status, 409)
		assert.equal((await request({ ...claims[0], id: "fresh", expiry: 1 })).status, 400)
		assert.equal((await request({ ...claims[0], id: "fresh", expiry: expiry + 2592060 })).status, 400)
		assert.equal((await request({ ...claims[0], purpose: "access" })).status, 400)
		assert.equal((await request({ ...claims[0], id: "x".repeat(2000) })).status, 413)
		await stop()
		await start("")
		assert.equal((await request({ purpose: "probe" })).status, 503)
		assert.equal((await request({ ...claims[0], id: "new" })).status, 503)
		await stop()
		const db = new DatabaseSync(join(data, "data.db"))
		assert.equal(db.prepare("SELECT count(*) AS total FROM mcp_oauth_replay").get().total, 2)
		db.exec("DROP TABLE mcp_oauth_replay")
		db.close()
		await start()
		assert.equal((await request({ purpose: "probe" })).status, 503)
		assert.equal((await request({ ...claims[0], id: "new" })).status, 503)
	} finally {
		await stop()
		await rm(directory, { recursive: true, force: true })
	}
})
