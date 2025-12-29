#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";

import path from "node:path";

type IconColors = { light?: string; dark?: string };
type IconWordmark = { light?: string; dark?: string };

interface PBUser {
	id: string;
	username?: string;
	email?: string;
}

interface SubmissionExtras {
	aliases?: string[];
	categories?: string[];
	base?: string;
	colors?: IconColors;
	wordmark?: IconWordmark;
}

interface Submission {
	id: string;
	name: string;
	assets: string[];
	created_by: string;
	status: string;
	extras?: SubmissionExtras;
	approved_by?: string;
	description?: string;
	admin_comment?: string;
	expand?: {
		created_by?: PBUser;
		approved_by?: PBUser;
	};
}

interface Args {
	submissionId: string;
	dryRun: boolean;
	ghaOutputPath?: string;
}

interface MetadataAuthor {
	id: string | number;
	name?: string;
	login?: string;
}

interface MetadataEntry {
	base: string;
	aliases: string[];
	categories: string[];
	update: {
		timestamp: string;
		author: MetadataAuthor;
	};
	colors?: IconColors;
	wordmark?: IconWordmark;
}

type VariantKey =
	| "base"
	| "light"
	| "dark"
	| "wordmark-light"
	| "wordmark-dark";

interface VariantTarget {
	key: VariantKey;
	destFilename: string;
	matchers: string[]; // lowercase substrings to prefer when selecting assets
	sourceAsset?: string; // chosen source asset name
}

const PB_URL = process.env.PB_URL;
const PB_ADMIN_TOKEN = process.env.PB_ADMIN_TOKEN;
const ROOT_DIR = process.cwd();
const METADATA_PATH = path.resolve(ROOT_DIR, "metadata.json");

/**
 * Get the destination directory based on file extension
 * SVG files go to svg/, PNG files go to png/, WEBP files go to webp/
 */
function getExtensionDir(filename: string): string {
	const ext = path.extname(filename).replace(".", "").toLowerCase();
	switch (ext) {
		case "svg":
			return path.resolve(ROOT_DIR, "svg");
		case "png":
			return path.resolve(ROOT_DIR, "png");
		case "webp":
			return path.resolve(ROOT_DIR, "webp");
		default:
			// Fallback to svg for unknown extensions
			console.warn(`[import-icon] Unknown extension "${ext}", defaulting to svg/`);
			return path.resolve(ROOT_DIR, "svg");
	}
}

function parseArgs(argv: string[]): Args {
	let submissionId: string | undefined;
	let dryRun = false;
	let ghaOutputPath: string | undefined = process.env.GITHUB_OUTPUT;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--submission-id" && argv[i + 1]) {
			submissionId = argv[i + 1];
			i++;
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--gha-output" && argv[i + 1]) {
			ghaOutputPath = argv[i + 1];
			i++;
		}
	}

	if (!submissionId) {
		throw new Error("Missing required --submission-id");
	}

	return { submissionId, dryRun, ghaOutputPath };
}

function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value.replace(/\/+$/, "");
}

async function fetchSubmission(pbUrl: string, id: string): Promise<Submission> {
	const url = `${pbUrl}/api/collections/submissions/records/${id}?expand=created_by,approved_by`;
	console.log(`[import-icon] Fetching submission from ${url}`);
	const res = await fetch(url, {
		headers: { Authorization: PB_ADMIN_TOKEN ?? "" },
	});

	if (!res.ok) {
		const body = await res.text();
		console.error(
			`[import-icon] fetch submission failed: status=${res.status} body=${body}`,
		);
		throw new Error(`Failed to fetch submission ${id}: ${res.status} ${body}`);
	}

	return (await res.json()) as Submission;
}

async function ensureDir(dir: string) {
	await mkdir(dir, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
	return await Bun.file(filePath).exists();
}

function inferBase(assets: string[], extrasBase?: string) {
	if (extrasBase) return extrasBase;
	const first = assets[0];
	const ext = path.extname(first).replace(".", "").toLowerCase();
	return ext || "svg";
}

function buildTargets(submission: Submission): VariantTarget[] {
	const iconId = submission.name;
	const ext = inferBase(submission.assets, submission.extras?.base);
	const assetsLower = submission.assets.map((a) => a.toLowerCase());
	const hasLight =
		submission.extras?.colors?.light ||
		assetsLower.some((a) => a.includes("light") && !a.includes("wordmark"));
	const hasDark =
		submission.extras?.colors?.dark ||
		assetsLower.some((a) => a.includes("dark") && !a.includes("wordmark"));
	const hasWordmark =
		submission.extras?.wordmark ||
		assetsLower.some((a) => a.includes("wordmark"));
	const hasWordmarkLight =
		submission.extras?.wordmark?.light ||
		assetsLower.some((a) => a.includes("wordmark") && a.includes("light"));
	const hasWordmarkDark =
		submission.extras?.wordmark?.dark ||
		assetsLower.some((a) => a.includes("wordmark") && a.includes("dark"));

	const targets: VariantTarget[] = [
		{ key: "base", destFilename: `${iconId}.${ext}`, matchers: [] },
	];

	if (hasLight) {
		targets.push({
			key: "light",
			destFilename: `${iconId}-light.${ext}`,
			matchers: ["light"],
		});
	}

	if (hasDark) {
		targets.push({
			key: "dark",
			destFilename: `${iconId}-dark.${ext}`,
			matchers: ["dark"],
		});
	}

	if (hasWordmark || hasWordmarkLight || hasWordmarkDark) {
		if (hasWordmarkLight || hasWordmark) {
			targets.push({
				key: "wordmark-light",
				destFilename: `${iconId}-wordmark-light.${ext}`,
				matchers: ["wordmark", "light"],
			});
		}

		if (hasWordmarkDark || hasWordmark) {
			targets.push({
				key: "wordmark-dark",
				destFilename: `${iconId}-wordmark-dark.${ext}`,
				matchers: ["wordmark", "dark"],
			});
		}
	}

	return targets;
}

function assignAssetsToTargets(
	assets: string[],
	targets: VariantTarget[],
): VariantTarget[] {
	const remaining = new Set(assets);

	const takeMatching = (matchers: string[]): string | undefined => {
		for (const asset of remaining) {
			const lower = asset.toLowerCase();
			const allMatch = matchers.every((m) => lower.includes(m));
			if (allMatch) {
				remaining.delete(asset);
				return asset;
			}
		}
		return undefined;
	};

	const takeAny = (): string | undefined => {
		const first = remaining.values().next().value as string | undefined;
		if (first) remaining.delete(first);
		return first;
	};

	return targets.map((t) => {
		const matched = t.matchers.length ? takeMatching(t.matchers) : takeAny();
		const fallback = matched ?? takeAny();
		return { ...t, sourceAsset: fallback };
	});
}

async function downloadAsset(
	pbUrl: string,
	submissionId: string,
	filename: string,
	destPath: string,
) {
	const url = `${pbUrl}/api/files/submissions/${submissionId}/${encodeURIComponent(filename)}`;
	const res = await fetch(url, {
		headers: { Authorization: PB_ADMIN_TOKEN ?? "" },
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(
			`Failed to download asset ${filename}: ${res.status} ${body}`,
		);
	}

	const buffer = await res.arrayBuffer();
	await Bun.write(destPath, buffer);
}

async function readMetadata(): Promise<Record<string, MetadataEntry>> {
	const file = Bun.file(METADATA_PATH);
	if (!(await file.exists())) {
		return {};
	}
	const raw = await file.text();
	return JSON.parse(raw) as Record<string, MetadataEntry>;
}

async function writeMetadata(data: Record<string, MetadataEntry>) {
	const json = `${JSON.stringify(data, null, 4)}\n`;
	await Bun.write(METADATA_PATH, json);
}

function buildAuthor(submission: Submission): MetadataAuthor {
	const creator = submission.expand?.created_by;
	if (!creator) {
		return { id: submission.created_by };
	}

	return {
		id: creator.id,
		...(creator.username ? { name: creator.username } : {}),
		...(creator.email ? { login: creator.email } : {}),
	};
}

function buildMetadataVariants(assignments: VariantTarget[]) {
	const colors: IconColors = {};
	const wordmark: IconWordmark = {};

	for (const v of assignments) {
		const baseName = v.destFilename.replace(/\.[^.]+$/, "");
		if (v.key === "light") {
			colors.light = baseName;
		} else if (v.key === "dark") {
			colors.dark = baseName;
		} else if (v.key === "wordmark-light") {
			wordmark.light = baseName;
		} else if (v.key === "wordmark-dark") {
			wordmark.dark = baseName;
		}
	}

	return {
		colors: Object.keys(colors).length ? colors : undefined,
		wordmark: Object.keys(wordmark).length ? wordmark : undefined,
	};
}

async function upsertMetadata(
	submission: Submission,
	assignments: VariantTarget[],
	dryRun: boolean,
) {
	const iconId = submission.name;
	const base = inferBase(submission.assets, submission.extras?.base);
	const aliases = submission.extras?.aliases ?? [];
	const categories = submission.extras?.categories ?? [];
	const { colors, wordmark } = buildMetadataVariants(assignments);
	const author = buildAuthor(submission);

	console.log(
		`[import-icon] Upserting metadata for "${iconId}" base=${base} aliases=${aliases.length} categories=${categories.length}`,
	);

	const data = await readMetadata();
	const nextEntry: MetadataEntry = {
		base,
		aliases,
		categories,
		update: {
			timestamp: new Date().toISOString(),
			author,
		},
		...(colors ? { colors } : {}),
		...(wordmark ? { wordmark } : {}),
	};

	data[iconId] = nextEntry;

	if (dryRun) {
		console.log(`[dry-run] Would upsert metadata for icon "${iconId}"`);
		return;
	}

	await writeMetadata(data);
	console.log(`Updated metadata for icon "${iconId}"`);
}

async function persistAssets(
	pbUrl: string,
	submission: Submission,
	dryRun: boolean,
) {
	if (submission.assets.length === 0) {
		throw new Error("Submission has no assets to import");
	}

	const targets = buildTargets(submission);
	const assignments = assignAssetsToTargets(submission.assets, targets);

	for (const target of assignments) {
		if (!target.sourceAsset) {
			console.warn(
				`[import-icon] No asset available for variant ${target.key}; skipping`,
			);
			continue;
		}

		// Determine destination directory based on file extension
		const destDir = getExtensionDir(target.destFilename);
		const destPath = path.join(destDir, target.destFilename);
		console.log(
			`[import-icon] Handling asset ${target.sourceAsset} -> ${destPath} (variant ${target.key})`,
		);
		const exists = await fileExists(destPath);
		if (exists) {
			console.log(`Skipping existing asset ${destPath}`);
			continue;
		}

		if (dryRun) {
			console.log(
				`[dry-run] Would download ${target.sourceAsset} -> ${destPath}`,
			);
			continue;
		}

		await ensureDir(destDir);
		await downloadAsset(pbUrl, submission.id, target.sourceAsset, destPath);
		console.log(`Downloaded ${target.sourceAsset} -> ${destPath}`);
	}

	return assignments;
}

async function markSubmissionAdded(
	pbUrl: string,
	submissionId: string,
	dryRun: boolean,
) {
	if (dryRun) {
		console.log(
			`[dry-run] Would mark submission ${submissionId} as added_to_collection`,
		);
		return;
	}

	const res = await fetch(
		`${pbUrl}/api/collections/submissions/records/${submissionId}`,
		{
			method: "PATCH",
			headers: {
				Authorization: PB_ADMIN_TOKEN ?? "",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "added_to_collection" }),
		},
	);

	if (!res.ok) {
		const body = await res.text();
		console.error(
			`[import-icon] status update failed: status=${res.status} body=${body}`,
		);
		throw new Error(
			`Failed to update submission status: ${res.status} ${body}`,
		);
	}

	console.log(`Marked submission ${submissionId} as added_to_collection`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const pbUrl = requireEnv("PB_URL", PB_URL);
	requireEnv("PB_ADMIN_TOKEN", PB_ADMIN_TOKEN);

	console.log(
		`[import-icon] Starting import submissionId=${args.submissionId} dryRun=${args.dryRun} rootDir=${ROOT_DIR} metadata=${METADATA_PATH}`,
	);

	console.log(`Fetching submission ${args.submissionId}...`);
	const submission = await fetchSubmission(pbUrl, args.submissionId);

	const approver =
		submission.expand?.approved_by?.username ||
		submission.expand?.approved_by?.email ||
		submission.approved_by ||
		"unknown";

	const assignments = await persistAssets(pbUrl, submission, args.dryRun);
	await upsertMetadata(submission, assignments, args.dryRun);
	await markSubmissionAdded(pbUrl, args.submissionId, args.dryRun);

	if (args.ghaOutputPath) {
		const lines = [
			`submission_name=${submission.name}`,
			`approver=${approver}`,
		].join("\n");
		await Bun.write(args.ghaOutputPath, new TextEncoder().encode(`${lines}\n`));
	}

	console.log("Import completed.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
