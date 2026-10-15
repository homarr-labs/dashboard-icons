import { describe, expect, it } from "vitest"
import { checkSubmittedSvg, MAX_SUBMITTED_SVG_BYTES } from "@/lib/icons/svg-safety"

const NS = 'xmlns="http://www.w3.org/2000/svg"'

function svg(inner: string, attributes = ""): string {
	return `<svg ${NS}${attributes} viewBox="0 0 24 24">${inner}</svg>`
}

function reasonFor(input: string): string | undefined {
	const result = checkSubmittedSvg(input)
	if (result.ok) return undefined
	return result.reason
}

describe("checkSubmittedSvg", () => {
	it("accepts plain icons, trimmed, with prolog, comments and local references", () => {
		const icon = `<?xml version="1.0"?>\n<!-- logo -->\n${svg(
			'<defs><linearGradient id="g"/></defs><use xlink:href="#shape"/><rect fill="url(#g)" style="fill: url( \'#g\' )"/>',
			' xmlns:xlink="http://www.w3.org/1999/xlink"',
		)}\n<!-- end -->`
		expect(checkSubmittedSvg(`\n ${icon} \n`)).toEqual({ ok: true, svg: icon })
	})

	it("rejects anything that is not one complete SVG document", () => {
		for (const input of [
			"",
			"hello",
			"<svgx></svgx>",
			`${svg("")}<script/>`,
			'<html><svg xmlns="http://www.w3.org/2000/svg"></svg></html>',
		]) {
			expect(reasonFor(input), input).toContain("one complete SVG document")
		}
	})

	it("requires the SVG namespace on the root element", () => {
		expect(reasonFor('<svg viewBox="0 0 1 1"><g xmlns="http://www.w3.org/2000/svg"/></svg>')).toContain("xmlns")
	})

	it("enforces the size limit in bytes", () => {
		const multibyte = svg(`<title>${"é".repeat(MAX_SUBMITTED_SVG_BYTES / 2)}</title>`)
		expect(multibyte.length).toBeLessThan(MAX_SUBMITTED_SVG_BYTES + 200)
		expect(reasonFor(multibyte)).toBe("the SVG is larger than 48 KB")
	})

	it("rejects active content", () => {
		const cases: [string, string][] = [
			['<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/></svg>', "one complete SVG document"],
			[svg('<!ENTITY x "y">'), "DOCTYPE"],
			[svg("<script>alert(1)</script>"), "<script>"],
			[svg("<foreignObject><div/></foreignObject>"), "<foreignObject>"],
			[svg('<iframe src="x"/>'), "embedded documents"],
			[svg("<embed/>"), "embedded documents"],
			[svg('<rect onclick="alert(1)"/>'), "event handler"],
			[svg('<rect/onclick="alert(1)"/>'), "event handler"],
			[svg('<set attributeName="xlink:href" to="#a"/>'), "animating href"],
			[svg("<style>@import 'x.css';</style>"), "@import"],
			[svg('<a href="java\nscript:alert(1)"><rect/></a>'), "script URLs"],
			[svg('<rect style="background: vbscript:x"/>'), "script URLs"],
			[svg('<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script>'), "namespaced elements"],
			[svg('<animate attributeName="onclick" to="alert(1)"/>'), "SVG animations"],
			[svg('<set attributeName="fill" to="url(https://evil.example/x)"/>'), "SVG animations"],
			[svg(String.raw`<style>@\69mport 'https://evil.example/x.css';</style>`), "CSS escapes"],
			[svg('<path style="fill:&#117;rl(https://evil.example/x)"/>'), "encoded or undeclared entities"],
			[svg('<g xmlns="http://www.w3.org/1999/xhtml"><a/></g>'), "only SVG and XLink namespaces"],
		]
		for (const [input, reason] of cases) expect(reasonFor(input), input).toContain(reason)
	})

	it("rejects external and encoded references", () => {
		expect(reasonFor(svg('<image href="https://evil.example/x.png"/>'))).toBe(
			"external references and embedded images are not allowed (https://evil.example/x.png); use local #ids only",
		)
		expect(reasonFor(svg("<rect style=\"fill: url('//evil.example/a.svg#x')\"/>"))).toContain("(//evil.example/a.svg#x)")
		expect(reasonFor(svg('<use xlink:href="&#104;ttp://x"/>'))).toContain("encoded or undeclared entities")
		expect(reasonFor(svg('<image link:href="https://evil.example/x.png"/>'))).toContain("external references")
		expect(reasonFor(svg('<image href="data:image/svg+xml;base64,PHN2Zz4="/>'))).toContain("external references")
		expect(reasonFor(svg('<a href=""><rect/></a>'))).toContain("(empty)")
	})

	it.each(["png", "jpeg", "jpg", "gif", "webp", "bmp", "avif"])("rejects embedded %s raster images", (format) => {
		for (const reference of [`<image href="data:image/${format};base64,AAAA"/>`, `<rect fill="url(data:image/${format};base64,AAAA)"/>`]) {
			expect(reasonFor(svg(reference))).toContain("embedded images are not allowed")
		}
	})
})
