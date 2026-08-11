import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
	applyColorMappingsToSvg,
	ensureSvgAttributes,
	extractColorsFromSvg,
	hexToHsl,
	hslToHex,
	MAX_SVG_SIZE,
	normalizeColor,
} from "@/lib/svg-color-utils"

// ── User-provided SVGs that must work ──────────────────────────────

const SVG_GROQ = `<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Groq</title><path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"></path></svg>`

const SVG_PLANNING_CENTER = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 512 512"><linearGradient id="planning-center-groups_svg__a" x1="194.609" x2="1236.828" y1="184.391" y2="-857.828" gradientTransform="matrix(.4 0 0 -.4 -29.4 122.2)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#ff962d"/><stop offset="1" style="stop-color:#fc7638"/></linearGradient><path d="M512 256c0 204.8-51.2 256-256 256S0 460.8 0 256 51.2 0 256 0s256 51.2 256 256" style="fill:url(#planning-center-groups_svg__a)"/><path d="M343.6 381.2c26-5.3 42.8-30.7 37.4-56.7-3.2-15.5-13.7-28.4-28.3-34.6v-67.7c24.4-10.3 35.9-38.4 25.6-62.9-10.3-24.4-38.4-35.9-62.9-25.6-11.5 4.9-20.7 14-25.6 25.5H222c-10.4-24.4-38.6-35.7-63-25.3s-35.7 38.6-25.3 63c4.9 11.4 13.9 20.5 25.3 25.3v67.7c-24.4 10.4-35.7 38.6-25.3 63s38.6 35.7 63 25.3c11.4-4.9 20.5-13.9 25.3-25.3h67.7c9 21 31.5 32.8 53.9 28.3M222.1 196.7h67.8c4.9 11.5 14 20.6 25.5 25.5V290a48.56 48.56 0 0 0-25.6 25.6h-67.7a48.56 48.56 0 0 0-25.6-25.6v-67.7a48.56 48.56 0 0 0 25.6-25.6" style="fill-rule:evenodd;clip-rule:evenodd;fill:#fff"/></svg>`

const SVG_GROK = `<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Grok</title><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"></path></svg>`

const SVG_ANTGROUP = `<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 73 24" xmlns="http://www.w3.org/2000/svg"><title>AntGroup</title><path d="M9.617 6.282a.447.447 0 01-.33-.315 1.037 1.037 0 010-.505c.153-.86.294-1.725.492-2.577.138-.7.413-1.367.808-1.96a2.274 2.274 0 011.238-.89c.86-.217 1.217.629.92 1.348-.254.593-.861.914-1.31 1.348-.819.795-1.075 2.14-1.311 3.212a.428.428 0 01-.507.339z" fill="url(#lobe-icons-ant-group-brand-0-_R_0_)" transform="translate(2)"></path><path d="M48.394 10.7c.31.52 1.15 1.559 3.045 1.924l.16-.834a3.86 3.86 0 01-2.152-1.09h2.178v-.828h-3.664v-.428h3.387v-.79h-3.243V8.29h3.01V7.52h-2.998v-.419h3.01v-.769h-3.01v-.418h3.243v-.79h-3.125c.188-.117.349-.273.472-.457.097-.155.15-.25.153-.259l-.775-.424c-.09.159-.188.313-.295.46a1.412 1.412 0 01-1.365.683h-.976c.168-.224.323-.457.466-.698l-.776-.425a10.18 10.18 0 01-2.193 2.572l.566.68c.147-.125.295-.25.419-.374v1.734c0 .57.268.84.834.84h2.311v.427h-3.664v.829h2.178a3.86 3.86 0 01-2.152 1.09l.16.834c1.895-.365 2.735-1.402 3.045-1.924h.433v2.01h.885v-2.01l.433-.012z"></path><defs><linearGradient id="lobe-icons-ant-group-brand-0-_R_0_" x1="32.052%" x2="60.95%" y1="95.551%" y2="-.348%"><stop offset="0%" stop-color="#06F"></stop><stop offset="20%" stop-color="#1677FF"></stop><stop offset="100%" stop-color="#04A6FF"></stop></linearGradient></defs></svg>`

// ── normalizeColor ────────────────────────────────────────────────

describe("normalizeColor", () => {
	it("normalizes 6-digit hex", () => {
		expect(normalizeColor("#ff0000")).toBe("#ff0000")
		expect(normalizeColor("#2396ED")).toBe("#2396ed")
	})

	it("expands 3-digit hex", () => {
		expect(normalizeColor("#fff")).toBe("#ffffff")
		expect(normalizeColor("#abc")).toBe("#aabbcc")
	})

	it("converts rgb()", () => {
		expect(normalizeColor("rgb(255, 0, 0)")).toBe("#ff0000")
		expect(normalizeColor("rgb(0,128,255)")).toBe("#0080ff")
	})

	it("converts named colors", () => {
		expect(normalizeColor("white")).toBe("#ffffff")
		expect(normalizeColor("red")).toBe("#ff0000")
		expect(normalizeColor("blue")).toBe("#0000ff")
	})

	it("returns empty for none/transparent", () => {
		expect(normalizeColor("none")).toBe("")
		expect(normalizeColor("transparent")).toBe("")
	})

	it("handles currentColor as a special editable value", () => {
		const result = normalizeColor("currentColor")
		expect(result).not.toBe("")
	})

	it("returns empty for url() references", () => {
		expect(normalizeColor("url(#gradient-id)")).toBe("")
	})

	it("returns empty for empty/null input", () => {
		expect(normalizeColor("")).toBe("")
	})
})

// ── hexToHsl / hslToHex roundtrip ─────────────────────────────────

describe("hexToHsl / hslToHex", () => {
	it("roundtrips red", () => {
		const hsl = hexToHsl("#ff0000")
		expect(hsl).toContain("hsl(0")
		const hex = hslToHex(hsl)
		expect(hex).toBe("#ff0000")
	})

	it("roundtrips blue", () => {
		const hsl = hexToHsl("#0000ff")
		const hex = hslToHex(hsl)
		expect(hex).toBe("#0000ff")
	})

	it("handles black", () => {
		const hsl = hexToHsl("#000000")
		expect(hsl).toContain("0%")
	})

	it("handles white", () => {
		const hsl = hexToHsl("#ffffff")
		expect(hsl).toContain("100%")
	})
})

// ── extractColorsFromSvg ──────────────────────────────────────────

describe("extractColorsFromSvg", () => {
	it("extracts fill attribute colors", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#ff0000"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#ff0000")
	})

	it("does not add implicit black when a shape inherits the root fill", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="#F58025"><path d="M0 0h24v24H0z"/></svg>`
		expect(extractColorsFromSvg(svg)).toEqual(["#f58025"])
	})

	it("extracts stroke attribute colors", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect stroke="#00ff00"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#00ff00")
	})

	it("extracts inline style fill colors", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:#2396ed"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#2396ed")
	})

	it("extracts colors from style tags", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>.cls{fill:#abcdef}</style><rect class="cls"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#abcdef")
	})

	it("extracts currentColor from fill attribute", () => {
		const colors = extractColorsFromSvg(SVG_GROQ)
		expect(colors.length).toBeGreaterThan(0)
	})

	it("extracts currentColor from Grok SVG", () => {
		const colors = extractColorsFromSvg(SVG_GROK)
		expect(colors.length).toBeGreaterThan(0)
	})

	it("extracts gradient stop-color from Planning Center SVG", () => {
		const colors = extractColorsFromSvg(SVG_PLANNING_CENTER)
		expect(colors.length).toBeGreaterThanOrEqual(2)
		expect(colors).toContain("#ff962d")
		expect(colors).toContain("#ffffff")
	})

	it("extracts stop-color attribute from gradient stops", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#ff0000"/><stop stop-color="#00ff00"/></linearGradient></defs><rect fill="url(#g)"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#ff0000")
		expect(colors).toContain("#00ff00")
	})

	it("extracts stop-color from inline style on stop elements", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop style="stop-color:#aabbcc"/></linearGradient></defs></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#aabbcc")
	})

	it("extracts colors from AntGroup SVG with gradients and currentColor", () => {
		const colors = extractColorsFromSvg(SVG_ANTGROUP)
		expect(colors.length).toBeGreaterThan(0)
	})

	it("does not crash on empty input", () => {
		expect(extractColorsFromSvg("")).toEqual([])
		expect(extractColorsFromSvg(null as unknown as string)).toEqual([])
	})

	it("extracts fill from style with fill-rule prefix (no false match)", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path style="fill-rule:evenodd;clip-rule:evenodd;fill:#1b1f23"/></svg>`
		const colors = extractColorsFromSvg(svg)
		expect(colors).toContain("#1b1f23")
		expect(colors).not.toContain("#evenodd")
	})
})

// ── applyColorMappingsToSvg ───────────────────────────────────────

describe("applyColorMappingsToSvg", () => {
	it("replaces fill attribute color", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#ff0000"/></svg>`
		const result = applyColorMappingsToSvg(svg, { "#ff0000": "#00ff00" })
		expect(result).toContain("#00ff00")
		expect(result).not.toContain("#ff0000")
	})

	it("replaces stroke attribute color", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect stroke="#ff0000"/></svg>`
		const result = applyColorMappingsToSvg(svg, { "#ff0000": "#0000ff" })
		expect(result).toContain("#0000ff")
	})

	it("replaces inline style fill color", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:#2396ed"/></svg>`
		const result = applyColorMappingsToSvg(svg, { "#2396ed": "#ff0000" })
		expect(result).toContain("#ff0000")
	})

	it("replaces stop-color attribute on gradient stops", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#ff0000"/></linearGradient></defs></svg>`
		const result = applyColorMappingsToSvg(svg, { "#ff0000": "#00ff00" })
		expect(result).toContain("#00ff00")
	})

	it("replaces stop-color in inline style on gradient stops", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop style="stop-color:#aabbcc"/></linearGradient></defs></svg>`
		const result = applyColorMappingsToSvg(svg, { "#aabbcc": "#112233" })
		expect(result).toContain("#112233")
	})

	it("replaces currentColor fill with mapped color", () => {
		const result = applyColorMappingsToSvg(SVG_GROQ, { currentColor: "#ff5500" })
		expect(result).toContain("#ff5500")
		expect(result).not.toContain("currentColor")
	})

	it("handles no mappings gracefully", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#ff0000"/></svg>`
		const result = applyColorMappingsToSvg(svg, {})
		expect(result).toBe(svg)
	})

	it("handles null/empty SVG", () => {
		expect(applyColorMappingsToSvg("", { "#ff0000": "#00ff00" })).toBe("")
		expect(applyColorMappingsToSvg(null as unknown as string, {})).toBe(null)
	})
})

// ── ensureSvgAttributes ───────────────────────────────────────────

describe("ensureSvgAttributes", () => {
	it("sets width and height to 100%", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect/></svg>`
		const result = ensureSvgAttributes(svg)
		expect(result).toContain('width="100%"')
		expect(result).toContain('height="100%"')
	})

	it("preserves existing viewBox", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect/></svg>`
		const result = ensureSvgAttributes(svg)
		expect(result).toContain("0 0 512 512")
	})

	it("creates viewBox from width/height when missing", () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect/></svg>`
		const result = ensureSvgAttributes(svg)
		expect(result).toContain("0 0 48 48")
	})
})

// ── Full roundtrip: extract → map → apply ─────────────────────────

describe("full roundtrip", () => {
	it("Groq SVG: extract colors, remap, apply", () => {
		const colors = extractColorsFromSvg(SVG_GROQ)
		expect(colors.length).toBeGreaterThan(0)

		const mappings: Record<string, string> = {}
		for (const c of colors) {
			mappings[c] = "#abcdef"
		}
		const result = applyColorMappingsToSvg(SVG_GROQ, mappings)
		expect(result).toContain("#abcdef")
	})

	it("Planning Center SVG: extract gradient + fill colors, remap, apply", () => {
		const colors = extractColorsFromSvg(SVG_PLANNING_CENTER)
		expect(colors.length).toBeGreaterThanOrEqual(2)

		const mappings: Record<string, string> = {}
		for (const c of colors) {
			mappings[c] = "#111111"
		}
		const result = applyColorMappingsToSvg(SVG_PLANNING_CENTER, mappings)
		expect(result).toContain("#111111")
	})

	it("AntGroup SVG: extract and remap", () => {
		const colors = extractColorsFromSvg(SVG_ANTGROUP)
		expect(colors.length).toBeGreaterThan(0)

		const mappings: Record<string, string> = {}
		for (const c of colors) {
			mappings[c] = "#222222"
		}
		const result = applyColorMappingsToSvg(SVG_ANTGROUP, mappings)
		expect(result).toBeTruthy()
	})
})

// ── Bulk test: first 100 real SVG icons ───────────────────────────

describe("bulk: last 200 SVG icons from repository", () => {
	const svgDir = join(__dirname, "../../../../svg")
	let svgFiles: string[] = []

	svgFiles = readdirSync(svgDir)
		.filter((f) => f.endsWith(".svg"))
		.slice(-200)

	if (svgFiles.length === 0) {
		it.skip("SVG directory not found — skipping bulk tests", () => {})
		return
	}

	for (const file of svgFiles) {
		const content = readFileSync(join(svgDir, file), "utf-8")
		const isUntestable =
			content.length > MAX_SVG_SIZE || content.includes("data:image") || content.includes("data:img/png") || !content.includes("<svg")

		it(`${file}: extractColorsFromSvg does not throw`, () => {
			const colors = extractColorsFromSvg(content)
			expect(Array.isArray(colors)).toBe(true)
		})

		it(`${file}: applyColorMappingsToSvg produces valid output`, () => {
			if (isUntestable) return
			const colors = extractColorsFromSvg(content)
			if (colors.length === 0) return

			const mappings: Record<string, string> = {}
			for (const c of colors) {
				mappings[c] = "#abcdef"
			}
			const result = applyColorMappingsToSvg(content, mappings)
			expect(result).toBeTruthy()
			expect(result).toContain("<svg")
		})

		it(`${file}: extracts at least one color (or is non-vector)`, () => {
			if (isUntestable) return

			const colors = extractColorsFromSvg(content)
			if (colors.length === 0) {
				console.warn(`[NO COLORS] ${file}:\n${content.slice(0, 500)}`)
			}
			expect(colors.length).toBeGreaterThan(0)
		})

		it(`${file}: roundtrip extract→remap→apply produces valid SVG`, () => {
			if (isUntestable) return
			const colors = extractColorsFromSvg(content)
			if (colors.length === 0) return

			const mappings: Record<string, string> = {}
			for (const c of colors) {
				mappings[c] = "#facade"
			}
			const result = applyColorMappingsToSvg(content, mappings)
			expect(result).toContain("<svg")
			expect(result).toContain("#facade")

			const ensured = ensureSvgAttributes(result)
			expect(ensured).toContain('width="100%"')
		})
	}
})
