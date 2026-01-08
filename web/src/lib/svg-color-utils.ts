/**
 * Shared utilities for SVG color manipulation and processing
 */

export const MAX_EXTRACTED_COLORS = 5
export const DEFAULT_VIEWBOX = "0 0 24 24"

export type ColorMapping = {
	[key: string]: string
}

/**
 * CSS named colors mapping to hex values
 * Includes all standard CSS named colors
 */
const CSS_NAMED_COLORS: Record<string, string> = {
	aliceblue: "#f0f8ff",
	antiquewhite: "#faebd7",
	aqua: "#00ffff",
	aquamarine: "#7fffd4",
	azure: "#f0ffff",
	beige: "#f5f5dc",
	bisque: "#ffe4c4",
	black: "#000000",
	blanchedalmond: "#ffebcd",
	blue: "#0000ff",
	blueviolet: "#8a2be2",
	brown: "#a52a2a",
	burlywood: "#deb887",
	cadetblue: "#5f9ea0",
	chartreuse: "#7fff00",
	chocolate: "#d2691e",
	coral: "#ff7f50",
	cornflowerblue: "#6495ed",
	cornsilk: "#fff8dc",
	crimson: "#dc143c",
	cyan: "#00ffff",
	darkblue: "#00008b",
	darkcyan: "#008b8b",
	darkgoldenrod: "#b8860b",
	darkgray: "#a9a9a9",
	darkgreen: "#006400",
	darkgrey: "#a9a9a9",
	darkkhaki: "#bdb76b",
	darkmagenta: "#8b008b",
	darkolivegreen: "#556b2f",
	darkorange: "#ff8c00",
	darkorchid: "#9932cc",
	darkred: "#8b0000",
	darksalmon: "#e9967a",
	darkseagreen: "#8fbc8f",
	darkslateblue: "#483d8b",
	darkslategray: "#2f4f4f",
	darkslategrey: "#2f4f4f",
	darkturquoise: "#00ced1",
	darkviolet: "#9400d3",
	deeppink: "#ff1493",
	deepskyblue: "#00bfff",
	dimgray: "#696969",
	dimgrey: "#696969",
	dodgerblue: "#1e90ff",
	firebrick: "#b22222",
	floralwhite: "#fffaf0",
	forestgreen: "#228b22",
	fuchsia: "#ff00ff",
	gainsboro: "#dcdcdc",
	ghostwhite: "#f8f8ff",
	gold: "#ffd700",
	goldenrod: "#daa520",
	gray: "#808080",
	green: "#008000",
	greenyellow: "#adff2f",
	grey: "#808080",
	honeydew: "#f0fff0",
	hotpink: "#ff69b4",
	indianred: "#cd5c5c",
	indigo: "#4b0082",
	ivory: "#fffff0",
	khaki: "#f0e68c",
	lavender: "#e6e6fa",
	lavenderblush: "#fff0f5",
	lawngreen: "#7cfc00",
	lemonchiffon: "#fffacd",
	lightblue: "#add8e6",
	lightcoral: "#f08080",
	lightcyan: "#e0ffff",
	lightgoldenrodyellow: "#fafad2",
	lightgray: "#d3d3d3",
	lightgreen: "#90ee90",
	lightgrey: "#d3d3d3",
	lightpink: "#ffb6c1",
	lightsalmon: "#ffa07a",
	lightseagreen: "#20b2aa",
	lightskyblue: "#87cefa",
	lightslategray: "#778899",
	lightslategrey: "#778899",
	lightsteelblue: "#b0c4de",
	lightyellow: "#ffffe0",
	lime: "#00ff00",
	limegreen: "#32cd32",
	linen: "#faf0e6",
	magenta: "#ff00ff",
	maroon: "#800000",
	mediumaquamarine: "#66cdaa",
	mediumblue: "#0000cd",
	mediumorchid: "#ba55d3",
	mediumpurple: "#9370db",
	mediumseagreen: "#3cb371",
	mediumslateblue: "#7b68ee",
	mediumspringgreen: "#00fa9a",
	mediumturquoise: "#48d1cc",
	mediumvioletred: "#c71585",
	midnightblue: "#191970",
	mintcream: "#f5fffa",
	mistyrose: "#ffe4e1",
	moccasin: "#ffe4b5",
	navajowhite: "#ffdead",
	navy: "#000080",
	oldlace: "#fdf5e6",
	olive: "#808000",
	olivedrab: "#6b8e23",
	orange: "#ffa500",
	orangered: "#ff4500",
	orchid: "#da70d6",
	palegoldenrod: "#eee8aa",
	palegreen: "#98fb98",
	paleturquoise: "#afeeee",
	palevioletred: "#db7093",
	papayawhip: "#ffefd5",
	peachpuff: "#ffdab9",
	peru: "#cd853f",
	pink: "#ffc0cb",
	plum: "#dda0dd",
	powderblue: "#b0e0e6",
	purple: "#800080",
	rebeccapurple: "#663399",
	red: "#ff0000",
	rosybrown: "#bc8f8f",
	royalblue: "#4169e1",
	saddlebrown: "#8b4513",
	salmon: "#fa8072",
	sandybrown: "#f4a460",
	seagreen: "#2e8b57",
	seashell: "#fff5ee",
	sienna: "#a0522d",
	silver: "#c0c0c0",
	skyblue: "#87ceeb",
	slateblue: "#6a5acd",
	slategray: "#708090",
	slategrey: "#708090",
	snow: "#fffafa",
	springgreen: "#00ff7f",
	steelblue: "#4682b4",
	tan: "#d2b48c",
	teal: "#008080",
	thistle: "#d8bfd8",
	tomato: "#ff6347",
	turquoise: "#40e0d0",
	violet: "#ee82ee",
	wheat: "#f5deb3",
	white: "#ffffff",
	whitesmoke: "#f5f5f5",
	yellow: "#ffff00",
	yellowgreen: "#9acd32",
}

/**
 * Normalizes a color string to a standard hex format
 * Handles hex, rgb, rgba, CSS named colors, and special values (none, transparent, currentColor)
 */
export function normalizeColor(color: string): string {
	if (!color || color === "none" || color === "transparent" || color === "currentColor") {
		return ""
	}

	const trimmed = color.trim().toLowerCase()

	// Handle hex colors
	if (trimmed.startsWith("#")) {
		// Expand short hex (#abc -> #aabbcc)
		if (trimmed.length === 4) {
			return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
		}
		// Validate full hex
		if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
			return trimmed
		}
		return ""
	}

	// Handle rgb/rgba colors
	if (trimmed.startsWith("rgb")) {
		const match = trimmed.match(/\d+/g)
		if (match && match.length >= 3) {
			const r = Math.max(0, Math.min(255, parseInt(match[0], 10)))
			const g = Math.max(0, Math.min(255, parseInt(match[1], 10)))
			const b = Math.max(0, Math.min(255, parseInt(match[2], 10)))
			return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
		}
	}

	// Handle CSS named colors
	if (CSS_NAMED_COLORS[trimmed]) {
		return CSS_NAMED_COLORS[trimmed]
	}

	// Fallback: try to use browser's built-in color parsing
	// This handles any valid CSS color that the browser recognizes
	if (typeof document !== "undefined") {
		try {
			const tempElement = document.createElement("div")
			tempElement.style.color = trimmed
			const computedColor = tempElement.style.color
			if (computedColor && computedColor !== trimmed) {
				// Browser recognized the color, now convert it
				tempElement.style.color = ""
				tempElement.style.color = trimmed
				const rgbMatch = window.getComputedStyle(tempElement).color.match(/\d+/g)
				if (rgbMatch && rgbMatch.length >= 3) {
					const r = parseInt(rgbMatch[0], 10)
					const g = parseInt(rgbMatch[1], 10)
					const b = parseInt(rgbMatch[2], 10)
					return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
				}
			}
		} catch {
			// Fallback failed, return empty string
		}
	}

	return ""
}

/**
 * Converts hex color to HSL string
 */
export function hexToHsl(hex: string): string {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	if (!result) return "hsl(0, 0%, 0%)"

	const r = parseInt(result[1], 16) / 255
	const g = parseInt(result[2], 16) / 255
	const b = parseInt(result[3], 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0)
				break
			case g:
				h = (b - r) / d + 2
				break
			case b:
				h = (r - g) / d + 4
				break
		}
		h /= 6
	}

	const hDeg = Math.round(h * 360)
	const sPercent = Math.round(s * 100)
	const lPercent = Math.round(l * 100)

	return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`
}

/**
 * Converts HSL string to hex color
 */
export function hslToHex(hsl: string): string {
	let match = hsl.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/i)
	if (!match) {
		match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/)
	}
	if (!match) return "#000000"

	const h = parseFloat(match[1]) / 360
	const s = parseFloat(match[2]) / 100
	const l = parseFloat(match[3]) / 100

	const a = s * Math.min(l, 1 - l)
	const f = (n: number) => {
		const k = (n + h * 12) % 12
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, "0")
	}

	return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Converts hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null
}

/**
 * Converts RGB values to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (value: number) => Math.max(0, Math.min(255, value))
	return `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")}`
}

/**
 * Extracts unique fill colors from an SVG string
 * Returns up to MAX_EXTRACTED_COLORS normalized hex colors
 */
export function extractColorsFromSvg(svg: string): string[] {
	const colors = new Set<string>()

	if (!svg || typeof svg !== "string") {
		return []
	}

	try {
		const parser = new DOMParser()
		const svgDoc = parser.parseFromString(svg, "image/svg+xml")
		const svgElement = svgDoc.documentElement

		// Check for parsing errors
		const parserError = svgDoc.querySelector("parsererror")
		if (parserError || !svgElement) {
			console.warn("Failed to parse SVG document")
			return []
		}

		// Extract fill colors from element attributes and inline styles
		const extractFill = (element: Element) => {
			// Extract from fill attribute
			const fill = element.getAttribute("fill")
			if (fill) {
				const normalized = normalizeColor(fill)
				if (normalized) {
					colors.add(normalized)
				}
			}

			// Extract from stroke attribute
			const stroke = element.getAttribute("stroke")
			if (stroke) {
				const normalized = normalizeColor(stroke)
				if (normalized) {
					colors.add(normalized)
				}
			}

			// Extract from inline style attribute (e.g., style="fill:#2396ed")
			const styleAttr = element.getAttribute("style")
			if (styleAttr) {
				// Match fill and stroke in inline styles
				const fillColorRegex = /fill\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)/gi
				const strokeColorRegex = /stroke\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)/gi

				const fillMatches = styleAttr.matchAll(fillColorRegex)
				for (const match of fillMatches) {
					const color = match[1]
					if (color) {
						const normalized = normalizeColor(color)
						if (normalized) {
							colors.add(normalized)
						}
					}
				}

				const strokeMatches = styleAttr.matchAll(strokeColorRegex)
				for (const match of strokeMatches) {
					const color = match[1]
					if (color) {
						const normalized = normalizeColor(color)
						if (normalized) {
							colors.add(normalized)
						}
					}
				}
			}

			// Recursively process children
			for (let i = 0; i < element.children.length; i++) {
				extractFill(element.children[i])
			}
		}

		extractFill(svgElement)

		// Extract colors from style tags
		const styleTags = svgElement.getElementsByTagName("style")
		for (let i = 0; i < styleTags.length; i++) {
			const styleContent = styleTags[i].textContent || ""
			// Updated regex to also match CSS named colors (word characters)
			const fillColorRegex = /fill\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)/gi
			const matches = styleContent.matchAll(fillColorRegex)
			for (const match of matches) {
				const color = match[1]
				if (color) {
					const normalized = normalizeColor(color)
					if (normalized) {
						colors.add(normalized)
					}
				}
			}
		}

		return Array.from(colors).slice(0, MAX_EXTRACTED_COLORS)
	} catch (error) {
		console.error("Error extracting colors from SVG:", error)
		return []
	}
}

/**
 * Applies color mappings to an SVG string
 * Replaces fill colors in both attributes and style tags
 */
export function applyColorMappingsToSvg(svg: string, mappings: ColorMapping): string {
	if (!svg || typeof svg !== "string") {
		return svg
	}

	if (!mappings || Object.keys(mappings).length === 0) {
		return svg
	}

	try {
		const parser = new DOMParser()
		const svgDoc = parser.parseFromString(svg, "image/svg+xml")
		const svgElement = svgDoc.documentElement

		if (!svgElement) {
			return svg
		}

		// Check for parsing errors
		const parserError = svgDoc.querySelector("parsererror")
		if (parserError) {
			console.warn("Failed to parse SVG for color mapping")
			return svg
		}

		// Apply mappings to element fill and stroke attributes, including inline styles
		const applyMappings = (element: Element) => {
			// Handle fill attribute
			const fill = element.getAttribute("fill")
			if (fill) {
				const normalized = normalizeColor(fill)
				if (normalized) {
					// Case-insensitive matching
					const matchingKey = Object.keys(mappings).find((key) => key.toLowerCase() === normalized.toLowerCase())
					if (matchingKey && mappings[matchingKey]) {
						element.setAttribute("fill", mappings[matchingKey])
					}
				}
			}

			// Handle stroke attribute
			const stroke = element.getAttribute("stroke")
			if (stroke) {
				const normalized = normalizeColor(stroke)
				if (normalized) {
					// Case-insensitive matching
					const matchingKey = Object.keys(mappings).find((key) => key.toLowerCase() === normalized.toLowerCase())
					if (matchingKey && mappings[matchingKey]) {
						element.setAttribute("stroke", mappings[matchingKey])
					}
				}
			}

			// Handle inline style attribute (e.g., style="fill:#2396ed")
			const styleAttr = element.getAttribute("style")
			if (styleAttr) {
				let updatedStyle = styleAttr

				Object.keys(mappings).forEach((originalColorKey) => {
					const newColor = mappings[originalColorKey]
					if (originalColorKey.toLowerCase() !== newColor.toLowerCase() && newColor) {
						// Escape special regex characters
						const escapedColor = originalColorKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
						// Case-insensitive replacement for both fill and stroke in inline styles
						const fillRegex = new RegExp(`fill\\s*:\\s*${escapedColor}`, "gi")
						const strokeRegex = new RegExp(`stroke\\s*:\\s*${escapedColor}`, "gi")
						updatedStyle = updatedStyle.replace(fillRegex, `fill:${newColor}`)
						updatedStyle = updatedStyle.replace(strokeRegex, `stroke:${newColor}`)
					}
				})

				if (updatedStyle !== styleAttr) {
					element.setAttribute("style", updatedStyle)
				}
			}

			// Recursively process children
			for (let i = 0; i < element.children.length; i++) {
				applyMappings(element.children[i])
			}
		}

		applyMappings(svgElement)

		// Apply mappings to style tags
		const styleTags = svgElement.getElementsByTagName("style")
		for (let i = 0; i < styleTags.length; i++) {
			const styleElement = styleTags[i]
			let styleContent = styleElement.textContent || ""

			Object.keys(mappings).forEach((originalColorKey) => {
				const newColor = mappings[originalColorKey]
				if (originalColorKey.toLowerCase() !== newColor.toLowerCase() && newColor) {
					// Escape special regex characters
					const escapedColor = originalColorKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
					// Case-insensitive replacement for both fill and stroke
					const fillRegex = new RegExp(`fill\\s*:\\s*${escapedColor}`, "gi")
					const strokeRegex = new RegExp(`stroke\\s*:\\s*${escapedColor}`, "gi")
					styleContent = styleContent.replace(fillRegex, `fill:${newColor}`)
					styleContent = styleContent.replace(strokeRegex, `stroke:${newColor}`)
				}
			})

			styleElement.textContent = styleContent
		}

		const serializer = new XMLSerializer()
		return serializer.serializeToString(svgElement)
	} catch (error) {
		console.error("Error applying color mappings to SVG:", error)
		return svg
	}
}

/**
 * Ensures SVG has required attributes (viewBox, width, height)
 * Forces width/height to 100% for proper scaling within containers
 * Returns the processed SVG string
 */
export function ensureSvgAttributes(svg: string, viewBox: string = DEFAULT_VIEWBOX): string {
	if (!svg || typeof svg !== "string") {
		return svg
	}

	try {
		const parser = new DOMParser()
		const svgDoc = parser.parseFromString(svg, "image/svg+xml")
		const svgElement = svgDoc.documentElement

		if (!svgElement) {
			return svg
		}

		// If no viewBox exists, try to create one from width/height attributes
		if (!svgElement.getAttribute("viewBox")) {
			const width = svgElement.getAttribute("width")
			const height = svgElement.getAttribute("height")

			if (width && height) {
				const numWidth = parseFloat(width)
				const numHeight = parseFloat(height)
				if (!isNaN(numWidth) && !isNaN(numHeight)) {
					svgElement.setAttribute("viewBox", `0 0 ${numWidth} ${numHeight}`)
				}
			} else {
				svgElement.setAttribute("viewBox", viewBox)
			}
		}

		// Always set width and height to 100% for proper scaling
		svgElement.setAttribute("width", "100%")
		svgElement.setAttribute("height", "100%")

		const serializer = new XMLSerializer()
		return serializer.serializeToString(svgElement)
	} catch (error) {
		console.error("Error ensuring SVG attributes:", error)
		return svg
	}
}

/**
 * Validates if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
	return typeof navigator !== "undefined" && navigator.clipboard !== undefined && navigator.clipboard.writeText !== undefined
}
