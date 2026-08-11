import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES } from "@/constants"
import { getExternalIconPreviewUrl, resolveExternalIconUrl } from "@/lib/external-icon-urls"
import type { ExternalIcon } from "@/types/icons"

const repoRoot = path.resolve(process.cwd(), "..")

describe("Simple Icons external source registration", () => {
	it("registers the official source, credit, license, logo, and CDN", () => {
		const source = (EXTERNAL_SOURCES as Record<string, (typeof EXTERNAL_SOURCES)[keyof typeof EXTERNAL_SOURCES]>).simpleicons

		expect(EXTERNAL_SOURCE_IDS).toContain("simpleicons")
		expect(source).toMatchObject({
			id: "simpleicons",
			label: "Simple Icons",
			website: "https://simpleicons.org/",
			authorName: "Simple Icons",
			authorLogin: "simple-icons",
			authorUrl: "https://github.com/simple-icons/simple-icons",
			license: "CC0-1.0",
			pbFilter: "simpleicons",
		})
		expect(source.icon).toMatch(/^https:\/\/cdn\.simpleicons\.org\/simpleicons\//)
		expect(source.cdnBase).toBe("https://cdn.simpleicons.org")
	})

	it("resolves official adaptive and static SVGs plus local rasterized PNG variants", () => {
		const icon = {
			source: "simpleicons",
			slug: "github",
			brand_color: "181717",
			url_templates: {
				svg: "https://cdn.simpleicons.org/{slug}/{hex}",
				svg_auto: "https://cdn.simpleicons.org/{slug}/000000/FFFFFF",
				svg_light: "https://cdn.simpleicons.org/{slug}/000000",
				svg_dark: "https://cdn.simpleicons.org/{slug}/FFFFFF",
				png: "/api/icons/external/simpleicons/{slug}/brand.png",
				png_light: "/api/icons/external/simpleicons/{slug}/light.png",
				png_dark: "/api/icons/external/simpleicons/{slug}/dark.png",
			},
		} as unknown as ExternalIcon

		expect(resolveExternalIconUrl(icon, "svg")).toBe("https://cdn.simpleicons.org/github/181717")
		expect(resolveExternalIconUrl(icon, "svg_light")).toBe("https://cdn.simpleicons.org/github/000000")
		expect(resolveExternalIconUrl(icon, "svg_dark")).toBe("https://cdn.simpleicons.org/github/FFFFFF")
		expect(getExternalIconPreviewUrl(icon)).toBe("https://cdn.simpleicons.org/github/000000/FFFFFF")
		expect(resolveExternalIconUrl(icon, "png")).toBe("/api/icons/external/simpleicons/github/brand.png")
		expect(resolveExternalIconUrl(icon, "png_light")).toBe("/api/icons/external/simpleicons/github/light.png")
		expect(resolveExternalIconUrl(icon, "png_dark")).toBe("/api/icons/external/simpleicons/github/dark.png")
	})

	it("resolves the same URLs for compact browse records without stored templates", () => {
		const icon = {
			source: "simpleicons",
			slug: "github",
			brand_color: "181717",
			url_templates: {},
		} as unknown as ExternalIcon

		expect(resolveExternalIconUrl(icon, "svg")).toBe("https://cdn.simpleicons.org/github/181717")
		expect(getExternalIconPreviewUrl(icon)).toBe("https://cdn.simpleicons.org/github/000000/FFFFFF")
		expect(resolveExternalIconUrl(icon, "svg_light")).toBe("https://cdn.simpleicons.org/github/000000")
		expect(resolveExternalIconUrl(icon, "svg_dark")).toBe("https://cdn.simpleicons.org/github/FFFFFF")
	})

	it("does not invent an adaptive selfh.st URL", () => {
		const icon = {
			source: "selfhst",
			slug: "2fauth",
			formats: ["svg"],
			url_templates: {},
		} as unknown as ExternalIcon

		expect(getExternalIconPreviewUrl(icon)).toBe("https://cdn.jsdelivr.net/gh/selfhst/icons/svg/2fauth.svg")
	})
})

describe("Simple Icons persistence and scheduled sync", () => {
	it("allows Simple Icons in the PocketBase external_icons source field", () => {
		const migrationDir = path.join(repoRoot, "web/backend/pb_migrations")
		const migrations = fs
			.readdirSync(migrationDir)
			.filter((file) => file.endsWith(".js"))
			.map((file) => fs.readFileSync(path.join(migrationDir, file), "utf8"))
			.join("\n")

		expect(migrations).toMatch(/sourceField\.values\s*=\s*\[[\s\S]*?["']simpleicons["']/)
		expect(migrations).toContain("findRecordsByFilter(collection, \"source = 'simpleicons'\"")
	})

	it("runs a manual and weekly authenticated Simple Icons sync", () => {
		const workflowPath = path.join(repoRoot, ".github/workflows/sync-simple-icons.yml")
		expect(fs.existsSync(workflowPath)).toBe(true)

		const workflow = fs.readFileSync(workflowPath, "utf8")
		expect(workflow).toContain("workflow_dispatch:")
		// A fixed weekday (rather than `*`) makes this weekly, not daily.
		expect(workflow).toMatch(/cron:\s*["']\d+\s+\d+\s+\*\s+\*\s+[0-6]["']/)
		expect(workflow).toContain("bun run scripts/import-simple-icons.ts")
		expect(workflow).toMatch(/PB_ADMIN:\s*\$\{\{ secrets\.PB_ADMIN \}\}/)
		expect(workflow).toMatch(/PB_ADMIN_PASS:\s*\$\{\{ secrets\.PB_ADMIN_PASS \}\}/)
	})

	it("allows newly synchronized external slugs to render without a redeploy", () => {
		const route = fs.readFileSync(path.join(repoRoot, "web/src/app/icons/external/[slug]/page.tsx"), "utf8")
		const externalIcons = fs.readFileSync(path.join(repoRoot, "web/src/lib/external-icons.ts"), "utf8")

		expect(route).toContain("export const dynamicParams = true")
		expect(route).toContain("export const revalidate = 900")
		expect(externalIcons).toContain('pb.filter("source = {:source} && slug = {:slug}"')
	})
})
