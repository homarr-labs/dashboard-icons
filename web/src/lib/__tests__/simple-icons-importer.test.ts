import { describe, expect, it } from "vitest"
import { buildSimpleIconRecords } from "../../../scripts/import-simple-icons"

const upstreamIcons = [
	{
		title: "GitHub",
		slug: "github",
		hex: "181717",
		source: "https://github.com/logos",
		guidelines: "https://github.com/logos",
		license: { type: "CC BY 4.0", url: "https://github.com/logos" },
		aliases: {
			aka: ["GitHub, Inc."],
			dup: ["githubactions"],
			loc: { "zh-CN": "GitHub" },
		},
	},
	{
		title: "Home Assistant",
		slug: "homeassistant",
		hex: "18BCF2",
		source: "https://www.home-assistant.io/",
		aliases: { aka: ["HASS"] },
	},
]

describe("buildSimpleIconRecords", () => {
	it("maps metadata plus brand, theme-aware, light, and dark SVG and PNG variants", () => {
		const records = buildSimpleIconRecords(upstreamIcons, new Set<string>())

		expect(records).toHaveLength(upstreamIcons.length)
		expect(records[0]).toMatchObject({
			source: "simpleicons",
			slug: "github",
			name: "GitHub",
			aliases: expect.arrayContaining(["GitHub, Inc.", "githubactions"]),
			formats: ["svg", "png"],
			variants: { light: true, dark: true },
			brand_color: "181717",
			license: "CC BY 4.0",
			attribution: "GitHub icon by Simple Icons (CC BY 4.0). Brand marks remain subject to their owners' terms.",
			source_url: "https://github.com/logos",
			guidelines_url: "https://github.com/logos",
			url_templates: {
				svg: "https://cdn.simpleicons.org/{slug}/{hex}",
				svg_auto: "https://cdn.simpleicons.org/{slug}/000000/FFFFFF",
				svg_light: "https://cdn.simpleicons.org/{slug}/000000",
				svg_dark: "https://cdn.simpleicons.org/{slug}/FFFFFF",
				png: "/api/icons/external/simpleicons/{slug}/brand.png",
				png_light: "/api/icons/external/simpleicons/{slug}/light.png",
				png_dark: "/api/icons/external/simpleicons/{slug}/dark.png",
			},
			upstream_data: expect.objectContaining({ import_schema_version: 2 }),
		})
	})

	it("skips every slug already provided natively without dropping other upstream icons", () => {
		const records = buildSimpleIconRecords(upstreamIcons, new Set(["homeassistant"]))

		expect(records.map((record) => record.slug)).toEqual(["github"])
	})

	it("deduplicates aliases deterministically and never emits the title or slug as aliases", () => {
		const records = buildSimpleIconRecords(
			[
				{
					...upstreamIcons[0],
					aliases: { aka: ["GitHub", "github", "GitHub, Inc.", "GitHub, Inc."], dup: ["githubactions", "githubactions"] },
				},
			],
			new Set<string>(),
		)

		expect(records[0]?.aliases).toEqual(["GitHub, Inc.", "githubactions"])
	})

	it("uses per-icon license metadata without treating the collection license as an icon license", () => {
		const records = buildSimpleIconRecords(upstreamIcons, new Set<string>())

		expect(records[0]?.license).toBe("CC BY 4.0")
		expect(records[1]?.license).toBe("")
		expect(records[1]?.license_url).toBe("")
		expect(records[1]?.attribution).toBe("Home Assistant icon via Simple Icons. Brand marks remain subject to their owners' terms.")
	})

	it("does not link an icon-specific license to the collection's different license text", () => {
		const [record] = buildSimpleIconRecords([{ ...upstreamIcons[1], license: { type: "Apache-2.0" } }], new Set<string>())

		expect(record?.license).toBe("Apache-2.0")
		expect(record?.license_url).toBe("")
		expect(record?.attribution).toContain("(Apache-2.0)")
	})
})
