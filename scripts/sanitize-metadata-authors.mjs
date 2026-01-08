import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const METADATA_PATH = path.resolve(ROOT_DIR, "metadata.json");

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");

const raw = await readFile(METADATA_PATH, "utf8");
const metadata = JSON.parse(raw);

let changed = 0;

for (const key of Object.keys(metadata)) {
	const author = metadata?.[key]?.update?.author;
	if (!author || typeof author !== "object") continue;

	// Internal/community authors use PocketBase IDs (string). Remove `login` to avoid leaking emails.
	if (typeof author.id === "string" && "login" in author) {
		delete author.login;
		changed++;
	}
}

if (!shouldWrite) {
	console.log(`[sanitize-metadata-authors] Would update ${changed} entries. Re-run with --write to apply.`);
	process.exit(0);
}

await writeFile(METADATA_PATH, `${JSON.stringify(metadata, null, 4)}\n`, "utf8");
console.log(`[sanitize-metadata-authors] Updated ${changed} entries in metadata.json`);

